// 服务端专用工具函数 - 包含 Node.js 模块，仅在服务端使用
import fs from 'fs'
import path from 'path'
import { IKfcItem, Summary } from '@/types'

// 检测内容是否为梗图 (包含 markdown 图片语法)
export function isMeme(body: string): boolean {
  return /!\[.*\]\(.*\)/.test(body)
}

// 提取图片 URL
export function extractImageUrl(body: string): string | null {
  const match = body.match(/!\[.*\]\((.*)\)/)
  return match ? match[1] : null
}

const cache: {
  kfcItems: Record<string, IKfcItem[]>
  allMonths: string[]
  summary: Summary | null
} = {
  kfcItems: {},
  allMonths: [],
  summary: null,
}

// 获取所有可用的月份文件
export async function getAvailableMonths(): Promise<string[]> {
  if (cache.allMonths.length) {
    return cache.allMonths
  }

  // 从summary信息获取月份列表
  const summary = await getSummary()
  if (!summary || !summary.months || summary.months.length === 0) {
    throw new Error('无法获取月份信息：summary数据不可用')
  }

  const months = summary.months.map(
    (item: { month: string; count: number }) => item.month,
  )
  cache.allMonths = months
  return months
}

// 按月获取数据
export async function getKfcItemsByMonth(month: string): Promise<IKfcItem[]> {
  // 如果已缓存，则直接返回
  if (cache.kfcItems[month]) {
    return cache.kfcItems[month]
  }

  try {
    const filePath = path.resolve(process.cwd(), 'data', `${month}.json`)
    if (!fs.existsSync(filePath)) {
      return []
    }

    const data = await fs.promises.readFile(filePath, 'utf-8')
    const items = JSON.parse(data)

    // 按创建时间排序
    const sortedItems = items.sort((a: IKfcItem, b: IKfcItem) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    cache.kfcItems[month] = sortedItems
    return sortedItems
  } catch (error) {
    console.error(`Error reading data file for ${month}:`, error)
    return []
  }
}

// 获取汇总信息
export async function getSummary() {
  if (cache.summary) {
    return cache.summary
  }

  try {
    const filePath = path.resolve(process.cwd(), 'data', 'summary.json')
    if (!fs.existsSync(filePath)) {
      throw new Error('汇总数据文件不存在')
    }

    const data = await fs.promises.readFile(filePath, 'utf-8')
    const summary = JSON.parse(data)

    if (!summary.totalItems || !Array.isArray(summary.months)) {
      throw new Error('汇总数据格式不正确')
    }

    cache.summary = summary
    return summary
  } catch (error) {
    console.error('读取汇总数据失败:', error)
    throw new Error(
      `无法获取汇总信息: ${error instanceof Error ? error.message : '未知错误'}`,
    )
  }
}

// 获取所有KFC项目（不分页）- 服务端专用
export async function getAllKfcItems(): Promise<IKfcItem[]> {
  const months = await getAvailableMonths()
  let allItems: IKfcItem[] = []

  // 加载所有月份的数据
  for (const month of months) {
    const items = await getKfcItemsByMonth(month)
    allItems = [...allItems, ...items]
  }

  return allItems
}

// 获取所有唯一贡献者数量
export async function getUniqueContributorsCount(): Promise<number> {
  const summary = await getSummary()
  return summary.totalContributors
}

// 获取所有贡献者信息（不包含点赞等交互数据）
export async function getAllContributors() {
  const summary = await getSummary()
  return summary.contributors
}

// 获取排行榜贡献者（Top 10，不包含点赞等交互数据）
export async function getTopContributors() {
  const summary = await getSummary()
  return summary.topContributors
}

// 获取分页数据（使用汇总信息优化totalPages计算）
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
  const months = await getAvailableMonths()
  let allFilteredItems: IKfcItem[] = []

  // 获取汇总信息
  const summary = await getSummary()
  if (!summary) {
    throw new Error('无法获取分页信息：summary数据不可用')
  }

  // 加载月份数据并进行过滤
  // 因为过滤后总量不确定，我们需要加载足够的内容
  for (const month of months) {
    const items = await getKfcItemsByMonth(month)
    const filtered = type
      ? items.filter(item => type === 'meme' ? isMeme(item.body) : !isMeme(item.body))
      : items

    allFilteredItems = [...allFilteredItems, ...filtered]

    // 如果累积数据已经超过需要的范围，且不是为了计算总数，可以考虑优化
    // 但目前由于需要按时间排序且跨月，先全部加载或按需加载
  }

  // 计算分页结果
  const total = allFilteredItems.length
  const totalPages = Math.ceil(total / pageSize)
  const startIndex = (page - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, allFilteredItems.length)
  const paginatedItems = allFilteredItems.slice(startIndex, endIndex)

  return {
    items: paginatedItems,
    total,
    page,
    pageSize,
    totalPages,
  }
}

// 获取随机项目
export async function getRandomKfcItem(type?: 'text' | 'meme'): Promise<IKfcItem> {
  // 如果需要过滤类型，我们需要获取符合条件的所有项
  if (type) {
    const allItems = await getAllKfcItems()
    const filteredItems = allItems.filter(item =>
      type === 'meme' ? isMeme(item.body) : !isMeme(item.body)
    )

    if (!filteredItems.length) {
      throw new Error(`无法获取随机项目：没有符合类型 ${type} 的内容`)
    }

    return filteredItems[Math.floor(Math.random() * filteredItems.length)]
  }

  // 原有的高性能随机逻辑（基于summary分布）
  const summary = await getSummary()
  if (!summary || !summary.months || !summary.months.length) {
    throw new Error('无法获取随机项目：summary数据不可用')
  }

  const totalItems = summary.totalItems
  const randomIndex = Math.floor(Math.random() * totalItems)

  let cumulativeCount = 0
  let selectedMonth = summary.months[0].month

  for (const monthInfo of summary.months) {
    cumulativeCount += monthInfo.count
    if (randomIndex < cumulativeCount) {
      selectedMonth = monthInfo.month
      break
    }
  }

  const items = await getKfcItemsByMonth(selectedMonth)
  if (!items.length) {
    throw new Error(`无法获取随机项目：${selectedMonth}月数据为空`)
  }

  const randomItemIndex = Math.floor(Math.random() * items.length)
  return items[randomItemIndex]
}
