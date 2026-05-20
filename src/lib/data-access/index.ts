// 数据访问层入口
// 2026-05-20 起 SqlSnapshotProvider 是唯一读模型：装载 vme-content/data/snapshot.sql
// （sql.js + 5min TTL），summary 与 tag 全部从 SQL 现算。Neon + JSON 月份 / summary 已退役。
// 兜底：远端 fetch 失败时 provider 自身回退上次 good model 或空 db，不整站 500。
import { SqlSnapshotProvider } from './sql-snapshot-provider'
import { DataProvider } from './types'

export * from './types'
export { SqlSnapshotProvider } from './sql-snapshot-provider'

let _dataProvider: DataProvider | null = null

export function getDataProvider(): DataProvider {
  if (!_dataProvider) {
    _dataProvider = new SqlSnapshotProvider()
  }
  return _dataProvider
}

export const dataProvider = {
  get instance(): DataProvider {
    return getDataProvider()
  },
}
