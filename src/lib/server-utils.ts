// 服务端专用工具函数 - 包含 Node.js 模块，仅在服务端使用
import { IKfcItem } from '@/types'
import { unstable_cache } from 'next/cache'
import { getDataProvider } from '@/lib/data-access'

/**
 * 处理段子数据，兼容 title 是正文的情况
 * 如果 body 为空，则使用 title 作为内容
 */
export function normalizeItemContent(item: IKfcItem): IKfcItem {
  // 如果 body 不为空，直接返回原数据
  if (item.body && item.body.trim() !== '') {
    return item
  }

  // body 为空，使用 title 作为内容
  return {
    ...item,
    body: item.title,
  }
}

// 提取图片 URL
export function extractImageUrl(body: string): string | null {
  const match = body.match(/!\[.*\]\((.*)\)/)
  return match ? match[1] : null
}

const provider = getDataProvider()

const getTopTagsCached = unstable_cache(
  async () => {
    return await provider.getTopTags(4)
  },
  ['top-tags'],
  { revalidate: 600 },
)

// 获取所有KFC项目（不分页）- 服务端专用
// 注意：对于数据库模式，获取"所有"可能非常大，这里默认限制 1000 条
export async function getAllKfcItems(): Promise<IKfcItem[]> {
  const result = await provider.getItems({ limit: 1000 })
  return result.items.map(normalizeItemContent)
}

// 获取所有唯一贡献者数量
export async function getUniqueContributorsCount(): Promise<number> {
  const summary = await provider.getStats()
  return summary.totalContributors
}

// 获取所有热门标签
export async function getTopTags() {
  return await getTopTagsCached()
}

// 获取分页数据
export async function getKfcItemsWithPagination(
  page = 1,
  pageSize = 20,
  type?: 'text' | 'meme',
  tag?: string,
): Promise<{
  items: IKfcItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}> {
  const result = await provider.getItems({
    page,
    limit: pageSize,
    type,
    tag,
  })

  return {
    items: result.items.map(normalizeItemContent),
    total: result.total,
    page: result.page,
    pageSize: result.limit,
    totalPages: result.totalPages,
  }
}

/**
 * 获取今日精选文案 - 确保返回不同作者的段子
 * 使用 SQL DISTINCT ON 在数据库层面去重
 * @param excludeId 要排除的段子ID（通常是 headlineJoke 的 ID）
 * @returns 3个不同作者的段子
 */
export async function getFeaturedJokes(excludeId?: string): Promise<IKfcItem[]> {
  const items = await provider.getFeaturedItems(3, excludeId)
  return items.map(normalizeItemContent)
}

// 获取随机项目
export async function getRandomKfcItem(type?: 'text' | 'meme'): Promise<IKfcItem> {
  const item = await provider.getRandomItem(type)
  if (item) {
    return normalizeItemContent(item)
  }

  // Fallback: fetch general items and pick one
  const { items } = await provider.getItems({ limit: 20, type })
  if (items.length > 0) {
    return normalizeItemContent(items[Math.floor(Math.random() * items.length)])
  }
  throw new Error('No items found')
}

// 获取包括ID在内的单个项目
export async function getItemById(id: string): Promise<IKfcItem | null> {
  const item = await provider.getItemById(id)
  return item ? normalizeItemContent(item) : null
}
