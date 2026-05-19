import { describe, it, expect, vi } from 'vitest'
import { NeonProvider } from './neon-provider'
import type { ItemRow } from './types'

// 用一个合法格式的连接串构造（neon() 只解析、不连接），
// 再把内部 sql 替换成可编程的假实现，断言生成的 SQL 与参数。
function makeProvider(rows: unknown[]) {
  const provider = new NeonProvider('postgres://user:pass@db.example.com/neondb')
  const query = vi.fn(async (_text: string, _params?: unknown[]) => rows)
  ;(provider as unknown as { sql: { query: typeof query } }).sql = { query }
  return { provider, query }
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

function row(overrides: Partial<ItemRow> = {}): ItemRow {
  return {
    id: 'id-1',
    title: 't',
    url: 'http://x',
    body: 'b',
    created_at: new Date('2026-01-02T03:04:05.000Z'),
    updated_at: new Date('2026-01-02T03:04:05.000Z'),
    author_username: 'alice',
    source_repo: 'repo',
    content_type: 'text',
    tags: ['k'],
    reactions_count: 9,
    moderation_status: 'approved',
    synced_at: new Date('2026-01-02T03:04:05.000Z'),
    ...overrides,
  }
}

describe('NeonProvider.getItems', () => {
  it('默认参数：合并 count 的窗口函数查询 + 正确分页参数', async () => {
    const { provider, query } = makeProvider([{ ...row(), total_count: '42' }])
    const res = await provider.getItems({})

    const [text, params] = query.mock.calls[0]
    expect(norm(text)).toContain('SELECT *, COUNT(*) OVER() AS total_count FROM items')
    expect(norm(text)).toContain("WHERE moderation_status = 'approved'")
    expect(norm(text)).toContain('ORDER BY created_at DESC')
    expect(norm(text)).toContain('LIMIT $1 OFFSET $2')
    expect(params).toEqual([20, 0])

    expect(res.total).toBe(42)
    expect(res.totalPages).toBe(3) // ceil(42/20)
    expect(res.items).toHaveLength(1)
    expect(res.items[0].id).toBe('id-1')
  })

  it('多过滤条件：占位符顺序与排序列正确', async () => {
    const { provider, query } = makeProvider([{ ...row(), total_count: '5' }])
    await provider.getItems({
      author: 'bob',
      search: 'kw',
      type: 'meme',
      tag: 'foo',
      page: 2,
      limit: 5,
      sortBy: 'reactions',
      order: 'asc',
    })

    const [text, params] = query.mock.calls[0]
    const t = norm(text)
    expect(t).toContain('author_username = $1')
    expect(t).toContain('$2') // search 的 tsquery 占位
    expect(t).toContain('content_type = $3')
    expect(t).toContain('$4 = ANY(tags)')
    expect(t).toContain('ORDER BY reactions_count ASC')
    expect(t).toContain('LIMIT $5 OFFSET $6')
    // offset = (2-1)*5 = 5
    expect(params).toEqual(['bob', 'kw', 'meme', 'foo', 5, 5])
  })

  it('无结果时 total/totalPages 归零，不抛错', async () => {
    const { provider } = makeProvider([])
    const res = await provider.getItems({})
    expect(res.total).toBe(0)
    expect(res.totalPages).toBe(0)
    expect(res.items).toEqual([])
  })
})

describe('NeonProvider.getItemById', () => {
  it('命中：行被正确映射（头像/主页/ISO 时间）', async () => {
    const { provider, query } = makeProvider([row({ author_username: 'alice' })])
    const item = await provider.getItemById('id-1')

    const [text, params] = query.mock.calls[0]
    expect(norm(text)).toContain("id = $1 AND moderation_status = 'approved'")
    expect(params).toEqual(['id-1'])

    expect(item).not.toBeNull()
    expect(item!.author.avatarUrl).toBe('https://github.com/alice.png')
    expect(item!.author.url).toBe('https://github.com/alice')
    expect(item!.createdAt).toBe('2026-01-02T03:04:05.000Z')
    expect(item!.reactions?.totalCount).toBe(9)
  })

  it('未命中返回 null', async () => {
    const { provider } = makeProvider([])
    expect(await provider.getItemById('missing')).toBeNull()
  })
})

describe('NeonProvider.getRandomItem', () => {
  it('空表返回 null', async () => {
    const { provider } = makeProvider([])
    expect(await provider.getRandomItem()).toBeNull()
  })

  it('带 type 时拼接 content_type 条件与参数', async () => {
    const { provider, query } = makeProvider([row()])
    await provider.getRandomItem('meme')
    const [text, params] = query.mock.calls[0]
    expect(norm(text)).toContain('AND content_type = $1')
    expect(params).toEqual(['meme'])
  })
})

describe('NeonProvider.getContributorsCount', () => {
  it('解析 COUNT(DISTINCT) 字符串为数字', async () => {
    const { provider, query } = makeProvider([{ total: '7' }])
    expect(await provider.getContributorsCount()).toBe(7)
    expect(norm(query.mock.calls[0][0])).toContain('COUNT(DISTINCT author_username)')
  })
})
