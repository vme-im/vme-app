// 数据访问层入口
import { NeonProvider } from './neon-provider'
import { SnapshotProvider } from './snapshot-provider'
import { DataProvider } from './types'

export * from './types'
export { NeonProvider } from './neon-provider'
export { SnapshotProvider } from './snapshot-provider'

// 创建数据提供者实例
// Phase B：默认读快照（去库，不依赖 DATABASE_URL）；DATA_PROVIDER=neon 可回退到 Neon。
// 确定性回滚以 git revert 本提交为准（不依赖运行时 env 访问）。
function createDataProvider(): DataProvider {
  if (process.env.DATA_PROVIDER === 'neon') {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required (DATA_PROVIDER=neon)')
    }
    return new NeonProvider(databaseUrl)
  }
  return new SnapshotProvider()
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
