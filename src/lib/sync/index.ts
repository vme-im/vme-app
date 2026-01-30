// 同步层入口模块
import { neon, NeonQueryFunction } from '@neondatabase/serverless'
import {
  SyncRequest,
  SyncResult,
  ItemToSync,
  GitHubIssuePayload,
} from './types'
import {
  fetchAllApprovedIssues,
  fetchIssuesSince,
  issueToItemSync,
  payloadToItemSync,
} from './github-fetcher'

// 获取数据库连接
function getDb() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required')
  }
  return neon(databaseUrl)
}

/**
 * Upsert 单条 Item 到数据库
 */
async function upsertItem(sql: NeonQueryFunction<false, false>, item: ItemToSync): Promise<boolean> {
  try {
    await sql`
      INSERT INTO items (
        id,
        title,
        url,
        body,
        created_at,
        updated_at,
        author_username,
        source_repo,
        moderation_status,
        content_type,
        tags,
        reactions_count,
        synced_at
      ) VALUES (
        ${item.id},
        ${item.title},
        ${item.url},
        ${item.body},
        ${item.created_at},
        ${item.updated_at},
        ${item.author_username},
        ${item.source_repo},
        ${item.moderation_status},
        ${item.content_type},
        ${item.tags},
        0,
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        body = EXCLUDED.body,
        updated_at = EXCLUDED.updated_at,
        content_type = EXCLUDED.content_type,
        tags = CASE WHEN array_length(EXCLUDED.tags, 1) IS NULL THEN items.tags ELSE EXCLUDED.tags END,
        synced_at = NOW()
    `
    return true
  } catch (error) {
    console.error(`Failed to upsert item ${item.id}:`, error)
    return false
  }
}

/**
 * 批量 Upsert Items (使用 unnest 实现真正的批量插入)
 */
