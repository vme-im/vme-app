// 数据访问层类型定义
import { IKfcItem, Summary, Contributor } from '@/types'

export interface GetItemsParams {
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'reactions' | 'hot'
  order?: 'asc' | 'desc'
  author?: string
  type?: 'text' | 'meme'
  search?: string
}

export interface PaginatedItems {
  items: IKfcItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface DataProvider {
  getItems(params: GetItemsParams): Promise<PaginatedItems>
  getRandomItem(type?: 'text' | 'meme'): Promise<IKfcItem | null>
  getItemById(id: string): Promise<IKfcItem | null>
  getStats(): Promise<Summary>
  searchItems(query: string, limit?: number): Promise<IKfcItem[]>
  getContributors(): Promise<Contributor[]>
  getTopContributors(limit?: number): Promise<Contributor[]>
}

// 数据库行类型 (snake_case)
export interface ItemRow {
  id: string
  title: string
  url: string
  body: string
  created_at: Date
  updated_at: Date
  author_username: string
  author_avatar_url: string
  author_url: string
  reactions_count: number
  moderation_status: string
  synced_at: Date
}

export interface AuthorRow {
  username: string
  avatar_url: string
  url: string
  item_count: number
  total_reactions: number
  v50_score: number
  updated_at: Date
}

export interface StatsRow {
  id: string
  total_items: number
  total_contributors: number
  top_contributors: Contributor[]
  monthly_stats: Record<string, number>
  updated_at: Date
}
