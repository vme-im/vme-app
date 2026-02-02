/**
 * GitHub 操作服务层 - 统一管理所有 GitHub API 操作
 * 设计原则：
 * 1. 单一职责：只负责 GitHub API 交互
 * 2. 业务聚合：按功能模块组织方法
 * 3. 错误统一：标准化错误处理
 * 4. 权限灵活：支持用户和系统 token
 * 5. 限流智能：自动检测并提示用户登录
 */

import { Octokit } from '@octokit/core'
import { getServerSession } from 'next-auth/next'
import { getToken } from 'next-auth/jwt'
import { authOptions } from '@/lib/auth'
import { ReactionGroup, ReactionNode, GitHubReaction as ReactionType } from '@/types'

// === 类型定义 ===

export interface GitHubIssueStats {
  id: string
  reactions: number
  reactionDetails: ReactionGroup[]
  reactionNodes: ReactionNode[]
}

export interface GitHubIssue {
  number: number
  html_url: string
  id: string
}

export interface UploadImageResult {
  url: string
  path: string
}

// === 限流管理 ===
export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
  used: number
  resource: string
}

export interface RateLimitStatus {
  core: RateLimitInfo
  search: RateLimitInfo
  graphql: RateLimitInfo
  isNearLimit: boolean
}

// === 错误类型 ===
export class GitHubServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
    public readonly originalError?: any,
    public readonly rateLimitInfo?: RateLimitStatus
  ) {
    super(message)
    this.name = 'GitHubServiceError'
  }
}

/**
 * 限流管理器 - 跟踪用户token的 API 限流状态
 */
class RateLimitManager {
  private static cache: { data: RateLimitStatus; timestamp: number } | null = null
  private static readonly CACHE_TTL = 60 * 1000 // 1分钟缓存
  private static readonly WARNING_THRESHOLD = 0.1 // 剩余10%时警告

  /**
   * 检查缓存的限流状态
   */
  static getCachedRateLimit(): RateLimitStatus | null {
    if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_TTL) {
      return this.cache.data
    }
    return null
  }

  /**
   * 缓存限流状态
   */
  static setCachedRateLimit(status: RateLimitStatus): void {
    this.cache = {
      data: status,
      timestamp: Date.now()
    }
  }

  /**
   * 分析限流状态
   */
  static analyzeRateLimit(rateLimitData: any): RateLimitStatus {
    const core = rateLimitData.core || rateLimitData.rate
    const search = rateLimitData.search
    const graphql = rateLimitData.graphql

    // 计算最严格的剩余比例
    const coreRatio = core ? core.remaining / core.limit : 1
    const graphqlRatio = graphql ? graphql.remaining / graphql.limit : 1
    const minRatio = Math.min(coreRatio, graphqlRatio)

    const isNearLimit = minRatio <= this.WARNING_THRESHOLD

    const status: RateLimitStatus = {
      core: core ? {
        limit: core.limit,
        remaining: core.remaining,
        reset: core.reset,
        used: core.used || (core.limit - core.remaining),
        resource: 'core'
      } : { limit: 0, remaining: 0, reset: 0, used: 0, resource: 'core' },

      search: search ? {
        limit: search.limit,
        remaining: search.remaining,
        reset: search.reset,
        used: search.used || (search.limit - search.remaining),
        resource: 'search'
      } : { limit: 0, remaining: 0, reset: 0, used: 0, resource: 'search' },

      graphql: graphql ? {
        limit: graphql.limit,
        remaining: graphql.remaining,
        reset: graphql.reset,
        used: graphql.used || (graphql.limit - graphql.remaining),
        resource: 'graphql'
      } : { limit: 0, remaining: 0, reset: 0, used: 0, resource: 'graphql' },

      isNearLimit
    }

    // 缓存状态
    this.setCachedRateLimit(status)

    return status
  }
}

/**
 * GitHub 服务类 - 业务导向的 API 封装
 */
export class GitHubService {
  private octokit: Octokit
  private readonly repoOwner = 'vme-im'
  private readonly repoName = 'vme-app'

  constructor(octokit: Octokit) {
    this.octokit = octokit
  }

  // === 静态工厂方法 ===

  /**
   * 创建使用用户 token 的服务实例
   */
  static async createWithUserToken(request: Request): Promise<GitHubService> {
    const session = await getServerSession(authOptions)

    if (!session?.user?.username) {
      throw new GitHubServiceError('用户未认证', 'NOT_AUTHENTICATED', 401)
    }

    const secret = process.env.NEXTAUTH_SECRET
    const token = await getToken({ req: request as any, secret })
    const accessToken = token?.accessToken as string

    if (!accessToken) {
      throw new GitHubServiceError('认证信息无效', 'INVALID_TOKEN', 401)
    }

    return new GitHubService(new Octokit({
      auth: accessToken,
    }))
  }

