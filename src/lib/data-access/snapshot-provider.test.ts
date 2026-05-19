import { describe, it, expect, vi, afterEach } from 'vitest'
import { SnapshotProvider } from './snapshot-provider'

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

const jan = [
  {
    id: 'a1',
    title: 'hi',
    url: 'http://x/a1',
    body: 'hello world',
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-01-10T00:00:00.000Z',
    author: { username: 'alice' },
    tags: ['谐音梗', '恋爱'],
    reactionsCount: 5,
  },
  {
    id: 'a2',
    title: 'm',
    url: 'http://x/a2',
    body: 'meme ![x](http://i/x.png)',
    createdAt: '2026-01-20T00:00:00.000Z',
    updatedAt: '2026-01-20T00:00:00.000Z',
    author: { username: 'alice' },
    tags: ['荒诞'],
    reactionsCount: 9,
  },
]
const feb = [
  {
    id: 'b1',
    title: 'c',
    url: 'http://x/b1',
    body: 'another text about cats',
    createdAt: '2026-02-05T00:00:00.000Z',
    updatedAt: '2026-02-05T00:00:00.000Z',
    author: { username: 'bob' },
    tags: ['恋爱'],
    reactionsCount: 2,
  },
  {
    id: 'a3',
    title: 's',
    url: 'http://x/a3',
    body: 'short',
    createdAt: '2026-02-15T00:00:00.000Z',
    updatedAt: '2026-02-15T00:00:00.000Z',
    author: { username: 'alice' },
    tags: [],
    reactionsCount: 1,
  },
]

function mockFetchOk() {
  const fn = vi.fn(async (url: string) => {
    let data: unknown
    if (url.endsWith('/summary.json')) data = summary
    else if (url.endsWith('/2026-01.json')) data = jan
    else if (url.endsWith('/2026-02.json')) data = feb
    else data = []
    return { ok: true, json: async () => data } as Response
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => vi.unstubAllGlobals())

describe('SnapshotProvider.getItems', () => {
  it('默认按 createdAt 降序、分页与总数', async () => {
    mockFetchOk()
    const p = new SnapshotProvider('http://snap')
    const res = await p.getItems({})
    expect(res.total).toBe(4)
    expect(res.totalPages).toBe(1)
    expect(res.items.map((i) => i.id)).toEqual(['a3', 'b1', 'a2', 'a1'])
  })

  it('按 reactions 降序', async () => {
    mockFetchOk()
    const p = new SnapshotProvider('http://snap')
    const res = await p.getItems({ sortBy: 'reactions', order: 'desc' })
    expect(res.items.map((i) => i.id)).toEqual(['a2', 'a1', 'b1', 'a3'])
  })

  it('过滤 type/author/tag/search', async () => {
    mockFetchOk()
    const p = new SnapshotProvider('http://snap')
    expect((await p.getItems({ type: 'meme' })).items.map((i) => i.id)).toEqual(['a2'])
    expect((await p.getItems({ author: 'bob' })).items.map((i) => i.id)).toEqual(['b1'])
    expect(
      (await p.getItems({ tag: '恋爱', sortBy: 'reactions', order: 'desc' })).items.map(
        (i) => i.id,
      ),
    ).toEqual(['a1', 'b1'])
    expect((await p.getItems({ search: 'cats' })).items.map((i) => i.id)).toEqual(['b1'])
  })

  it('分页切片', async () => {
    mockFetchOk()
    const p = new SnapshotProvider('http://snap')
    const res = await p.getItems({ limit: 2, page: 2, sortBy: 'reactions', order: 'desc' })
    expect(res.items.map((i) => i.id)).toEqual(['b1', 'a3'])
    expect(res.total).toBe(4)
    expect(res.totalPages).toBe(2)
  })
})

describe('SnapshotProvider.getItemById', () => {
  it('命中映射头像/主页/ISO/reactions/tags', async () => {
    mockFetchOk()
    const p = new SnapshotProvider('http://snap')
    const it = await p.getItemById('a1')
    expect(it).not.toBeNull()
    expect(it!.author.avatarUrl).toBe('https://github.com/alice.png')
    expect(it!.author.url).toBe('https://github.com/alice')
    expect(it!.createdAt).toBe('2026-01-10T00:00:00.000Z')
    expect(it!.reactions?.totalCount).toBe(5)
    expect(it!.tags).toEqual(['谐音梗', '恋爱'])
  })
  it('未命中 null', async () => {
    mockFetchOk()
    const p = new SnapshotProvider('http://snap')
    expect(await p.getItemById('zzz')).toBeNull()
  })
})

describe('SnapshotProvider 其它读路径', () => {
  it('getRandomItem(meme) 只返回 meme', async () => {
    mockFetchOk()
    const p = new SnapshotProvider('http://snap')
    const it = await p.getRandomItem('meme')
    expect(it!.id).toBe('a2')
  })
  it('getStats 读 summary、贡献者派生头像', async () => {
    mockFetchOk()
    const p = new SnapshotProvider('http://snap')
    const s = await p.getStats()
    expect(s.totalItems).toBe(4)
    expect(s.totalContributors).toBe(2)
    expect(s.months).toHaveLength(2)
    expect(s.contributors[0]).toEqual({
      username: 'alice',
      count: 3,
      avatarUrl: 'https://github.com/alice.png',
      url: 'https://github.com/alice',
    })
  })
  it('getContributorsCount 用 summary', async () => {
    mockFetchOk()
    const p = new SnapshotProvider('http://snap')
    expect(await p.getContributorsCount()).toBe(2)
  })
  it('getTopTags 计数排序', async () => {
    mockFetchOk()
    const p = new SnapshotProvider('http://snap')
    expect(await p.getTopTags()).toEqual([
      { tag: '恋爱', count: 2 },
      { tag: '荒诞', count: 1 },
      { tag: '谐音梗', count: 1 },
    ])
  })
  it('searchItems 子串', async () => {
    mockFetchOk()
    const p = new SnapshotProvider('http://snap')
    expect((await p.searchItems('text')).map((i) => i.id)).toEqual(['b1'])
  })
  it('getFeaturedItems 每作者一条(text)，按热度', async () => {
    mockFetchOk()
    const p = new SnapshotProvider('http://snap')
    expect((await p.getFeaturedItems(3)).map((i) => i.id)).toEqual(['a1', 'b1'])
    expect((await p.getFeaturedItems(3, 'a1')).map((i) => i.id)).toEqual(['b1', 'a3'])
  })
})

describe('SnapshotProvider 降级', () => {
  it('拉取失败不抛错、返回空', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }),
    )
    const p = new SnapshotProvider('http://snap')
    const res = await p.getItems({})
    expect(res.total).toBe(0)
    expect(res.items).toEqual([])
    const s = await p.getStats()
    expect(s.totalItems).toBe(0)
    expect(await p.getItemById('a1')).toBeNull()
  })
})
