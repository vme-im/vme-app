// 快照数据提供者（Phase B 去库）
// 直接读 vme-content 已在 git 的快照（raw.githubusercontent，公开、零新依赖/secret），
// 内存建模 + TTL 缓存 + 拉取失败优雅降级（返回上次good/空，不整站 500）。
// 语义与 NeonProvider 对齐：作者头像/链接由 username 派生，日期归一 ISO，
// reactions={totalCount}，type 由正文是否含 markdown 图片现推（快照无 content_type 字段）。
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

// 与 createData/detectContentType 的回退一致：正文含 markdown 图片即 meme
function detectType(body: string): 'text' | 'meme' {
  return /!\[.*?\]\(.*?\)/.test(body || '') ? 'meme' : 'text'
}

interface RawItem {
  id: string
  title: string
  url: string
  body: string
  createdAt: string
  updatedAt: string
  author?: { username?: string }
  tags?: string[]
  reactionsCount?: number
}

interface SummaryFile {
  totalItems: number
  totalContributors: number
  months: { month: string; count: number }[]
  contributors: { username: string; count: number }[]
  topContributors?: { username: string; count: number }[]
  updatedAt: string
}

interface Record {
  item: IKfcItem
  username: string
  type: 'text' | 'meme'
  reactions: number
  createdMs: number
  haystack: string
}

interface Model {
  records: Record[]
  byId: Map<string, Record>
  summary: SummaryFile | null
}

function toItem(r: RawItem): IKfcItem {
  const username = r.author?.username || 'unknown'
  return {
    id: r.id,
    title: r.title,
    url: r.url,
    body: r.body,
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt || r.createdAt).toISOString(),
    author: {
      username,
      avatarUrl: getAvatarUrl(username),
      url: getUserUrl(username),
    },
    reactions: { totalCount: r.reactionsCount ?? 0 },
    tags: r.tags || [],
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

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal })
    if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(t)
  }
}

export class SnapshotProvider implements DataProvider {
  private base: string
  private cache: { model: Model; ts: number } | null = null
  private inflight: Promise<Model> | null = null

  constructor(baseUrl: string = DEFAULT_BASE) {
    this.base = baseUrl.replace(/\/$/, '')
  }

  private buildModel(rawItems: RawItem[], summary: SummaryFile | null): Model {
    const records: Record[] = []
    const byId = new Map<string, Record>()
    for (const r of rawItems) {
      if (!r || typeof r.id !== 'string') continue
      const rec: Record = {
        item: toItem(r),
        username: r.author?.username || 'unknown',
        type: detectType(r.body),
        reactions: r.reactionsCount ?? 0,
        createdMs: new Date(r.createdAt).getTime() || 0,
        haystack: `${r.title || ''}\n${r.body || ''}`.toLowerCase(),
      }
      records.push(rec)
      byId.set(rec.item.id, rec)
    }
    return { records, byId, summary }
  }

