// 数据访问层入口
import { NeonProvider } from './neon-provider'
import { SnapshotProvider } from './snapshot-provider'
import { SqlSnapshotProvider } from './sql-snapshot-provider'
import { DataProvider } from './types'

export * from './types'
export { NeonProvider } from './neon-provider'
export { SnapshotProvider } from './snapshot-provider'
export { SqlSnapshotProvider } from './sql-snapshot-provider'

// 创建数据提供者实例
// 默认走 SqlSnapshotProvider（sql.js 装载 vme-content/data/snapshot.sql，
// 兑现 architecture §5「无正文索引 + 正文按需」）。降级梯队：
// - DATA_PROVIDER=snapshot  → SnapshotProvider（拉 month JSON，去库 Phase B 路径）
// - DATA_PROVIDER=neon      → NeonProvider（应急回退；Phase C 后非默认）
// 确定性回滚仍以 git revert 为准。
function createDataProvider(): DataProvider {
  const choice = process.env.DATA_PROVIDER
  if (choice === 'neon') {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required (DATA_PROVIDER=neon)')
    }
    return new NeonProvider(databaseUrl)
  }
  if (choice === 'snapshot') {
    return new SnapshotProvider()
  }
  return new SqlSnapshotProvider()
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
