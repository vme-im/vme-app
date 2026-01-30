// Neon 数据库提供者
import { Pool } from '@neondatabase/serverless'
import { IKfcItem, Summary, Contributor } from '@/types'
import {
  DataProvider,
  GetItemsParams,
  PaginatedItems,
  ItemRow,
} from './types'


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
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    author: {
      username: row.author_username,
      avatarUrl: getAvatarUrl(row.author_username),
      url: getUserUrl(row.author_username),
    },
    reactions: {
      totalCount: row.reactions_count,
    },
  }
}

export class NeonProvider implements DataProvider {
  private pool: Pool

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl })
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
        `(to_tsvector('simple', title) @@ plainto_tsquery('simple', $${paramIndex}) OR to_tsvector('simple', body) @@ plainto_tsquery('simple', $${paramIndex}))`
      )
      queryParams.push(search)
      paramIndex++
    }

    if (type) {
      conditions.push(`content_type = $${paramIndex}`)
      queryParams.push(type)
      paramIndex++
    }

    const whereClause = conditions.join(' AND ')

    // 获取数据
    const itemsQuery = `
      SELECT * FROM items
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    queryParams.push(limit, offset)

    const result = await this.pool.query(itemsQuery, queryParams)
    const rows = result.rows as ItemRow[]

    const items = rows.map(rowToItem)

    // 获取总数
    const countQuery = `SELECT COUNT(*) as count FROM items WHERE ${whereClause}`
    // remove limit and offset params for count query
    const countResult = await this.pool.query(
      countQuery,
      queryParams.slice(0, -2)
    )
    const total = parseInt(countResult.rows[0].count, 10)

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

    const result = await this.pool.query(`
      SELECT * FROM items
      WHERE moderation_status = 'approved' ${typeCondition}
      ORDER BY RANDOM()
      LIMIT 1
    `, params)
    const rows = result.rows as ItemRow[]

    return rows.length ? rowToItem(rows[0]) : null
  }

  async getItemById(id: string): Promise<IKfcItem | null> {
    const result = await this.pool.query(`
      SELECT * FROM items
      WHERE id = $1 AND moderation_status = 'approved'
      LIMIT 1
    `, [id])
    const rows = result.rows as ItemRow[]

    return rows.length ? rowToItem(rows[0]) : null
  }

  async getStats(): Promise<Summary> {
    // 实时查询总数
    const totalResult = await this.pool.query(`
      SELECT COUNT(*) as total FROM items WHERE moderation_status = 'approved'
    `)
    const totalItems = parseInt(totalResult.rows[0].total, 10)

    // 实时查询贡献者数
    const contributorResult = await this.pool.query(`
      SELECT COUNT(DISTINCT author_username) as total FROM items WHERE moderation_status = 'approved'
    `)
    const totalContributors = parseInt(contributorResult.rows[0].total, 10)

    // 实时查询月度统计 (使用 UTC+8)
    const monthlyResult = await this.pool.query(`
      SELECT
        TO_CHAR(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM') as month,
        COUNT(*) as count
      FROM items
      WHERE moderation_status = 'approved'
      GROUP BY month
      ORDER BY month DESC
    `)
    const months = monthlyResult.rows.map((row: { month: string; count: string }) => ({
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

  async searchItems(query: string, limit = 50): Promise<IKfcItem[]> {
    const result = await this.pool.query(`
      SELECT * FROM items
      WHERE
        moderation_status = 'approved' AND
        (
          to_tsvector('simple', title) @@ plainto_tsquery('simple', $1) OR
          to_tsvector('simple', body) @@ plainto_tsquery('simple', $1)
        )
      ORDER BY created_at DESC
      LIMIT $2
    `, [query, limit])
    const rows = result.rows as ItemRow[]

    return rows.map(rowToItem)
  }

  async getContributors(): Promise<Contributor[]> {
    // 从 items 表实时聚合
    const result = await this.pool.query(`
      SELECT
        author_username as username,
        COUNT(*) as count
      FROM items
      WHERE moderation_status = 'approved'
      GROUP BY author_username
      ORDER BY count DESC
    `)

    return result.rows.map((row: { username: string; count: string }) => ({
      username: row.username,
      avatarUrl: getAvatarUrl(row.username),
      url: getUserUrl(row.username),
      count: parseInt(row.count, 10),
    }))
  }

  async getTopContributors(limit = 10): Promise<Contributor[]> {
    // 从 items 表实时聚合
    const result = await this.pool.query(`
      SELECT
        author_username as username,
        COUNT(*) as count
      FROM items
      WHERE moderation_status = 'approved'
      GROUP BY author_username
      ORDER BY count DESC
      LIMIT $1
    `, [limit])

    return result.rows.map((row: { username: string; count: string }) => ({
      username: row.username,
      avatarUrl: getAvatarUrl(row.username),
      url: getUserUrl(row.username),
      count: parseInt(row.count, 10),
    }))
  }

  // 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1')
      return true
    } catch {
      return false
    }
  }
}