  // === 限流检查方法 ===

  /**
   * 检查当前的限流状态
   */
  async checkRateLimit(): Promise<RateLimitStatus> {
    // 优先返回缓存的状态
    const cached = RateLimitManager.getCachedRateLimit()
    if (cached) {
      return cached
    }

    try {
      // 获取实时限流信息
      const response = await this.octokit.request('GET /rate_limit')
      return RateLimitManager.analyzeRateLimit(response.data.resources)
    } catch (error) {
      console.warn('Failed to fetch rate limit info:', error)
      // 返回保守的默认状态
      return {
        core: { limit: 0, remaining: 0, reset: 0, used: 0, resource: 'core' },
        search: { limit: 0, remaining: 0, reset: 0, used: 0, resource: 'search' },
        graphql: { limit: 0, remaining: 0, reset: 0, used: 0, resource: 'graphql' },
        isNearLimit: true
      }
    }
  }

  /**
   * 在执行操作前检查限流状态
   */
  private async validateRateLimit(): Promise<void> {
    const rateLimit = await this.checkRateLimit()

    if (rateLimit.isNearLimit) {
      console.warn('API 限流警告: 用户 token 接近限制', rateLimit)
    }
  }

  // === Issue 管理模块 ===

  /**
   * 创建文案 Issue
   */
  async createJokeIssue(title: string, content: string, labels: string[] = ['文案']): Promise<GitHubIssue> {
    await this.validateRateLimit()

    try {
      const response = await this.octokit.request('POST /repos/{owner}/{repo}/issues', {
        owner: this.repoOwner,
        repo: this.repoName,
        title: title.trim(),
        body: content.trim(),
        labels: labels,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      })

      return {
        number: response.data.number,
        html_url: response.data.html_url,
        id: response.data.node_id,
      }
    } catch (error: any) {
      throw this.handleError(error, '创建段子 Issue 失败')
    }
  }

  /**
   * 上传图片到 assets 分支
   */
  async uploadImageToAssets(path: string, contentBase64: string): Promise<UploadImageResult> {
    await this.validateRateLimit()

    const rawUrl = `https://raw.githubusercontent.com/${this.repoOwner}/${this.repoName}/assets/${path}`

    try {
      await this.octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
        owner: this.repoOwner,
        repo: this.repoName,
        path,
        message: `upload image ${path}`,
        content: contentBase64,
        branch: 'assets',
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      })

