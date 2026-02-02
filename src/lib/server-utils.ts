// 服务端专用工具函数 - 包含 Node.js 模块，仅在服务端使用
import { IKfcItem, Summary } from '@/types'
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
    body: item.title
  }
}

// 检测内容是否为梗图 (包含 markdown 图片语法)
export function isMeme(body: string): boolean {
  return /!\[.*\]\(.*\)/.test(body)
}

// 提取图片 URL
export function extractImageUrl(body: string): string | null {
  const match = body.match(/!\[.*\]\((.*)\)/)
  return match ? match[1] : null
}

const provider = getDataProvider()

// 获取所有可用的月份文件
export async function getAvailableMonths(): Promise<string[]> {
  const summary = await provider.getStats()
  if (!summary || !summary.months) {
    return []
  }
  return summary.months.map(m => m.month)
}

// 按月获取数据 (兼容旧API，但实际上可能不再大量使用)
export async function getKfcItemsByMonth(month: string): Promise<IKfcItem[]> {
  // 由于 NeonProvider 没有按月获取的直接API，
  // 我们暂时通过获取大量数据然后在内存过滤来实现 (如果确实需要)
  // 或者我们可以简单的返回空数组，因为主要的分页逻辑已经改写
  // 为了安全起见，我们尝试获取该月的项目 (通过搜索或过滤)
  // 目前 DataProvider.getItems 不支持按月过滤，
  // 但考虑到 page.tsx 这里主要用于 getKfcItemsWithPagination (已重写)
  // 和 getAllKfcItems (已重写)
  // 所以这个函数可能主要用于 getRandomKfcItem 的旧逻辑
  // 我们在这里返回空数组或抛错可能不合适，尽量模拟

  // 暂时先不支持精确的按月获取，除非我们更新 DataProvider
  console.warn('getKfcItemsByMonth called but likely unused in new implementation')
  return []
}

// 获取汇总信息
export async function getSummary(): Promise<Summary> {
  return await provider.getStats()
}

// 获取所有KFC项目（不分页）- 服务端专用
// 注意：对于数据库模式，获取"所有"可能非常大，这里默认限制 1000 条
export async function getAllKfcItems(): Promise<IKfcItem[]> {
  const result = await provider.getItems({ limit: 1000 })
  return result.items
}

// 获取所有唯一贡献者数量
export async function getUniqueContributorsCount(): Promise<number> {
  const summary = await provider.getStats()
  return summary.totalContributors
}

// 获取所有贡献者信息
export async function getAllContributors() {
  return await provider.getContributors()
}

// 获取排行榜贡献者
export async function getTopContributors() {
  return await provider.getTopContributors()
}

// 获取分页数据
export async function getKfcItemsWithPagination(
  page = 1,
  pageSize = 20,
  type?: 'text' | 'meme'
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
    type
  })

  return {
    items: result.items,
    total: result.total,
    page: result.page,
    pageSize: result.limit,
    totalPages: result.totalPages
  }
}

// 获取随机项目
export async function getRandomKfcItem(type?: 'text' | 'meme'): Promise<IKfcItem> {
  const item = await provider.getRandomItem(type)
  if (!item) {
    // Fallback: fetch general items and pick one
    const { items } = await provider.getItems({ limit: 20, type })
    if (items.length > 0) {
      return items[Math.floor(Math.random() * items.length)]
    }
    throw new Error('No items found')
  }
  return item
}

// 获取包括ID在内的单个项目
export async function getItemById(id: string): Promise<IKfcItem | null> {
  return await provider.getItemById(id)
}

