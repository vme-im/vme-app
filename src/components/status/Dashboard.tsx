'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import Icon, { IconName } from '@/components/shared/Icon'

interface RateLimitInfo {
  remaining: number
  limit: number
  resetTime: string
  percentage: number
  isNearLimit: boolean
}

interface SystemStatus {
  timestamp: string
  github: {
    userToken: {
      available: boolean
      status: string
      rateLimit: RateLimitInfo | null
      error: string | null
    }
  }
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch status')
  return res.json()
}

/**
 * 状态卡片：简洁卡片（白底 + 黑边 + neo 阴影）
 * 健康状态只靠图标用色区分：正常/提示 = 黑，异常 = kfc-red
 */
function StatusCard({
  title,
  status,
  children,
}: {
  title: string
  status: 'success' | 'warning' | 'error' | 'info'
  children: React.ReactNode
}) {
  const iconColors = {
    success: 'text-kfc-black',
    warning: 'text-kfc-red',
    error: 'text-kfc-red',
    info: 'text-news-gray',
  }

  const icons: Record<typeof status, IconName> = {
    success: 'check-circle',
    warning: 'alert-triangle',
    error: 'x-circle',
    info: 'info',
  }

  return (
    <div className="shadow-neo border-3 border-black bg-white p-6">
      <div className="border-news-rule mb-5 flex items-center gap-3 border-b pb-3">
        <Icon name={icons[status]} className={`${iconColors[status]} text-xl`} />
        <h3 className="text-lg font-black text-black">{title}</h3>
      </div>

      {children}
    </div>
  )
}

function RateLimitBar({ rateLimit }: { rateLimit: RateLimitInfo }) {
  // 余量健康 = 黑，逼近限额 = kfc-red
  const barColor = rateLimit.percentage > 20 ? 'bg-kfc-black' : 'bg-kfc-red'

  return (
    <div className="space-y-3 font-bold text-black">
      <div className="flex justify-between text-sm">
        <span>API 剩余请求数</span>
        <span className="font-display">
          {rateLimit.remaining} / {rateLimit.limit}
        </span>
      </div>

      <div className="h-4 w-full border-2 border-black bg-white p-0.5">
        <div className={`h-full ${barColor}`} style={{ width: `${rateLimit.percentage}%` }}></div>
      </div>

      <div className="text-news-gray flex justify-between text-xs">
        <span>余量 {rateLimit.percentage}%</span>
        <span>重置时间 {new Date(rateLimit.resetTime).toLocaleTimeString()}</span>
      </div>
    </div>
  )
}

export default function StatusDashboard() {
  const {
    data: status,
    error,
    isLoading,
    mutate,
  } = useSWR<SystemStatus>(
    '/api/status',

    fetcher,

    {
      refreshInterval: 30000, // 30秒自动刷新

      revalidateOnFocus: true,
    },
  )

  const [lastUpdated, setLastUpdated] = useState<string>('')

  useEffect(() => {
    if (status?.timestamp) {
      setLastUpdated(new Date(status.timestamp).toLocaleString())
    }
  }, [status?.timestamp])

  if (isLoading && !status) {
    return (
      <div className="grid gap-6">
        <div className="shadow-neo bg-kfc-cream animate-pulse border-3 border-black p-8">
          <div className="bg-news-rule mb-4 h-8 w-1/3"></div>

          <div className="space-y-4">
            <div className="bg-news-rule h-4 w-full"></div>

            <div className="bg-news-rule h-4 w-2/3"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <StatusCard title="状态检查失败" status="error">
        <p className="text-kfc-red font-bold">无法获取系统状态信息</p>

        <p className="text-news-gray mt-2 text-sm font-bold">{error.message}</p>

        <button
          onClick={() => mutate()}
          className="bg-kfc-red shadow-neo hover:shadow-neo-lg mt-4 inline-flex min-h-[44px] items-center border-2 border-black px-6 py-2 font-black text-white transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 md:min-h-0"
        >
          再试一次
        </button>
      </StatusCard>
    )
  }

  if (!status) return null

  return (
    <div className="space-y-8">
      {/* 刷新控制 */}

      <div className="border-news-rule flex flex-wrap items-center justify-between gap-3 border-y py-3">
        <div className="text-news-gray text-xs font-bold">最近更新：{lastUpdated}</div>

        <button
          onClick={() => mutate()}
          disabled={isLoading}
          className="shadow-neo-sm hover:shadow-neo disabled:bg-kfc-cream disabled:text-news-gray flex min-h-[44px] items-center gap-2 border-2 border-black bg-white px-4 py-2 text-sm font-black text-black transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-none md:min-h-0"
        >
          <Icon name="refresh" className={isLoading ? 'animate-spin' : ''} />
          刷新状态
        </button>
      </div>

      {/* GitHub Token 状态 */}

      <div className="grid gap-6">
        {/* 用户 Token */}

        <StatusCard
          title="GitHub 用户凭证"
          status={
            status.github.userToken.available && status.github.userToken.status === 'working'
              ? 'success'
              : status.github.userToken.status === 'not_authenticated'
                ? 'info'
                : status.github.userToken.status === 'expired' ||
                    status.github.userToken.status === 'invalid_token'
                  ? 'error'
                  : 'info'
          }
        >
          {status.github.userToken.available && status.github.userToken.status === 'working' ? (
            <div className="text-black">
              <p className="mb-6 font-bold">已登录，API 正常工作</p>

              {status.github.userToken.rateLimit && (
                <RateLimitBar rateLimit={status.github.userToken.rateLimit} />
              )}
            </div>
          ) : status.github.userToken.status === 'not_authenticated' ? (
            <div className="text-black">
              <p className="mb-2 font-bold">当前未登录</p>

              <p className="text-news-gray text-sm font-bold">登录后，点表情和交文案都解锁。</p>
            </div>
          ) : status.github.userToken.status === 'expired' ||
            status.github.userToken.status === 'invalid_token' ? (
            <div className="text-kfc-red">
              <p className="mb-2 font-bold">登录凭证异常</p>

              <div className="border-kfc-red mt-4 border-2 bg-white p-4">
                <p className="mb-1 text-sm font-black text-black">错误详情</p>

                <p className="text-news-gray text-sm font-bold">{status.github.userToken.error}</p>

                <div className="text-kfc-red mt-3 text-xs font-bold">重新登录刷新一下凭证</div>
              </div>
            </div>
          ) : (
            <div className="text-black">
              <p className="mb-2 font-bold">凭证状态未知</p>

              {status.github.userToken.error && (
                <p className="text-news-gray text-sm font-bold">{status.github.userToken.error}</p>
              )}
            </div>
          )}
        </StatusCard>
      </div>
    </div>
  )
}
