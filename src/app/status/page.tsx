import { Suspense } from 'react'
import StatusDashboard from '@/components/status/Dashboard'
import NeoButton from '@/components/shared/NeoButton'
import Icon from '@/components/shared/Icon'
import SectionTitle from '@/components/shared/SectionTitle'

export default function StatusPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页头：统一贴纸标题 + 大黑体 h1 + 粗黑底线 */}
      <div className="mb-8 border-b-4 border-black pb-4">
        <SectionTitle label="后厨监控" />
        <h1 className="mt-3 text-2xl font-black tracking-tight text-black md:text-3xl">系统状态</h1>
        <p className="text-news-gray mt-1 text-sm">GitHub API 限流状态、环境配置和系统健康度检查</p>
      </div>

      {/* 状态仪表板 */}
      <Suspense
        fallback={
          <div className="border-news-rule flex h-40 items-center justify-center border-y">
            <div className="text-news-gray flex flex-col items-center gap-3">
              <Icon name="spinner" className="animate-spin text-2xl" />
              <span className="text-sm font-bold">检查系统状态中...</span>
            </div>
          </div>
        }
      >
        <StatusDashboard />
      </Suspense>

      {/* 返回首页 */}
      <div className="mt-12 text-center">
        <NeoButton href="/" variant="secondary" icon="home">
          返回首页
        </NeoButton>
      </div>
    </div>
  )
}
