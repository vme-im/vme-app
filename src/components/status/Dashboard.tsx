'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'

interface RateLimitInfo {
  remaining: number
  limit: number
  resetTime: string
  percentage: number
  isNearLimit: boolean
}

interface SyncLogEntry {
  mode: string
  source: string
  items_synced: number
  started_at: string
  finished_at: string | null
  error: string | null
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
  syncLogs?: SyncLogEntry[]
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch status')
  return res.json()
}

function StatusCard({ title, status, children }: { title: string; status: 'success' | 'warning' | 'error' | 'info'; children: React.ReactNode }) {

  const statusColors = {

    success: 'bg-green-100',

    warning: 'bg-yellow-100',

    error: 'bg-red-100',

    info: 'bg-blue-100',

  }



  const iconColors = {

    success: 'text-green-800',

    warning: 'text-yellow-800',

    error: 'text-red-800',

    info: 'text-blue-800',

  }



  const icons = {

    success: 'fa-check-circle',

    warning: 'fa-exclamation-triangle',

    error: 'fa-times-circle',

    info: 'fa-info-circle',

  }



  return (

    <div className={`border-4 border-black p-6 shadow-neo-xl ${statusColors[status]}`}>

      <div className="mb-6 flex items-center gap-3 border-b-2 border-black pb-4">

        <i className={`fa ${icons[status]} ${iconColors[status]} text-2xl`}></i>

        <h3 className="text-xl font-black uppercase italic text-black">{title}</h3>

      </div>

      {children}

    </div>

  )

}



function RateLimitBar({ rateLimit }: { rateLimit: RateLimitInfo }) {

  const getStatusColor = () => {

    if (rateLimit.percentage > 50) return 'bg-green-500'

    if (rateLimit.percentage > 20) return 'bg-yellow-500'

    return 'bg-red-500'

  }



  return (

    <div className="space-y-3 font-bold text-black">

      <div className="flex justify-between text-sm uppercase">

        <span>API Requests Remaining</span>

        <span className="font-mono">{rateLimit.remaining} / {rateLimit.limit}</span>

      </div>

      <div className="h-4 w-full border-2 border-black bg-white p-0.5">

        <div

          className={`h-full ${getStatusColor()}`}

          style={{ width: `${rateLimit.percentage}%` }}

        ></div>

      </div>

      <div className="flex justify-between text-xs uppercase text-gray-700">

        <span>{rateLimit.percentage}% LEFT</span>

        <span>RESET: {new Date(rateLimit.resetTime).toLocaleTimeString()}</span>

      </div>

    </div>

  )

}

