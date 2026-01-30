// 数据访问层入口
import { NeonProvider } from './neon-provider'
import { DataProvider } from './types'

export * from './types'
export { NeonProvider } from './neon-provider'

// 创建数据提供者实例
function createDataProvider(): DataProvider {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  return new NeonProvider(databaseUrl)
}

// 单例模式导出
let _dataProvider: DataProvider | null = null

export function getDataProvider(): DataProvider {
  if (!_dataProvider) {
    _dataProvider = createDataProvider()
  }
  return _dataProvider
}

// 便捷导出
export const dataProvider = {
  get instance(): DataProvider {
    return getDataProvider()
  },
}
