// 同步 API 路由
import { NextRequest, NextResponse } from 'next/server'
import { analyzeContent } from '@/lib/sync/content-analyzer'
import { sync, SyncRequest } from '@/lib/sync'

/**
 * 验证请求鉴权
 */
function authenticate(request: NextRequest): { valid: boolean; source: string } {
  // 1. Vercel Cron 鉴权
  const authHeader = request.headers.get('Authorization')
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return { valid: true, source: 'vercel-cron' }
  }

  // 2. API Key 鉴权 (GitHub Actions / 手动调用)
  const apiKey = request.headers.get('X-API-Key')
  if (apiKey && apiKey === process.env.SYNC_API_KEY) {
    return { valid: true, source: 'api-key' }
  }

  // 3. 本地开发环境跳过鉴权
  if (process.env.NODE_ENV === 'development') {
    return { valid: true, source: 'dev-mode' }
  }

  return { valid: false, source: 'unauthorized' }
}

/**
 * POST /api/sync
 *
 * 请求体:
 * - mode: 'single' | 'incremental' | 'full'
 * - issue?: GitHubIssuePayload (single 模式需要)
 * - repo?: { owner: string; name: string } (single 模式需要)
 * - since?: string (incremental 模式可选)
 */
export async function POST(request: NextRequest) {
  // 鉴权
  const auth = authenticate(request)
  if (!auth.valid) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid or missing authentication' },
      { status: 401 }
    )
  }

  console.log(`Sync request from: ${auth.source}`)

  try {
    // 解析请求体
    let body: SyncRequest

    // Vercel Cron 请求可能没有 body，默认 incremental
    const contentType = request.headers.get('Content-Type')
    if (contentType?.includes('application/json')) {
      body = await request.json()
    } else {
      body = { mode: 'incremental' }
    }

    // 验证请求
    if (!body.mode) {
      body.mode = 'incremental'
    }

    if (body.mode === 'single' && (!body.issue || !body.repo)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Single mode requires issue and repo' },
        { status: 400 }
      )
    }

    if (body.mode === 'single' && body.issue) {
      const issueBody = body.issue.body || ''
      if (!body.content_type) {
        body.content_type = /!\[.*?\]\(https?:\/\/[^\s)]+\)/.test(issueBody)
          ? 'meme'
          : 'text'
      }

      if (body.tags === undefined) {
        body.tags = await analyzeContent({
          title: body.issue.title,
          body: issueBody,
        })
      }
    }

    // 执行同步
    const result = await sync(body)

    // 返回结果
    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    })
  } catch (error) {
    console.error('Sync API error:', error)

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/sync
 *
 * 健康检查 / 状态查询
 */
export async function GET(request: NextRequest) {
  const auth = authenticate(request)
  if (!auth.valid) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Sync API is ready',
    source: auth.source,
    timestamp: new Date().toISOString(),
  })
}