function SyncLogsTable({ logs }: { logs: SyncLogEntry[] }) {
  if (!logs || logs.length === 0) {
    return (
      <StatusCard title="Recent Sync History" status="info">
        <p className="font-bold text-gray-600">No sync records found.</p>
      </StatusCard>
    )
  }

  return (
    <StatusCard title="Recent Sync History" status="info">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm font-bold text-black text-neo">
          <thead>
            <tr className="border-b-2 border-black uppercase text-gray-600">
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Mode</th>
              <th className="px-2 py-2">Source</th>
              <th className="px-2 py-2 text-right">Items</th>
              <th className="px-2 py-2 text-right">Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={i} className="border-b border-gray-200 font-mono last:border-0 hover:bg-white">
                <td className="px-2 py-2">
                  {log.error ? (
                    <span className="cursor-help text-red-600" title={log.error}>❌ Fail</span>
                  ) : (
                    <span className="text-green-600">✅ OK</span>
                  )}
                </td>
                <td className="px-2 py-2">{log.mode}</td>
                <td className="max-w-[150px] truncate px-2 py-2" title={log.source}>{log.source}</td>
                <td className="px-2 py-2 text-right text-base">{log.items_synced}</td>
                <td className="px-2 py-2 text-right text-xs text-gray-600">
                  {new Date(log.started_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StatusCard>
  )
}



export default function StatusDashboard() {

  const { data: status, error, isLoading, mutate } = useSWR<SystemStatus>(

    '/api/status',

    fetcher,

    {

      refreshInterval: 30000, // 30秒自动刷新

      revalidateOnFocus: true,

    }

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

        <div className="animate-pulse border-4 border-black bg-gray-100 p-8 shadow-neo-xl">

          <div className="mb-4 h-8 w-1/3 bg-gray-300"></div>

          <div className="space-y-4">

            <div className="h-4 w-full bg-gray-300"></div>

            <div className="h-4 w-2/3 bg-gray-300"></div>

          </div>

        </div>

      </div>

    )

  }



  if (error) {

    return (

      <StatusCard title="System Check Failed" status="error">

        <p className="font-bold text-red-900">无法获取系统状态信息</p>

        <p className="mt-2 text-sm font-bold text-gray-700">{error.message}</p>

        <button

          onClick={() => mutate()}

          className="mt-4 border-2 border-black bg-red-600 px-6 py-2 font-black uppercase text-white shadow-neo transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none"

        >

          RETRY

        </button>

      </StatusCard>

    )

  }



  if (!status) return null



  return (

    <div className="space-y-8">

      {/* 刷新控制 */}

      <div className="flex items-center justify-between border-3 border-black bg-white p-4 shadow-neo">

        <div className="text-xs font-bold uppercase text-gray-600">

          Last Updated: {lastUpdated}

        </div>

        <button

          onClick={() => mutate()}

          disabled={isLoading}

          className="flex items-center gap-2 border-2 border-black bg-kfc-yellow px-4 py-2 font-black uppercase text-black shadow-neo transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none disabled:bg-gray-200 disabled:shadow-none"

        >

          <i className={`fa fa-refresh ${isLoading ? 'animate-spin' : ''}`}></i>

          Refresh Status

        </button>

      </div>



      {/* GitHub Token 状态 */}

      <div className="grid gap-6">

        {/* 用户 Token */}

        <StatusCard

          title="GitHub User Auth"

          status={

            status.github.userToken.available && status.github.userToken.status === 'working' ? 'success' :

              status.github.userToken.status === 'not_authenticated' ? 'info' :

                status.github.userToken.status === 'expired' || status.github.userToken.status === 'invalid_token' ? 'error' : 'info'

          }

        >

          {status.github.userToken.available && status.github.userToken.status === 'working' ? (

            <div className="text-green-900">

              <p className="mb-6 font-bold uppercase">✅ User Logged In & API Active</p>

              {status.github.userToken.rateLimit && (

                <RateLimitBar rateLimit={status.github.userToken.rateLimit} />

              )}

            </div>

          ) : status.github.userToken.status === 'not_authenticated' ? (

            <div className="text-blue-900">

              <p className="mb-2 font-bold uppercase">ℹ️ User Not Logged In</p>

              <p className="text-sm font-bold">Please login to access all features.</p>

            </div>

          ) : status.github.userToken.status === 'expired' || status.github.userToken.status === 'invalid_token' ? (

            <div className="text-red-900">

              <p className="mb-2 font-bold uppercase">❌ Auth Token Error</p>

              <div className="mt-4 border-2 border-red-800 bg-white p-4">

                <p className="mb-1 text-sm font-black uppercase">Error Details:</p>

                <p className="text-sm font-bold">{status.github.userToken.error}</p>

                <div className="mt-3 text-xs font-bold uppercase text-red-600">

                  💡 Action Required: Please re-login to refresh token

                </div>

              </div>

            </div>

          ) : (

            <div className="text-blue-900">

              <p className="mb-2 font-bold uppercase">ℹ️ Auth Unavailable</p>

              {status.github.userToken.error && (

                <p className="text-sm font-bold">{status.github.userToken.error}</p>

              )}

            </div>

          )}

        </StatusCard>

      </div>

      {/* Sync History */}
      {status.syncLogs && (
        <SyncLogsTable logs={status.syncLogs} />
      )}




    </div>

  )

}
