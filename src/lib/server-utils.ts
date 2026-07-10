// 服务端专用工具函数 - 包含 Node.js 模块，仅在服务端使用
import { Contributor, IKfcItem } from '@/types'
import { unstable_cache } from 'next/cache'
import { getDataProvider } from '@/lib/data-access'

/**
 * 处理文案数据，兼容 title 是正文的情况
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

// 全量文案（限制 1000 条）缓存：被排行榜与 /api/items 复用，
// 避免每次请求都拉一遍 1000 行
const getAllKfcItemsCached = unstable_cache(
  async () => {
    const result = await provider.getItems({ limit: 1000 })
    return result.items.map(normalizeItemContent)
  },
  ['all-kfc-items'],
  { revalidate: 600 },
)

// 获取所有KFC项目（不分页）- 服务端专用
// 注意：对于数据库模式，获取"所有"可能非常大，这里默认限制 1000 条
export async function getAllKfcItems(): Promise<IKfcItem[]> {
  return await getAllKfcItemsCached()
}

// 轻量贡献者计数缓存：单条 COUNT(DISTINCT)，1 小时刷新一次。
// 此前走 getStats()（5 次全表聚合），且被 layout.tsx 在每个页面调用。
const getContributorsCountCached = unstable_cache(
  async () => provider.getContributorsCount(),
  ['contributors-count'],
  { revalidate: 3600 },
)

// 获取所有唯一贡献者数量
// 远端快照不可用时（raw.githubusercontent 抖动 / vme-content 临时 404）降级返回 0，
// 因本函数被根布局 layout.tsx 调用，抛错会导致整站 500。
export async function getUniqueContributorsCount(): Promise<number> {
  try {
    return await getContributorsCountCached()
  } catch {
    return 0
  }
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
  author?: string,
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
    author,
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
 * 获取今日精选文案 - 确保返回不同作者的文案
 * 使用 SQL DISTINCT ON 在数据库层面去重
 * @param excludeId 要排除的文案ID（通常是 headlineJoke 的 ID）
 * @returns 3个不同作者的文案
 */
const getFeaturedJokesCached = unstable_cache(
  async (excludeId?: string) => {
    const items = await provider.getFeaturedItems(3, excludeId)
    return items.map(normalizeItemContent)
  },
  ['featured-jokes'],
  { revalidate: 600 },
)

export async function getFeaturedJokes(excludeId?: string): Promise<IKfcItem[]> {
  return await getFeaturedJokesCached(excludeId ?? '')
}

// 随机候选池缓存：DB 至多每个刷新窗口拉一次池子，
// 随机性在内存里完成，不再每个请求都打一次 ORDER BY RANDOM()
const getRandomPoolCached = unstable_cache(
  async (type?: 'text' | 'meme') => {
    const { items } = await provider.getItems({ limit: 50, type })
    return items.map(normalizeItemContent)
  },
  ['random-pool'],
  { revalidate: 300 },
)

// 获取随机项目
export async function getRandomKfcItem(type?: 'text' | 'meme'): Promise<IKfcItem> {
  const pool = await getRandomPoolCached(type)
  if (pool.length > 0) {
    return pool[Math.floor(Math.random() * pool.length)]
  }
  throw new Error('No items found')
}

// 获取包括ID在内的单个项目
export async function getItemById(id: string): Promise<IKfcItem | null> {
  const item = await provider.getItemById(id)
  return item ? normalizeItemContent(item) : null
}

// 最新收录缓存：首页「简讯栏」用，按创建时间倒序取前 N 条
const getLatestKfcItemsCached = unstable_cache(
  async (limit: number) => {
    const { items } = await provider.getItems({ limit, sortBy: 'createdAt', order: 'desc' })
    return items.map(normalizeItemContent)
  },
  ['latest-kfc-items'],
  { revalidate: 600 },
)

// 获取最新收录的文案（简讯栏）
export async function getLatestKfcItems(limit = 8): Promise<IKfcItem[]> {
  return await getLatestKfcItemsCached(limit)
}

// 读者票选缓存：首页「排行栏」用，按 reactions 倒序取前 N 条
const getTopReactedKfcItemsCached = unstable_cache(
  async (limit: number) => {
    const { items } = await provider.getItems({ limit, sortBy: 'reactions', order: 'desc' })
    return items.map(normalizeItemContent)
  },
  ['top-reacted-kfc-items'],
  { revalidate: 600 },
)

// 获取历史 reactions 最高的文案（读者票选）
export async function getTopReactedKfcItems(limit = 5): Promise<IKfcItem[]> {
  return await getTopReactedKfcItemsCached(limit)
}

// 记者团缓存：首页「本报记者团」条用，投稿数最高的前 N 位文案鬼才
const getTopContributorsCached = unstable_cache(
  async (limit: number) => provider.getTopContributors(limit),
  ['top-contributors'],
  { revalidate: 3600 },
)

// 获取投稿数最高的文案鬼才（记者团条）
export async function getTopContributors(limit = 8): Promise<Contributor[]> {
  return await getTopContributorsCached(limit)
}