      return { url: rawUrl, path }
    } catch (error: any) {
      // 如果已存在，尝试直接返回现有文件
      if (error?.status === 422) {
        try {
          const existing = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: this.repoOwner,
            repo: this.repoName,
            path,
            ref: 'assets',
            headers: {
              'X-GitHub-Api-Version': '2022-11-28'
            }
          })

          const downloadUrl = (existing.data as any)?.download_url
          return { url: downloadUrl || rawUrl, path }
        } catch (innerError: any) {
          throw this.handleError(innerError, '检查现有图片失败')
        }
      }

      throw this.handleError(error, '上传图片失败')
    }
  }

  /**
   * 验证 Issue 是否存在
   */
  async validateIssue(issueId: string): Promise<boolean> {
    await this.validateRateLimit()

    try {
      const query = `
        query GetIssue($id: ID!) {
          node(id: $id) {
            ... on Issue {
              id
            }
          }
        }
      `

      const response = await this.octokit.graphql<{
        node: { id: string } | null
      }>(query, { id: issueId })

      return !!response.node
    } catch (error: any) {
      return false
    }
  }

  // === 反应管理模块 ===

  /**
   * 添加反应
   */
  async addReaction(issueId: string, reaction: ReactionType): Promise<string> {
    await this.validateRateLimit()

    try {
      const mutation = `
        mutation AddReaction($input: AddReactionInput!) {
          addReaction(input: $input) {
            reaction {
              id
              content
            }
            subject {
              id
            }
          }
        }
      `

      const response = await this.octokit.graphql<{
        addReaction: {
          reaction: { id: string; content: string }
        }
      }>(mutation, {
        input: {
          subjectId: issueId,
          content: reaction,
        },
      })

      return response.addReaction.reaction.id
    } catch (error: any) {
      throw this.handleError(error, '添加反应失败')
    }
  }

  /**
   * 删除反应
   */
  async removeReaction(issueId: string, reaction: ReactionType, userLogin: string): Promise<void> {
    await this.validateRateLimit()

    try {
      // 先获取用户的反应
      const userReactionId = await this.getUserReactionId(issueId, reaction, userLogin)

      if (!userReactionId) {
        throw new GitHubServiceError('未找到反应', 'REACTION_NOT_FOUND', 404)
      }

      const mutation = `
        mutation RemoveReaction($input: RemoveReactionInput!) {
          removeReaction(input: $input) {
            subject {
              id
            }
          }
        }
      `

      await this.octokit.graphql(mutation, {
        input: {
          subjectId: issueId,
          content: reaction,
        },
      })
    } catch (error: any) {
      throw this.handleError(error, '移除反应失败')
    }
  }

  /**
   * 获取用户特定反应的 ID
   */
  private async getUserReactionId(issueId: string, reaction: ReactionType, userLogin: string): Promise<string | null> {
    const query = `
      query GetIssueReactions($id: ID!) {
        node(id: $id) {
          ... on Issue {
            reactions(first: 100) {
              nodes {
                id
                content
                user {
                  login
                }
              }
            }
          }
        }
      }
    `

    const response = await this.octokit.graphql<{
      node: {
        reactions: {
          nodes: ReactionNode[]
        }
      } | null
    }>(query, { id: issueId })

    if (!response.node) return null

    const userReaction = response.node.reactions.nodes.find(
      r => r.user.login === userLogin && r.content === reaction
    )

    return userReaction?.id || null
  }

  // === 统计数据模块 ===

  /**
   * 获取单个 Issue 统计数据
   */
  async getIssueStats(issueId: string): Promise<GitHubIssueStats> {
    await this.validateRateLimit()

    try {
      const query = `
        query GetIssueStats($issueId: ID!) {
          node(id: $issueId) {
            ... on Issue {
              id
              reactions(first: 100) {
                totalCount
                nodes {
                  id
                  content
                  user {
                    login
                  }
                }
              }
              reactionGroups {
                content
                users {
                  totalCount
                }
              }
            }
          }
        }
      `

      const response = await this.octokit.graphql<{
        node: {
          id: string
          reactions: {
            totalCount: number
            nodes: ReactionNode[]
          }
          reactionGroups: ReactionGroup[]
        } | null
      }>(query, { issueId })

      if (!response.node) {
        throw new GitHubServiceError(`未找到 Issue ${issueId}`, 'ISSUE_NOT_FOUND', 404)
      }

      return {
        id: response.node.id,
        reactions: response.node.reactions.totalCount,
        reactionDetails: response.node.reactionGroups || [],
        reactionNodes: response.node.reactions.nodes || [],
      }
    } catch (error: any) {
      throw this.handleError(error, '获取 Issue 统计数据失败')
    }
  }

  // === 错误处理 ===

  private async handleError(error: any, context: string): Promise<GitHubServiceError> {
    console.error(`${context}:`, error)

    // 检查是否是限流错误
    if (error.status === 403 && error.response?.headers?.['x-ratelimit-remaining'] === '0') {
      const rateLimit = await this.checkRateLimit()
      return new GitHubServiceError(
        'API 调用次数超限',
        'RATE_LIMIT_EXCEEDED',
        403,
        error,
        rateLimit
      )
    }

    // GitHub API 特定错误
    if (error.status === 403) {
      return new GitHubServiceError('访问被拒绝', 'FORBIDDEN', 403, error)
    }

    if (error.status === 404) {
      return new GitHubServiceError('资源未找到', 'NOT_FOUND', 404, error)
    }

    if (error.status === 422) {
      return new GitHubServiceError('请求数据无效', 'INVALID_DATA', 422, error)
    }

    // 一般错误
    const message = error.message || '未知 GitHub API 错误'
    const status = error.status || 500

    return new GitHubServiceError(message, 'API_ERROR', status, error)
  }
}

// === 便捷函数导出 ===

/**
 * 获取用户认证状态和用户名
 */
export async function getCurrentUser(request?: Request): Promise<{ username: string } | null> {
  try {
    const session = await getServerSession(authOptions)
    return session?.user?.username ? { username: session.user.username } : null
  } catch {
    return null
  }
}

/**
 * 检查是否需要用户认证的操作
 */
export function requireUserAuth(user: { username: string } | null): asserts user is { username: string } {
  if (!user) {
    throw new GitHubServiceError('需要认证', 'AUTHENTICATION_REQUIRED', 401)
  }
}
