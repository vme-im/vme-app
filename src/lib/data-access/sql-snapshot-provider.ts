// SQL 快照数据提供者：拉 vme-content/data/snapshot.sql + sql.js 内存 SQLite 装载 + 索引查询。
// 兑现 architecture §5「无正文索引 + 正文按需」的查询形态：API 暴露 SQL 查询粒度，
// 调用方按需取，所有过滤维度（author/tag/type/search）走索引。
//
// 2026-05-20 Neon + JSON 双双退役后，本 provider 是唯一读模型；
// summary 不再有 summary.json 兜底，全部从 SQL 现算。
//
// 降级语义：fetch 失败回退上次 good model；无 model 时回退空 db，不整站 500。
import { readFileSync } from 'node:fs'
import path from 'node:path'
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import { IKfcItem, Summary, Contributor } from '@/types'
import { DataProvider, GetItemsParams, PaginatedItems, TopTag } from './types'

const DEFAULT_BASE =
  process.env.SNAPSHOT_BASE_URL || 'https://raw.githubusercontent.com/vme-im/vme-content/main'

const MODEL_TTL_MS = 5 * 60 * 1000
const FETCH_TIMEOUT_MS = 15000

function getAvatarUrl(u: string): string {
  return `https://github.com/${u}.png`
}
function getUserUrl(u: string): string {
  return `https://github.com/${u}`
}

interface ItemRow {
  id: string
  title: string
  body: string
  author: string
  created_at: number
  reactions: number
  type: 'text' | 'meme'
  url: string
}

interface Model {
  db: Database
}

let sqlJsInstance: SqlJsStatic | null = null

async function getSqlJs(): Promise<SqlJsStatic> {
  if (sqlJsInstance) return sqlJsInstance
  const wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
  const buf = readFileSync(wasmPath)
  const wasmBinary = buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength,
  ) as ArrayBuffer
  sqlJsInstance = await initSqlJs({ wasmBinary })
  return sqlJsInstance
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal })
    if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(t)
  }
}

function rowToItem(r: ItemRow, tags: string[]): IKfcItem {
  return {
    id: r.id,
    title: r.title,
    // r.url 由 snapshot.sql 写入（generateSnapshotSql 把 fetchIssues 返回的 issue url 透传）；
    // 旧路径用 id（node_id）拼 `vme-content/issues/${id}` 是错的——跨仓时尤其错（如 archive-rin0chan）
    url: r.url || `https://github.com/vme-im/vme-content/issues/${r.id}`,
    body: r.body,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.created_at).toISOString(),
    author: {
      username: r.author,
      avatarUrl: getAvatarUrl(r.author),
      url: getUserUrl(r.author),
    },
    reactions: { totalCount: r.reactions },
    tags,
  }
}

function toContributor(c: { username: string; count: number }): Contributor {
  return {
    username: c.username,
    count: c.count,
    avatarUrl: getAvatarUrl(c.username),
    url: getUserUrl(c.username),
  }
}

// 查询 db 拿到一组 item id 对应的 tags（一次查、内存分组）
function queryTagsForIds(db: Database, ids: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>()
  if (ids.length === 0) return map
  // IN (?, ?, ...) 动态参数数量
  const placeholders = ids.map(() => '?').join(',')
  const stmt = db.prepare(
    `SELECT item_id, tag FROM item_tags WHERE item_id IN (${placeholders}) ORDER BY item_id, tag`,
  )
  stmt.bind(ids)
  while (stmt.step()) {
    const row = stmt.getAsObject() as { item_id: string; tag: string }
    const arr = map.get(row.item_id) || []
    arr.push(row.tag)
    map.set(row.item_id, arr)
  }
  stmt.free()
  return map
}

function readItemRows(db: Database, sql: string, params: unknown[]): ItemRow[] {
  const stmt = db.prepare(sql)
  if (params.length) stmt.bind(params as never)
  const rows: ItemRow[] = []
  while (stmt.step()) rows.push(stmt.getAsObject() as unknown as ItemRow)
  stmt.free()
  return rows
}

function readScalar<T = number>(db: Database, sql: string, params: unknown[] = []): T {
  const stmt = db.prepare(sql)
  if (params.length) stmt.bind(params as never)
  stmt.step()
  const v = stmt.get()[0] as T
  stmt.free()
  return v
}

export class SqlSnapshotProvider implements DataProvider {
  private base: string
  private cache: { model: Model; ts: number } | null = null
  private inflight: Promise<Model> | null = null

