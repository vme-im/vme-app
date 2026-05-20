import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SqlSnapshotProvider } from './sql-snapshot-provider'

const summary = {
  totalItems: 4,
  totalContributors: 2,
  months: [
    { month: '2026-01', count: 2 },
    { month: '2026-02', count: 2 },
  ],
  contributors: [
    { username: 'alice', count: 3 },
    { username: 'bob', count: 1 },
  ],
  topContributors: [{ username: 'alice', count: 3 }],
  updatedAt: '2026-02-01T00:00:00.000Z',
}

// 4 条 items（与 SnapshotProvider 测试同等覆盖），item_tags 5 行
const snapshotSql = `
-- vme snapshot fixture
CREATE TABLE items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  reactions INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text','meme'))
);
CREATE INDEX idx_items_author ON items(author);
CREATE INDEX idx_items_type ON items(type);
CREATE INDEX idx_items_created ON items(created_at);
CREATE INDEX idx_items_reactions ON items(reactions);

CREATE TABLE item_tags (
  item_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (item_id, tag)
);
CREATE INDEX idx_item_tags_tag ON item_tags(tag);

BEGIN;
INSERT INTO items VALUES ('a1','hi','hello world','alice',${new Date('2026-01-10T00:00:00.000Z').getTime()},5,'text');
INSERT INTO items VALUES ('a2','m','meme ![x](http://i/x.png)','alice',${new Date('2026-01-20T00:00:00.000Z').getTime()},9,'meme');
INSERT INTO items VALUES ('a3','s','short','alice',${new Date('2026-02-15T00:00:00.000Z').getTime()},1,'text');
INSERT INTO items VALUES ('b1','c','another text about cats','bob',${new Date('2026-02-05T00:00:00.000Z').getTime()},2,'text');
INSERT INTO item_tags VALUES ('a1','恋爱');
INSERT INTO item_tags VALUES ('a1','谐音梗');
INSERT INTO item_tags VALUES ('a2','荒诞');
INSERT INTO item_tags VALUES ('b1','恋爱');
COMMIT;
`

