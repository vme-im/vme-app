// SPIKE：测 sql.js 在 Vercel Node serverless 的冷启动与查询开销
// 不合并到 main；验证完删。决策依据见 architecture.md（待补 §0 spike 行）。
import { readFileSync } from 'node:fs'
import path from 'node:path'
import initSqlJs from 'sql.js'
import { getDataProvider } from '@/lib/data-access'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface Timings {
  init_sqljs_ms: number
  fetch_snapshot_ms: number
  build_db_ms: number
  query_author_ms: number
  query_byid_ms: number
  query_count_ms: number
  query_topn_ms: number
  total_ms: number
  total_items: number
  query_author_rows: number
  zkl2333_total: number
  db_bytes: number
}

export async function GET() {
  const tStart = performance.now()

  // 1. 初始化 sql.js（wasm 从 node_modules 读，由 outputFileTracingIncludes 保证打包）
  const tInit0 = performance.now()
  const wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
  const wasmBinary = readFileSync(wasmPath)
  const SQL = await initSqlJs({ wasmBinary })
  const init_sqljs_ms = performance.now() - tInit0

  // 2. 拉全量数据（复用现有 SnapshotProvider 单例与缓存）
  const tFetch0 = performance.now()
  const provider = getDataProvider()
  const all = await provider.getItems({ limit: 10000 })
  const fetch_snapshot_ms = performance.now() - tFetch0

  // 3. 在内存里建 SQLite + 索引 + 灌数据
  const tBuild0 = performance.now()
  const db = new SQL.Database()
  db.exec(`
    CREATE TABLE items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      author TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      reactions INTEGER NOT NULL,
      type TEXT NOT NULL,
      tags TEXT NOT NULL
    );
    CREATE INDEX idx_author ON items(author);
    CREATE INDEX idx_type ON items(type);
    CREATE INDEX idx_created ON items(created_at);
    CREATE INDEX idx_reactions ON items(reactions);
  `)
  const stmt = db.prepare(
    'INSERT INTO items (id,title,body,author,created_at,reactions,type,tags) VALUES (?,?,?,?,?,?,?,?)',
  )
  db.exec('BEGIN')
  for (const it of all.items) {
    const type = it.body && /!\[.*?\]\(.*?\)/.test(it.body) ? 'meme' : 'text'
    stmt.run([
      it.id,
      it.title || '',
      it.body || '',
      it.author.username,
      new Date(it.createdAt).getTime() || 0,
      it.reactions?.totalCount ?? 0,
      type,
      (it.tags || []).join(','),
    ])
  }
  db.exec('COMMIT')
  stmt.free()
  const build_db_ms = performance.now() - tBuild0

  // 4. 查询：作者过滤 + 时间降序 + 分页（对照 /authors/[username] 实际路径）
  const tQ1 = performance.now()
  const q1 = db.prepare(`
    SELECT id, title, author, reactions, created_at
    FROM items
    WHERE author = $author
    ORDER BY created_at DESC
    LIMIT 10 OFFSET 0
  `)
  q1.bind({ $author: 'zkl2333' })
  const r1: Record<string, unknown>[] = []
  while (q1.step()) r1.push(q1.getAsObject())
  q1.free()
  const query_author_ms = performance.now() - tQ1

  // 5. getItemById
  const tQ2 = performance.now()
  const sampleId = all.items[0]?.id ?? ''
  const q2 = db.prepare('SELECT id, title FROM items WHERE id = $id')
  q2.bind({ $id: sampleId })
  const r2: Record<string, unknown>[] = []
  while (q2.step()) r2.push(q2.getAsObject())
  q2.free()
  const query_byid_ms = performance.now() - tQ2

  // 6. COUNT
  const tQ3 = performance.now()
  const q3 = db.exec("SELECT COUNT(*) AS total FROM items WHERE author = 'zkl2333'")
  const zkl2333_total = Number(q3[0]?.values?.[0]?.[0] ?? 0)
  const query_count_ms = performance.now() - tQ3

  // 7. top-N 按 reactions（首页/精选这类路径）
  const tQ4 = performance.now()
  const q4 = db.exec(`
    SELECT id, title, author, reactions
    FROM items
    WHERE type = 'text'
    ORDER BY reactions DESC, created_at DESC
    LIMIT 10
  `)
  const query_topn_ms = performance.now() - tQ4
  const topn_rows = q4[0]?.values?.length ?? 0

  // 估算 db 大小（export 出 Uint8Array）
  const bin = db.export()
  const db_bytes = bin.byteLength
  db.close()

  const total_ms = performance.now() - tStart

  const timings: Timings = {
    init_sqljs_ms,
    fetch_snapshot_ms,
    build_db_ms,
    query_author_ms,
    query_byid_ms,
    query_count_ms,
    query_topn_ms,
    total_ms,
    total_items: all.total,
    query_author_rows: r1.length,
    zkl2333_total,
    db_bytes,
  }

  return Response.json({
    timings,
    sqljs_wasm_kb: Math.round(wasmBinary.byteLength / 1024),
    sample_author_rows: r1.slice(0, 3),
    sample_byid: r2[0] ?? null,
    topn_rows,
  })
}
