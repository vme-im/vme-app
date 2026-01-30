// GitHub Webhook 同步接口
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { analyzeContent } from '@/lib/sync/content-analyzer'
import { sync, getSyncRepos } from '@/lib/sync'
import type { GitHubIssuePayload } from '@/lib/sync'
import { hasModerationLabel, moderateIssue } from '@/lib/moderation'

export const runtime = 'nodejs'

function parseAllowedRepos(): Set<string> {
  const env = process.env.WEBHOOK_REPOS
  if (env) {
    try {
      const parsed = JSON.parse(env) as Array<string | { owner: string; name?: string; repo?: string }>
      const repos = parsed
        .map((item) => {
          if (typeof item === 'string') return item
          const repoName = item.name || item.repo
          return repoName ? `${item.owner}/${repoName}` : null
        })
        .filter((item): item is string => !!item)
      if (repos.length > 0) return new Set(repos)
    } catch {
      console.warn('Failed to parse WEBHOOK_REPOS, fallback to SYNC_REPOS')
    }
  }

  return new Set(getSyncRepos().map((repo) => `${repo.owner}/${repo.repo}`))
}

function verifySignature(rawBody: string, signatureHeader: string | null, secret: string | undefined): boolean {
  if (!secret) {
    return process.env.NODE_ENV === 'development'
  }
  if (process.env.NODE_ENV === 'development') {
    return true
  }
  if (!signatureHeader) return false

  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`
  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(signatureHeader)
  if (expectedBuffer.length !== receivedBuffer.length) return false
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
}

function getLabelNames(labels: unknown): string[] {
  if (!Array.isArray(labels)) return []
  return labels
    .map((label) => {
      if (typeof label === 'string') return label
      if (label && typeof label === 'object' && 'name' in label) {
        return String((label as { name?: string }).name || '')
      }
      return ''
    })
    .filter((name) => name.length > 0)
}

function detectContentTypeFromLabels(labelNames: string[], body: string): 'text' | 'meme' {
  if (labelNames.includes('梗图')) return 'meme'
  if (labelNames.includes('文案') || labelNames.includes('文案提供')) return 'text'
  return /!\[.*\]\(.*\)/.test(body) ? 'meme' : 'text'
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('X-Hub-Signature-256')
  const secret = process.env.WEBHOOK_SECRET

  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid signature' },
      { status: 401 }
    )
  }

  const event = request.headers.get('X-GitHub-Event')
  if (event !== 'issues') {
    return NextResponse.json({ ignored: true, reason: 'Unsupported event' })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch (error) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Invalid JSON payload' },
      { status: 400 }
    )
  }

  const action = payload?.action
  const issue = payload?.issue
  const repository = payload?.repository
  if (!issue || !repository) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Missing issue or repository' },
      { status: 400 }
    )
  }

  const repoFullName = repository?.full_name || `${repository?.owner?.login}/${repository?.name}`
  if (!repoFullName || !repository?.owner?.login || !repository?.name) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Invalid repository info' },
      { status: 400 }
    )
  }

  const allowedRepos = parseAllowedRepos()
  if (!allowedRepos.has(repoFullName)) {
    return NextResponse.json({ ignored: true, reason: 'Repository not allowed' })
  }

  const repoConfig = getSyncRepos().find(
    (config) => `${config.owner}/${config.repo}` === repoFullName
  )
  const allowedLabels = repoConfig?.labels?.length ? repoConfig.labels : ['收录']

  const labelName = typeof payload?.label?.name === 'string' ? payload.label.name : ''
  const labelNames = getLabelNames(issue.labels)

  const isModerationTrigger =
    action === 'labeled' && (labelName === '文案' || labelName === '梗图')

  if (isModerationTrigger) {
    if (issue.pull_request) {
      return NextResponse.json({ ignored: true, reason: 'Pull request ignored' })
    }

    if (hasModerationLabel(labelNames)) {
      return NextResponse.json({ ignored: true, reason: 'Already moderated' })
    }

    const moderationResult = await moderateIssue({
      owner: repository.owner.login,
      repo: repository.name,
      issueNumber: issue.number,
      issueBody: issue.body || '',
      currentIssueId: issue.node_id,
    })

    return NextResponse.json(moderationResult, {
      status: moderationResult.type === 'pending' ? 200 : 200,
    })
  }

  const hasAllowedLabel = labelNames.some((name) => allowedLabels.includes(name))
  const isTriggered =
    (action === 'labeled' && labelName.length > 0 && allowedLabels.includes(labelName)) ||
    ((action === 'edited' || action === 'closed') && hasAllowedLabel)

  if (!isTriggered) {
    return NextResponse.json({ ignored: true, reason: 'Action or label not matched' })
  }

  const issuePayload: GitHubIssuePayload = {
    id: issue.node_id,
    number: issue.number,
    title: issue.title,
    body: issue.body ?? '',
    user: {
      login: issue.user?.login || 'unknown',
      avatar_url: issue.user?.avatar_url || '',
      html_url: issue.user?.html_url || '',
    },
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    html_url: issue.html_url,
  }

  const contentType = detectContentTypeFromLabels(labelNames, issuePayload.body || '')
  const tags = await analyzeContent({
    title: issuePayload.title,
    body: issuePayload.body,
  })

  const result = await sync({
    mode: 'single',
    issue: issuePayload,
    repo: { owner: repository.owner.login, name: repository.name },
    content_type: contentType,
    tags,
  })

  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  })
}