  constructor(baseUrl: string = DEFAULT_BASE) {
    this.base = baseUrl.replace(/\/$/, '')
  }

  private async loadModel(): Promise<Model> {
    const SQL = await getSqlJs()
    const sqlText = await fetchText(`${this.base}/data/snapshot.sql`)
    const db = new SQL.Database()
    db.exec(sqlText)
    return { db }
  }

  private async getModel(): Promise<Model> {
    const now = Date.now()
    if (this.cache && now - this.cache.ts < MODEL_TTL_MS) {
      return this.cache.model
    }
    if (this.inflight) return this.inflight
    this.inflight = (async () => {
      try {
        const model = await this.loadModel()
        // 旧 db 主动关闭释放
        if (this.cache) this.cache.model.db.close()
        this.cache = { model, ts: Date.now() }
        return model
      } catch (e) {
        console.error('SqlSnapshotProvider: load failed', e)
        if (this.cache) return this.cache.model
        // 没有任何缓存：返回一个空 db，避免整站 500
        const SQL = await getSqlJs()
        const emptyDb = new SQL.Database()
        emptyDb.exec(
          "CREATE TABLE items (id TEXT PRIMARY KEY, title TEXT, body TEXT, author TEXT, created_at INTEGER, reactions INTEGER, type TEXT, tag_hash TEXT DEFAULT '', url TEXT DEFAULT '');" +
            'CREATE TABLE item_tags (item_id TEXT, tag TEXT);',
        )
        return { db: emptyDb }
      } finally {
        this.inflight = null
      }
    })()
    return this.inflight
  }