function mockFetchOk() {
  const fn = vi.fn(async (url: string) => {
    if (url.endsWith('/snapshot.sql')) {
      return { ok: true, text: async () => snapshotSql } as Response
    }
    if (url.endsWith('/summary.json')) {
      return { ok: true, json: async () => summary } as Response
    }
    return { ok: false, status: 404, text: async () => '', json: async () => ({}) } as Response
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('SqlSnapshotProvider', () => {
  it('getItems：默认按 created_at DESC 分页', async () => {
    mockFetchOk()
    const p = new SqlSnapshotProvider()
    const r = await p.getItems({ page: 1, limit: 10 })
    expect(r.total).toBe(4)
    expect(r.items.map((i) => i.id)).toEqual(['a3', 'b1', 'a2', 'a1'])
  })

  it('getItems：author 过滤', async () => {
    mockFetchOk()
    const p = new SqlSnapshotProvider()
    const r = await p.getItems({ author: 'alice', page: 1, limit: 10 })
    expect(r.total).toBe(3)
    expect(r.items.map((i) => i.id).sort()).toEqual(['a1', 'a2', 'a3'])
  })

  it('getItems：type 过滤', async () => {
    mockFetchOk()
    const p = new SqlSnapshotProvider()
    const r = await p.getItems({ type: 'meme', page: 1, limit: 10 })
    expect(r.total).toBe(1)
    expect(r.items[0].id).toBe('a2')
  })

  it('getItems：tag 过滤（走 item_tags join）', async () => {
    mockFetchOk()
    const p = new SqlSnapshotProvider()
    const r = await p.getItems({ tag: '恋爱', page: 1, limit: 10 })
    expect(r.total).toBe(2)
    expect(r.items.map((i) => i.id).sort()).toEqual(['a1', 'b1'])
  })

  it('getItems：search 过滤（LIKE 不区分大小写）', async () => {
    mockFetchOk()
    const p = new SqlSnapshotProvider()
    const r = await p.getItems({ search: 'CATS', page: 1, limit: 10 })
    expect(r.items.map((i) => i.id)).toEqual(['b1'])
  })

  it('getItems：sortBy reactions DESC', async () => {
    mockFetchOk()
    const p = new SqlSnapshotProvider()
    const r = await p.getItems({ sortBy: 'reactions', order: 'desc', page: 1, limit: 10 })
    expect(r.items.map((i) => i.id)).toEqual(['a2', 'a1', 'b1', 'a3'])
  })

  it('getItems：item 含 tags 数组', async () => {
    mockFetchOk()
    const p = new SqlSnapshotProvider()
    const r = await p.getItems({ author: 'alice', page: 1, limit: 10 })
    const a1 = r.items.find((i) => i.id === 'a1')!
    expect(a1.tags?.sort()).toEqual(['恋爱', '谐音梗'])
    const a3 = r.items.find((i) => i.id === 'a3')!
    expect(a3.tags).toEqual([])
  })

  it('getItems：item 派生 author.avatarUrl / url', async () => {
    mockFetchOk()
    const p = new SqlSnapshotProvider()
    const r = await p.getItems({ author: 'alice', page: 1, limit: 1 })
    expect(r.items[0].author.username).toBe('alice')
    expect(r.items[0].author.avatarUrl).toBe('https://github.com/alice.png')
    expect(r.items[0].author.url).toBe('https://github.com/alice')
  })

  it('getItemById：命中', async () => {
    mockFetchOk()
    const p = new SqlSnapshotProvider()
    const it = await p.getItemById('a1')
    expect(it?.id).toBe('a1')
    expect(it?.tags?.sort()).toEqual(['恋爱', '谐音梗'])
  })

  it('getItemById：未命中返回 null', async () => {
    mockFetchOk()
    const p = new SqlSnapshotProvider()
    expect(await p.getItemById('nope')).toBeNull()
  })

  it('getStats：用 summary.json 派生', async () => {
    mockFetchOk()
    const p = new SqlSnapshotProvider()
    const s = await p.getStats()
    expect(s.totalItems).toBe(4)
    expect(s.totalContributors).toBe(2)
    expect(s.contributors.map((c) => c.username)).toEqual(['alice', 'bob'])
    expect(s.contributors[0].avatarUrl).toBe('https://github.com/alice.png')
  })

  it('getTopTags：按 count DESC', async () => {
    mockFetchOk()
    const p = new SqlSnapshotProvider()
    const tags = await p.getTopTags(10)
    expect(tags.find((t) => t.tag === '恋爱')?.count).toBe(2)
    expect(tags.find((t) => t.tag === '谐音梗')?.count).toBe(1)
    expect(tags.find((t) => t.tag === '荒诞')?.count).toBe(1)
  })

  it('searchItems：相同 LIKE 行为', async () => {
    mockFetchOk()
    const p = new SqlSnapshotProvider()
    const items = await p.searchItems('hello')
    expect(items.map((i) => i.id)).toEqual(['a1'])
  })

  it('getFeaturedItems：每作者一条最佳 text + excludeId', async () => {
    mockFetchOk()
    const p = new SqlSnapshotProvider()
    // alice text 段子：a1(reactions=5)/a3(=1)；最佳 a1。b1 text reactions=2。期望按 reactions desc：a1, b1
    const items = await p.getFeaturedItems(3)
    expect(items.map((i) => i.id)).toEqual(['a1', 'b1'])

    // 排除 a1 后，alice 最佳变 a3(reactions=1)
    const items2 = await p.getFeaturedItems(3, 'a1')
    expect(items2.map((i) => i.id)).toEqual(['b1', 'a3'])
  })

  it('getRandomItem：返回非空（type=text 时只在 text 子集）', async () => {
    mockFetchOk()
    const p = new SqlSnapshotProvider()
    const r = await p.getRandomItem('text')
    expect(['a1', 'a3', 'b1']).toContain(r?.id)
  })

  it('graceful-degrade：fetch 失败、无缓存 → 返回空集合而非抛错', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500 }) as Response),
    )
    const p = new SqlSnapshotProvider()
    const r = await p.getItems({})
    expect(r.total).toBe(0)
    expect(r.items).toEqual([])
  })

  it('TTL 命中：5 分钟内复用 model，不再 fetch', async () => {
    const fn = mockFetchOk()
    const p = new SqlSnapshotProvider()
    await p.getItems({})
    const callsAfterFirst = fn.mock.calls.length
    await p.getItems({ author: 'alice' })
    expect(fn.mock.calls.length).toBe(callsAfterFirst)
  })
})
