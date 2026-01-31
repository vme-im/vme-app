// GitHub Issues 抓取模块
import { Octokit } from '@octokit/core'
import {
  RepoConfig,
  GitHubIssueNode,
  GitHubIssuePayload,
  ItemToSync,
  getSyncRepos,
} from './types'

// GraphQL 分页响应类型
interface IssuesResult {
  edges: { node: GitHubIssueNode; cursor: string }[]
  pageInfo: {
    hasNextPage: boolean
    endCursor: string | null
  }
}

// 创建 Octokit 实例
function getOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required')
  }
  return new Octokit({ auth: token })
}

/**
 * 使用 GraphQL 抓取指定仓库的 Issues (按标签过滤)
 */
async function fetchIssuesByLabels(
  owner: string,
  repo: string,
  labels: string[],
  afterCursor: string | null = null
): Promise<GitHubIssueNode[]> {
  const octokit = getOctokit()

  const query = `
    query ($owner: String!, $name: String!, $labels: [String!], $afterCursor: String) {
      repository(owner: $owner, name: $name) {
        issues(labels: $labels, first: 100, after: $afterCursor) {
          edges {
            node {
              id
              title
              url
              body
              createdAt
              updatedAt
              author {
                login
                avatarUrl
                url
              }
              labels(first: 10) {
                nodes {
                  name
                }
              }
            }
            cursor
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `

  const data = await octokit.graphql<{ repository: { issues: IssuesResult } }>(
    query,
    { owner, name: repo, labels, afterCursor }
  )

  const issues = data.repository.issues.edges.map((edge) => edge.node)
  const pageInfo = data.repository.issues.pageInfo

  // 递归获取下一页
  if (pageInfo.hasNextPage && pageInfo.endCursor) {
    const nextIssues = await fetchIssuesByLabels(
      owner,
      repo,
      labels,
      pageInfo.endCursor
    )
    return issues.concat(nextIssues)
  }

  return issues
}

/**
 * 抓取所有配置仓库的已审核通过 Issues
 */
export async function fetchAllApprovedIssues(): Promise<
  { issue: GitHubIssueNode; sourceRepo: string; typeLabels?: { meme?: string[]; text?: string[] } }[]
> {
  const repos = getSyncRepos()
  const allIssues: { issue: GitHubIssueNode; sourceRepo: string; typeLabels?: { meme?: string[]; text?: string[] } }[] = []

  for (const { owner, repo, labels, typeLabels } of repos) {
    console.log(`Fetching issues from ${owner}/${repo} with labels: ${labels.join(', ')}`)

    try {
      const issues = await fetchIssuesByLabels(owner, repo, labels)
      console.log(`Found ${issues.length} issues from ${owner}/${repo}`)

      for (const issue of issues) {
        allIssues.push({
          issue,
          sourceRepo: `${owner}/${repo}`,
          typeLabels,
        })
      }
    } catch (error) {
      console.error(`Failed to fetch from ${owner}/${repo}:`, error)
      throw error
    }
  }

  console.log(`Total issues fetched: ${allIssues.length}`)
  return allIssues
}

/**
 * 抓取单个仓库自某时间后更新的 Issues (增量同步)
 */
export async function fetchIssuesSinceForRepo(
  owner: string,
  repo: string,
  labels: string[],
  since: Date,
  typeLabels?: { meme?: string[]; text?: string[] }
): Promise<{ issue: GitHubIssueNode; sourceRepo: string; typeLabels?: { meme?: string[]; text?: string[] } }[]> {
  const octokit = getOctokit()
  const issues: { issue: GitHubIssueNode; sourceRepo: string; typeLabels?: { meme?: string[]; text?: string[] } }[] = []

  console.log(
    `Fetching issues from ${owner}/${repo} since ${since.toISOString()}`
  )

  try {
    const response = await octokit.request(
      'GET /repos/{owner}/{repo}/issues',
      {
        owner,
        repo,
        labels: labels.join(','),
        since: since.toISOString(),
        state: 'all',
        per_page: 100,
      }
    )

    for (const issue of response.data) {
      issues.push({
        issue: {
          id: issue.node_id,
          title: issue.title,
          url: issue.html_url,
          body: issue.body || '',
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          author: issue.user
            ? {
                login: issue.user.login,
                avatarUrl: issue.user.avatar_url,
                url: issue.user.html_url,
              }
            : null,
          labels: issue.labels
            ? {
                nodes: issue.labels.map((label: any) => ({
                  name: typeof label === 'string' ? label : label.name,
                })),
              }
            : undefined,
        },
        sourceRepo: `${owner}/${repo}`,
        typeLabels,
      })
    }

    console.log(
      `Found ${response.data.length} updated issues from ${owner}/${repo}`
    )
  } catch (error) {
    console.error(`Failed to fetch from ${owner}/${repo}:`, error)
    throw error
  }

  return issues
}

// 检测内容类型（优先使用标签配置）
function detectContentType(
  body: string,
  labelNames: string[],
  typeLabels?: { meme?: string[]; text?: string[] }
): 'text' | 'meme' {
  // 优先使用配置的类型标签判断
  if (typeLabels?.meme?.some(label => labelNames.includes(label))) {
    return 'meme'
  }
  if (typeLabels?.text?.some(label => labelNames.includes(label))) {
    return 'text'
  }

  // 回退：检测 markdown 图片语法
  return /!\[.*\]\(.*\)/.test(body) ? 'meme' : 'text'
}

/**
 * 将 GitHub Issue 转换为待同步的数据库格式
 */
export function issueToItemSync(
  issue: GitHubIssueNode,
  sourceRepo: string,
  typeLabels?: { meme?: string[]; text?: string[] }
): ItemToSync {
  const labelNames = issue.labels?.nodes.map(l => l.name) || []

  return {
    id: issue.id,
    title: issue.title,
    url: issue.url,
    body: issue.body,
    created_at: new Date(issue.createdAt),
    updated_at: new Date(issue.updatedAt),
    author_username: issue.author?.login || 'unknown',
    source_repo: sourceRepo,
    moderation_status: 'approved',
    content_type: detectContentType(issue.body, labelNames, typeLabels),
    tags: [],  // 后续由 LLM 审核时填充
  }
}

/**
 * 将 GitHub Actions Payload 转换为待同步的数据库格式
 */
export function payloadToItemSync(
  payload: GitHubIssuePayload,
  sourceRepo: string
): ItemToSync {
  const body = payload.body || ''
  return {
    id: payload.id,
    title: payload.title,
    url: payload.html_url,
    body: body,
    created_at: new Date(payload.created_at),
    updated_at: new Date(payload.updated_at),
    author_username: payload.user.login,
    source_repo: sourceRepo,
    moderation_status: 'approved',
    content_type: detectContentType(body),
    tags: [],  // 后续由 LLM 审核时填充
  }
}