async function upsertItemsBatch(
  sql: NeonQueryFunction<false, false>,
  items: ItemToSync[]
): Promise<{ synced: number; skipped: number }> {
  if (items.length === 0) {
    return { synced: 0, skipped: 0 }
  }

  const BATCH_SIZE = 100
  let totalSynced = 0

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)

    // 准备批量数据数组
    const ids = batch.map(item => item.id)
    const titles = batch.map(item => item.title)
    const urls = batch.map(item => item.url)
    const bodies = batch.map(item => item.body)
    const createdAts = batch.map(item => item.created_at)
    const updatedAts = batch.map(item => item.updated_at)
    const authorUsernames = batch.map(item => item.author_username)
    const sourceRepos = batch.map(item => item.source_repo)
    const contentTypes = batch.map(item => item.content_type)

    try {
      await sql`
        INSERT INTO items (
          id,
          title,
          url,
          body,
          created_at,
          updated_at,
          author_username,
          source_repo,
          content_type,
          moderation_status,
          tags,
          reactions_count,
          synced_at
        )
        SELECT
          id, title, url, body, created_at, updated_at, author_username, source_repo, content_type,
          'approved', '{}', 0, NOW()
        FROM unnest(
          ${ids}::text[],
          ${titles}::text[],
          ${urls}::text[],
          ${bodies}::text[],
          ${createdAts}::timestamptz[],
          ${updatedAts}::timestamptz[],
          ${authorUsernames}::text[],
          ${sourceRepos}::text[],
          ${contentTypes}::text[]
        ) AS t(id, title, url, body, created_at, updated_at, author_username, source_repo, content_type)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          body = EXCLUDED.body,
          updated_at = EXCLUDED.updated_at,
          content_type = EXCLUDED.content_type,
          synced_at = NOW()
      `
      totalSynced += batch.length
      console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: synced ${batch.length} items`)
    } catch (error) {
      console.error(`Failed to upsert batch starting at index ${i}:`, error)
      // 批量失败时回退到逐条插入
      for (const item of batch) {
        const success = await upsertItem(sql, item)
        if (success) totalSynced++
      }
    }
  }

  return { synced: totalSynced, skipped: items.length - totalSynced }
}

/**
 * 获取上次同步时间 (从 items 表的 synced_at 推断)
 */
async function getLastSyncTime(sql: NeonQueryFunction<false, false>): Promise<Date | null> {
  const result = await sql`
    SELECT MAX(synced_at) as last_sync FROM items
  ` as { last_sync: Date | null }[]

  return result.length > 0 ? result[0].last_sync : null
}

/**
 * 同步单条 Issue (single 模式)
 */
export async function syncSingleIssue(
  payload: GitHubIssuePayload,
  repo: { owner: string; name: string },
  overrides?: { content_type?: 'text' | 'meme'; tags?: string[] }
): Promise<SyncResult> {
  const startTime = Date.now()
  const sql = getDb()
  const errors: string[] = []

  console.log(`Syncing single issue: ${payload.title} from ${repo.owner}/${repo.name}`)

  try {
    const item = payloadToItemSync(payload, `${repo.owner}/${repo.name}`)
    if (overrides?.content_type) {
      item.content_type = overrides.content_type
    }
    if (overrides?.tags) {
      item.tags = overrides.tags
    }
    const success = await upsertItem(sql, item)

    if (!success) {
      errors.push(`Failed to sync issue: ${payload.id}`)
    }

    return {
      success: success,
      mode: 'single',
      itemsSynced: success ? 1 : 0,
      itemsSkipped: success ? 0 : 1,
      errors,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    errors.push(errorMsg)

    return {
      success: false,
      mode: 'single',
      itemsSynced: 0,
      itemsSkipped: 1,
      errors,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * 增量同步 (incremental 模式)
 */
export async function syncIncremental(since?: string): Promise<SyncResult> {
  const startTime = Date.now()
  const sql = getDb()
  const errors: string[] = []

  console.log('Starting incremental sync...')

  try {
    // 获取同步起始时间
    let sinceDate: Date
    if (since) {
      sinceDate = new Date(since)
    } else {
      const lastSync = await getLastSyncTime(sql)
      sinceDate = lastSync || new Date(Date.now() - 24 * 60 * 60 * 1000) // 默认24小时前
    }

    console.log(`Fetching issues since: ${sinceDate.toISOString()}`)

    // 抓取增量数据
    const issuesWithRepo = await fetchIssuesSince(sinceDate)
    const items = issuesWithRepo.map(({ issue, sourceRepo }) =>
      issueToItemSync(issue, sourceRepo)
    )

    console.log(`Found ${items.length} issues to sync`)

    // 写入数据库 (批量插入)
    const { synced, skipped } = await upsertItemsBatch(sql, items)

    return {
      success: true,
      mode: 'incremental',
      itemsSynced: synced,
      itemsSkipped: skipped,
      errors,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    errors.push(errorMsg)

    return {
      success: false,
      mode: 'incremental',
      itemsSynced: 0,
      itemsSkipped: 0,
      errors,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * 全量同步 (full 模式)
 */
export async function syncFull(): Promise<SyncResult> {
  const startTime = Date.now()
  const sql = getDb()
  const errors: string[] = []

  console.log('Starting full sync...')

  try {
    // 抓取全部数据
    const issuesWithRepo = await fetchAllApprovedIssues()
    const items = issuesWithRepo.map(({ issue, sourceRepo }) =>
      issueToItemSync(issue, sourceRepo)
    )

    console.log(`Found ${items.length} issues to sync`)

    // 写入数据库 (批量插入)
    const { synced, skipped } = await upsertItemsBatch(sql, items)

    return {
      success: true,
      mode: 'full',
      itemsSynced: synced,
      itemsSkipped: skipped,
      errors,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    errors.push(errorMsg)

    return {
      success: false,
      mode: 'full',
      itemsSynced: 0,
      itemsSkipped: 0,
      errors,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * 主同步入口
 */
export async function sync(request: SyncRequest): Promise<SyncResult> {
  switch (request.mode) {
    case 'single':
      if (!request.issue || !request.repo) {
        return {
          success: false,
          mode: 'single',
          itemsSynced: 0,
          itemsSkipped: 0,
          errors: ['Missing issue or repo for single mode'],
          duration: 0,
          timestamp: new Date().toISOString(),
        }
      }
      return syncSingleIssue(request.issue, request.repo, {
        content_type: request.content_type,
        tags: request.tags,
      })

    case 'incremental':
      return syncIncremental(request.since)

    case 'full':
    default:
      return syncFull()
  }
}

// 导出类型
export * from './types'
export * from './github-fetcher'
