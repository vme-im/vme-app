// 同步层类型定义

// 仓库配置
export interface RepoConfig {
  owner: string
  repo: string
  labels: string[]
}

// GitHub Issue 原始数据 (GraphQL 返回)
export interface GitHubIssueNode {
  id: string           // GitHub Node ID (用于去重)
  title: string
  url: string
  body: string
  createdAt: string
  updatedAt: string
  author: {
    login: string
    avatarUrl: string
    url: string
  } | null
}

// GitHub Actions 传入的 Issue Payload (REST API 格式)
export interface GitHubIssuePayload {
  id: string           // node_id
  number: number
  title: string
  body: string | null
  user: {
    login: string
    avatar_url: string
    html_url: string
  }
  created_at: string
  updated_at: string
  html_url: string
}

// 同步请求体
export interface SyncRequest {
  mode: 'single' | 'incremental' | 'full'
  issue?: GitHubIssuePayload    // single 模式
  repo?: { owner: string; name: string }  // single 模式
  since?: string                // incremental 模式
}

// 同步结果
export interface SyncResult {
  success: boolean
  mode: 'single' | 'incremental' | 'full'
  itemsSynced: number
  itemsSkipped: number
  errors: string[]
  duration: number   // 毫秒
  timestamp: string
}

// 同步日志记录
export interface SyncLogEntry {
  mode: string
  source: string
  items_synced: number
  started_at: Date
  finished_at: Date | null
  error: string | null
}

// 待写入数据库的 Item
export interface ItemToSync {
  id: string              // GitHub Node ID (作为主键)
  title: string
  url: string
  body: string
  created_at: Date
  updated_at: Date
  author_username: string
  source_repo: string
  moderation_status: 'approved'
}

// 默认仓库配置
export const DEFAULT_SYNC_REPOS: RepoConfig[] = [
  { owner: 'zkl2333', repo: 'vme', labels: ['收录'] },
  { owner: 'whitescent', repo: 'KFC-Crazy-Thursday', labels: ['文案提供'] },
]

// 从环境变量读取仓库配置
export function getSyncRepos(): RepoConfig[] {
  const envRepos = process.env.SYNC_REPOS
  if (!envRepos) {
    return DEFAULT_SYNC_REPOS
  }

  try {
    const parsed = JSON.parse(envRepos) as RepoConfig[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.warn('SYNC_REPOS is empty or invalid, using defaults')
      return DEFAULT_SYNC_REPOS
    }
    return parsed
  } catch {
    console.warn('Failed to parse SYNC_REPOS, using defaults')
    return DEFAULT_SYNC_REPOS
  }
}