  async getItems(params: GetItemsParams): Promise<PaginatedItems> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      order = 'desc',
      author,
      type,
      tag,
      search,
    } = params
    const { db } = await this.getModel()

    const wheres: string[] = []
    const bindParams: unknown[] = []
    const fromClause = tag ? 'items i JOIN item_tags t ON i.id = t.item_id' : 'items i'
    if (tag) {
      wheres.push('t.tag = ?')
      bindParams.push(tag)
    }
    if (author) {
      wheres.push('i.author = ?')
      bindParams.push(author)
    }
    if (type) {
      wheres.push('i.type = ?')
      bindParams.push(type)
    }
    if (search) {
      wheres.push('(LOWER(i.title) LIKE ? OR LOWER(i.body) LIKE ?)')
      const q = `%${search.toLowerCase()}%`
      bindParams.push(q, q)
    }
    const whereSql = wheres.length ? `WHERE ${wheres.join(' AND ')}` : ''

    const orderField = sortBy === 'reactions' || sortBy === 'hot' ? 'i.reactions' : 'i.created_at'
    const direction = (order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC'
    const offset = Math.max(0, (page - 1) * limit)

    const total = readScalar<number>(
      db,
      `SELECT COUNT(*) FROM ${fromClause} ${whereSql}`,
      bindParams,
    )

    const rowsSql = `SELECT i.id, i.title, i.body, i.author, i.created_at, i.reactions, i.type, i.url FROM ${fromClause} ${whereSql} ORDER BY ${orderField} ${direction}, i.created_at DESC LIMIT ? OFFSET ?`
    const rows = readItemRows(db, rowsSql, [...bindParams, limit, offset])
    const tagsMap = queryTagsForIds(
      db,
      rows.map((r) => r.id),
    )
    const items = rows.map((r) => rowToItem(r, tagsMap.get(r.id) ?? []))
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async getRandomItem(type?: 'text' | 'meme'): Promise<IKfcItem | null> {
    const { db } = await this.getModel()
    const sql = type
      ? 'SELECT id, title, body, author, created_at, reactions, type, url FROM items WHERE type = ? ORDER BY RANDOM() LIMIT 1'
      : 'SELECT id, title, body, author, created_at, reactions, type, url FROM items ORDER BY RANDOM() LIMIT 1'
    const rows = readItemRows(db, sql, type ? [type] : [])
    if (rows.length === 0) return null
    const tagsMap = queryTagsForIds(db, [rows[0].id])
    return rowToItem(rows[0], tagsMap.get(rows[0].id) ?? [])
  }

  async getItemById(id: string): Promise<IKfcItem | null> {
    const { db } = await this.getModel()
    const rows = readItemRows(
      db,
      'SELECT id, title, body, author, created_at, reactions, type, url FROM items WHERE id = ?',
      [id],
    )
    if (rows.length === 0) return null
    const tagsMap = queryTagsForIds(db, [id])
    return rowToItem(rows[0], tagsMap.get(id) ?? [])
  }

  async getStats(): Promise<Summary> {
    const { db } = await this.getModel()
    const totalItems = readScalar<number>(db, 'SELECT COUNT(*) FROM items')
    const contributors = await this.getContributors()
    // 月份分组：created_at 已是 UTC epoch ms，按中国时区（UTC+8）切月，与 createData 行为一致
    const monthStmt = db.prepare(
      "SELECT strftime('%Y-%m', datetime((created_at + 8*3600000)/1000, 'unixepoch')) AS month, COUNT(*) AS c FROM items GROUP BY month ORDER BY month DESC",
    )
    const months: { month: string; count: number }[] = []
    while (monthStmt.step()) {
      const row = monthStmt.getAsObject() as { month: string; c: number }
      months.push({ month: row.month, count: row.c })
    }
    monthStmt.free()
    return {
      totalItems,
      totalContributors: contributors.length,
      months,
      contributors,
      topContributors: contributors.slice(0, 10),
      updatedAt: new Date().toISOString(),
    }
  }

  async getContributorsCount(): Promise<number> {
    const { db } = await this.getModel()
    return readScalar<number>(db, 'SELECT COUNT(DISTINCT author) FROM items')
  }

  async getTopTags(limit = 4): Promise<TopTag[]> {
    const { db } = await this.getModel()
    const stmt = db.prepare(
      'SELECT tag, COUNT(*) AS c FROM item_tags GROUP BY tag ORDER BY c DESC, tag ASC LIMIT ?',
    )
    stmt.bind([limit] as never)
    const out: TopTag[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject() as { tag: string; c: number }
      out.push({ tag: row.tag, count: row.c })
    }
    stmt.free()
    return out
  }

  async searchItems(query: string, limit = 50): Promise<IKfcItem[]> {
    const { db } = await this.getModel()
    const q = `%${query.toLowerCase()}%`
    const rows = readItemRows(
      db,
      'SELECT id, title, body, author, created_at, reactions, type, url FROM items WHERE LOWER(title) LIKE ? OR LOWER(body) LIKE ? ORDER BY created_at DESC LIMIT ?',
      [q, q, limit],
    )
    const tagsMap = queryTagsForIds(
      db,
      rows.map((r) => r.id),
    )
    return rows.map((r) => rowToItem(r, tagsMap.get(r.id) ?? []))
  }

  async getContributors(): Promise<Contributor[]> {
    const { db } = await this.getModel()
    const stmt = db.prepare(
      'SELECT author, COUNT(*) AS c FROM items GROUP BY author ORDER BY c DESC, author ASC',
    )
    const out: Contributor[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject() as { author: string; c: number }
      out.push(toContributor({ username: row.author, count: row.c }))
    }
    stmt.free()
    return out
  }

  async getTopContributors(limit = 10): Promise<Contributor[]> {
    return (await this.getContributors()).slice(0, limit)
  }

  async getFeaturedItems(limit = 3, excludeId?: string): Promise<IKfcItem[]> {
    const { db } = await this.getModel()
    // 每作者一条最佳 text 文案，全局按 reactions+createdAt 排序取 limit
    // 用窗口函数 ROW_NUMBER 找每作者最佳
    const sql = `
      WITH ranked AS (
        SELECT id, title, body, author, created_at, reactions, type, url,
          ROW_NUMBER() OVER (PARTITION BY author ORDER BY reactions DESC, created_at DESC) AS rn
        FROM items
        WHERE type = 'text' ${excludeId ? 'AND id <> ?' : ''}
      )
      SELECT id, title, body, author, created_at, reactions, type, url
      FROM ranked
      WHERE rn = 1
      ORDER BY reactions DESC, created_at DESC
      LIMIT ?
    `
    const params = excludeId ? [excludeId, limit] : [limit]
    const rows = readItemRows(db, sql, params)
    const tagsMap = queryTagsForIds(
      db,
      rows.map((r) => r.id),
    )
    return rows.map((r) => rowToItem(r, tagsMap.get(r.id) ?? []))
  }

  // 非接口方法：健康检查，用于自检 / fallback 触发
  async healthCheck(): Promise<boolean> {
    try {
      const { db } = await this.getModel()
      return readScalar<number>(db, 'SELECT COUNT(*) FROM items') > 0
    } catch {
      return false
    }
  }
}