  private async loadModel(): Promise<Model> {
    const summary = await fetchJson<SummaryFile>(`${this.base}/data/summary.json`)
    const months = Array.isArray(summary.months) ? summary.months : []
    const monthArrays = await Promise.all(
      months.map((m) =>
        fetchJson<RawItem[]>(`${this.base}/data/${m.month}.json`).catch((e) => {
          console.warn('SnapshotProvider: month fetch failed', m.month, e)
          return [] as RawItem[]
        }),
      ),
    )
    const all = monthArrays.flat()
    return this.buildModel(all, summary)
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
        this.cache = { model, ts: Date.now() }
        return model
      } catch (e) {
        console.error('SnapshotProvider: load failed', e)
        if (this.cache) return this.cache.model // 服务陈旧好于整站 500
        return { records: [], byId: new Map(), summary: null }
      } finally {
        this.inflight = null
      }
    })()
    return this.inflight
  }

  private filter(records: Record[], p: GetItemsParams): Record[] {
    let out = records
    if (p.author) out = out.filter((r) => r.username === p.author)
    if (p.type) out = out.filter((r) => r.type === p.type)
    if (p.tag) out = out.filter((r) => (r.item.tags || []).includes(p.tag as string))
    if (p.search) {
      const q = p.search.toLowerCase()
      out = out.filter((r) => r.haystack.includes(q))
    }
    return out
  }

  private sort(records: Record[], sortBy?: string, order?: string): Record[] {
    const dir = (order || 'desc').toLowerCase() === 'asc' ? 1 : -1
    const byReactions = sortBy === 'reactions' || sortBy === 'hot'
    return [...records].sort((a, b) => {
      const av = byReactions ? a.reactions : a.createdMs
      const bv = byReactions ? b.reactions : b.createdMs
      if (av === bv) return (a.createdMs - b.createdMs) * dir
      return (av - bv) * dir
    })
  }

  async getItems(params: GetItemsParams): Promise<PaginatedItems> {
    const { page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = params
    const model = await this.getModel()
    const filtered = this.sort(this.filter(model.records, params), sortBy, order)
    const total = filtered.length
    const offset = (page - 1) * limit
    const items = filtered.slice(offset, offset + limit).map((r) => r.item)
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async getRandomItem(type?: 'text' | 'meme'): Promise<IKfcItem | null> {
    const model = await this.getModel()
    const pool = type ? model.records.filter((r) => r.type === type) : model.records
    if (pool.length === 0) return null
    return pool[Math.floor(Math.random() * pool.length)].item
  }

  async getItemById(id: string): Promise<IKfcItem | null> {
    const model = await this.getModel()
    return model.byId.get(id)?.item ?? null
  }

  async getStats(): Promise<Summary> {
    const model = await this.getModel()
    const s = model.summary
    if (s) {
      const contributors = (s.contributors || []).map(toContributor)
      return {
        totalItems: s.totalItems,
        totalContributors: s.totalContributors,
        months: s.months || [],
        contributors,
        topContributors: contributors.slice(0, 10),
        updatedAt: s.updatedAt || new Date().toISOString(),
      }
    }
    // 无 summary 时从记录兜底
    const contributors = await this.getContributors()
    return {
      totalItems: model.records.length,
      totalContributors: contributors.length,
      months: [],
      contributors,
      topContributors: contributors.slice(0, 10),
      updatedAt: new Date().toISOString(),
    }
  }

  async getContributorsCount(): Promise<number> {
    const model = await this.getModel()
    if (model.summary) return model.summary.totalContributors
    return new Set(model.records.map((r) => r.username)).size
  }

  async getTopTags(limit = 4): Promise<TopTag[]> {
    const model = await this.getModel()
    const counts = new Map<string, number>()
    for (const r of model.records) {
      for (const tag of r.item.tags || []) {
        if (tag && tag.trim()) counts.set(tag, (counts.get(tag) || 0) + 1)
      }
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
      .slice(0, limit)
  }

  async searchItems(query: string, limit = 50): Promise<IKfcItem[]> {
    const model = await this.getModel()
    const q = query.toLowerCase()
    return model.records
      .filter((r) => r.haystack.includes(q))
      .sort((a, b) => b.createdMs - a.createdMs)
      .slice(0, limit)
      .map((r) => r.item)
  }

  async getContributors(): Promise<Contributor[]> {
    const model = await this.getModel()
    if (model.summary?.contributors) {
      return model.summary.contributors.map(toContributor)
    }
    const counts = new Map<string, number>()
    for (const r of model.records) {
      counts.set(r.username, (counts.get(r.username) || 0) + 1)
    }
    return [...counts.entries()]
      .map(([username, count]) => toContributor({ username, count }))
      .sort((a, b) => b.count - a.count)
  }

  async getTopContributors(limit = 10): Promise<Contributor[]> {
    return (await this.getContributors()).slice(0, limit)
  }

  async getFeaturedItems(limit = 3, excludeId?: string): Promise<IKfcItem[]> {
    const model = await this.getModel()
    const perAuthor = new Map<string, Record>()
    for (const r of model.records) {
      if (r.type !== 'text') continue
      if (excludeId && r.item.id === excludeId) continue
      const cur = perAuthor.get(r.username)
      if (
        !cur ||
        r.reactions > cur.reactions ||
        (r.reactions === cur.reactions && r.createdMs > cur.createdMs)
      ) {
        perAuthor.set(r.username, r)
      }
    }
    return [...perAuthor.values()]
      .sort((a, b) => b.reactions - a.reactions || b.createdMs - a.createdMs)
      .slice(0, limit)
      .map((r) => r.item)
  }

  async healthCheck(): Promise<boolean> {
    try {
      const model = await this.getModel()
      return model.records.length > 0
    } catch {
      return false
    }
  }
}
