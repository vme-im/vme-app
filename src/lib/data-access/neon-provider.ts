// Neon 数据库提供者
// 使用 HTTP 驱动（neon），每次查询是一次性 HTTP 请求，无长连接，
// 让 Neon 计算实例可以更快自动挂起（scale-to-zero），显著降低 CU-hours 消耗。
import { neon, NeonQueryFunction } from '@neondatabase/serverless'
import { IKfcItem, Summary, Contributor } from '@/types'
import { DataProvider, GetItemsParams, PaginatedItems, ItemRow, TopTag } from './types'

// 拼接 GitHub 头像 URL
function getAvatarUrl(username: string): string {
  return `https://github.com/${username}.png`
}

// 拼接 GitHub 用户 URL
function getUserUrl(username: string): string {
  return `https://github.com/${username}`
}

// 将数据库行转换为 IKfcItem
function rowToItem(row: ItemRow): IKfcItem {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    body: row.body,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    author: {
      username: row.author_username,
      avatarUrl: getAvatarUrl(row.author_username),
      url: getUserUrl(row.author_username),
    },
    reactions: {
      totalCount: row.reactions_count,
    },
    tags: row.tags || [],
  }
}

export class NeonProvider implements DataProvider {
  private sql: NeonQueryFunction<false, false>

  constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl)
  }

  // HTTP 驱动下 sql.query 直接返回行数组
  private async query<T>(text: string, params: (string | number)[] = []): Promise<T[]> {
    return (await this.sql.query(text, params)) as T[]
  }

  async getItems(params: GetItemsParams): Promise<PaginatedItems> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      order = 'desc',
      author,
      type,
      search,
    } = params
    const offset = (page - 1) * limit

    // 构建排序字段
    const sortColumn =
      sortBy === 'reactions'
        ? 'reactions_count'
        : sortBy === 'hot'
          ? 'reactions_count'
          : 'created_at'
    const sortOrder = order.toUpperCase()

    // 构建查询条件
    const conditions: string[] = ["moderation_status = 'approved'"]
    const queryParams: (string | number)[] = []
    let paramIndex = 1

    if (author) {
      conditions.push(`author_username = $${paramIndex}`)
      queryParams.push(author)
      paramIndex++
    }

    if (search) {
      conditions.push(
        `(to_tsvector('simple', title) @@ plainto_tsquery('simple', $${paramIndex}) OR to_tsvector('simple', body) @@ plainto_tsquery('simple', $${paramIndex}))`,
      )
      queryParams.push(search)
      paramIndex++
    }

    if (type) {
      conditions.push(`content_type = $${paramIndex}`)
      queryParams.push(type)
      paramIndex++
    }

    if (params.tag) {
      conditions.push(`$${paramIndex} = ANY(tags)`)
      queryParams.push(params.tag)
      paramIndex++
    }

    const whereClause = conditions.join(' AND ')

    // 单次查询同时取数据和总数（窗口函数），避免额外一次 count 往返
    const itemsQuery = `
      SELECT *, COUNT(*) OVER() AS total_count FROM items
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    queryParams.push(limit, offset)

    const rows = await this.query<ItemRow & { total_count: string }>(itemsQuery, queryParams)

    const items = rows.map(rowToItem)
    const total = rows.length ? parseInt(rows[0].total_count, 10) : 0

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async getRandomItem(type?: 'text' | 'meme'): Promise<IKfcItem | null> {
    const typeCondition = type ? `AND content_type = $1` : ''
    const params = type ? [type] : []

    const rows = await this.query<ItemRow>(
      `
      SELECT * FROM items
      WHERE moderation_status = 'approved' ${typeCondition}
      ORDER BY RANDOM()
      LIMIT 1
    `,
      params,
    )

    return rows.length ? rowToItem(rows[0]) : null
  }

  async getItemById(id: string): Promise<IKfcItem | null> {
    const rows = await this.query<ItemRow>(
      `
      SELECT * FROM items
      WHERE id = $1 AND moderation_status = 'approved'
      LIMIT 1
    `,
      [id],
    )

    return rows.length ? rowToItem(rows[0]) : null
  }

  // 轻量贡献者计数：单条 COUNT(DISTINCT)，供布局等高频路径使用，
  // 避免为了一个数字而跑 getStats() 的多次全表聚合。
  async getContributorsCount(): Promise<number> {
    const rows = await this.query<{ total: string }>(`
      SELECT COUNT(DISTINCT author_username) as total FROM items WHERE moderation_status = 'approved'
    `)
    return parseInt(rows[0].total, 10)
  }

  async getStats(): Promise<Summary> {
    // 实时查询总数
    const totalRows = await this.query<{ total: string }>(`
      SELECT COUNT(*) as total FROM items WHERE moderation_status = 'approved'
    `)
    const totalItems = parseInt(totalRows[0].total, 10)

    // 实时查询贡献者数
    const contributorRows = await this.query<{ total: string }>(`
      SELECT COUNT(DISTINCT author_username) as total FROM items WHERE moderation_status = 'approved'
    `)
    const totalContributors = parseInt(contributorRows[0].total, 10)

    // 实时查询月度统计 (使用 UTC+8)
    const monthlyRows = await this.query<{ month: string; count: string }>(`
      SELECT
        TO_CHAR(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM') as month,
        COUNT(*) as count
      FROM items
      WHERE moderation_status = 'approved'
      GROUP BY month
      ORDER BY month DESC
    `)
    const months = monthlyRows.map((row) => ({
      month: row.month,
      count: parseInt(row.count, 10),
    }))

    // 获取 Top 10 贡献者
    const topContributors = await this.getTopContributors(10)

    // 获取所有贡献者
    const contributors = await this.getContributors()

    return {
      totalItems,
      totalContributors,
      months,
      contributors,
      topContributors,
      updatedAt: new Date().toISOString(),
    }
  }

  async getTopTags(limit = 4): Promise<TopTag[]> {
    const rows = await this.query<{ tag: string; count: number }>(
      `
      SELECT tag, COUNT(*)::int AS count
      FROM items, unnest(tags) AS tag
      WHERE moderation_status = 'approved'
        AND tags IS NOT NULL
        AND array_length(tags, 1) > 0
        AND tag IS NOT NULL
        AND tag <> ''
      GROUP BY tag
      ORDER BY count DESC, tag ASC
      LIMIT $1
    `,
      [limit],
    )

    return rows.map((row) => ({
      tag: row.tag,
      count: row.count,
    }))
  }

  async searchItems(query: string, limit = 50): Promise<IKfcItem[]> {
    const rows = await this.query<ItemRow>(
      `
      SELECT * FROM items
      WHERE
        moderation_status = 'approved' AND
        (
          to_tsvector('simple', title) @@ plainto_tsquery('simple', $1) OR
          to_tsvector('simple', body) @@ plainto_tsquery('simple', $1)
        )
      ORDER BY created_at DESC
      LIMIT $2
    `,
      [query, limit],
    )

    return rows.map(rowToItem)
  }

  async getContributors(): Promise<Contributor[]> {
    // 从 items 表实时聚合
    const rows = await this.query<{ username: string; count: string }>(`
      SELECT
        author_username as username,
        COUNT(*) as count
      FROM items
      WHERE moderation_status = 'approved'
      GROUP BY author_username
      ORDER BY count DESC
    `)

    return rows.map((row) => ({
      username: row.username,
      avatarUrl: getAvatarUrl(row.username),
      url: getUserUrl(row.username),
      count: parseInt(row.count, 10),
    }))
  }

  async getTopContributors(limit = 10): Promise<Contributor[]> {
    // 从 items 表实时聚合
    const rows = await this.query<{ username: string; count: string }>(
      `
      SELECT
        author_username as username,
        COUNT(*) as count
      FROM items
      WHERE moderation_status = 'approved'
      GROUP BY author_username
      ORDER BY count DESC
      LIMIT $1
    `,
      [limit],
    )

    return rows.map((row) => ({
      username: row.username,
      avatarUrl: getAvatarUrl(row.username),
      url: getUserUrl(row.username),
      count: parseInt(row.count, 10),
    }))
  }

  /**
   * 获取精选段子 - 每个作者只返回一条
   * 使用 DISTINCT ON 按作者去重，最终按热度排序
   *
   * 逻辑:
   * 1. CTE 中为每个作者选择其互动最多的段子
   * 2. 外层查询按 reactions_count 降序返回结果
   */
  async getFeaturedItems(limit = 3, excludeId?: string): Promise<IKfcItem[]> {
    const excludeCondition = excludeId ? `AND id != $1` : ''
    const params = excludeId ? [excludeId] : []
    const limitParam = `$${excludeId ? 2 : 1}`

    const rows = await this.query<ItemRow>(
      `
      WITH featured AS (
        -- 为每个作者选择其互动最多的段子
        SELECT DISTINCT ON (author_username)
          id, title, url, body, created_at, updated_at,
          author_username, source_repo, content_type, tags,
          reactions_count, moderation_status, synced_at
        FROM items
        WHERE moderation_status = 'approved'
          AND content_type = 'text'
          ${excludeCondition}
        ORDER BY author_username, reactions_count DESC, created_at DESC
      )
      -- 最终按热度排序返回
      SELECT * FROM featured
      ORDER BY reactions_count DESC, created_at DESC
      LIMIT ${limitParam}
    `,
      [...params, limit],
    )

    return rows.map(rowToItem)
  }

  // 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      await this.sql.query('SELECT 1')
      return true
    } catch {
      return false
    }
  }
}
