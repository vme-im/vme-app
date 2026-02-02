// 同步层入口模块
import { neon, NeonQueryFunction } from '@neondatabase/serverless'
import {
  SyncRequest,
  SyncResult,
  ItemToSync,
  GitHubIssuePayload,
  SyncLogEntry,
} from './types'
import {
  fetchAllApprovedIssues,
  fetchIssuesSinceForRepo,
  issueToItemSync,
  payloadToItemSync,
} from './github-fetcher'
import { getSyncRepos } from './types'
import { analyzeContent } from './content-analyzer'

// 获取数据库连接
function getDb() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required')
  }
  return neon(databaseUrl)
}

// 创建 SyncResult 工厂函数
function createSyncResult(
  success: boolean,
  mode: SyncRequest['mode'],
  synced: number,
  skipped: number,
  errors: string[],
  startTime: number
): SyncResult {
  return {
    success,
    mode,
    itemsSynced: synced,
    itemsSkipped: skipped,
    errors,
    duration: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  }
}


async function createSyncLog(
  sql: NeonQueryFunction<false, false>,
  payload: { mode: string; source: string }
): Promise<number> {
  const result = await sql`
    INSERT INTO sync_logs (mode, source, items_synced, started_at)
    VALUES (${payload.mode}, ${payload.source}, 0, NOW())
    RETURNING id
  ` as { id: number }[]

  return result[0]?.id ?? 0
}

async function finishSyncLog(
  sql: NeonQueryFunction<false, false>,
  payload: { id: number; items_synced: number; error: string | null }
) {
  await sql`
    UPDATE sync_logs
    SET items_synced = ${payload.items_synced},
        finished_at = NOW(),
        error = ${payload.error}
    WHERE id = ${payload.id}
  `
}

async function getLastIncrementalSyncTimes(
  sql: NeonQueryFunction<false, false>
): Promise<Map<string, Date>> {
  const result = await sql`
    SELECT source, MAX(finished_at) as last_finished
    FROM sync_logs
    WHERE mode = 'incremental' AND error IS NULL AND finished_at IS NOT NULL
    GROUP BY source
  ` as { source: string; last_finished: Date | null }[]

  const map = new Map<string, Date>()
  for (const row of result) {
    if (row.last_finished) {
      map.set(row.source, row.last_finished)
    }
  }
  return map
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
        ${item.reactions_count},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        body = EXCLUDED.body,
        updated_at = EXCLUDED.updated_at,
        content_type = EXCLUDED.content_type,
        reactions_count = EXCLUDED.reactions_count,
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
    const reactionsCounts = batch.map(item => item.reactions_count)

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
          'approved', '{}', reactions_count, NOW()
        FROM unnest(
          ${ids}::text[],
          ${titles}::text[],
          ${urls}::text[],
          ${bodies}::text[],
          ${createdAts}::timestamptz[],
          ${updatedAts}::timestamptz[],
          ${authorUsernames}::text[],
          ${sourceRepos}::text[],
          ${contentTypes}::text[],
          ${reactionsCounts}::int[]
        ) AS t(id, title, url, body, created_at, updated_at, author_username, source_repo, content_type, reactions_count)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          body = EXCLUDED.body,
          updated_at = EXCLUDED.updated_at,
          content_type = EXCLUDED.content_type,
          reactions_count = EXCLUDED.reactions_count,
          tags = CASE WHEN array_length(EXCLUDED.tags, 1) IS NULL THEN items.tags ELSE EXCLUDED.tags END,
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
 * 获取各仓库上次更新时间 (从 sync_logs 表推断)
 */
async function getLastUpdatedTimes(
  sql: NeonQueryFunction<false, false>
): Promise<Map<string, Date>> {
  return getLastIncrementalSyncTimes(sql)
}

/**
 * 获取最近的同步日志
 */
export async function getRecentSyncLogs(limit: number = 20): Promise<SyncLogEntry[]> {
  const sql = getDb()
  const result = await sql`
    SELECT mode, source, items_synced, started_at, finished_at, error
    FROM sync_logs
    ORDER BY started_at DESC
    LIMIT ${limit}
  ` as SyncLogEntry[]

  return result
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
  const sourceRepo = `${repo.owner}/${repo.name}`

  console.log(`Syncing single issue: ${payload.title} from ${sourceRepo}`)

  const logId = await createSyncLog(sql, { mode: 'single', source: sourceRepo })

  try {
    const item = payloadToItemSync(payload, sourceRepo)
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

    await finishSyncLog(sql, {
      id: logId,
      items_synced: success ? 1 : 0,
      error: success ? null : errors.join('; '),
    })

    return createSyncResult(success, 'single', success ? 1 : 0, success ? 0 : 1, errors, startTime)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    errors.push(errorMsg)
    await finishSyncLog(sql, { id: logId, items_synced: 0, error: errorMsg })
    return createSyncResult(false, 'single', 0, 1, errors, startTime)
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
    const repos = getSyncRepos()
    const defaultSince = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z')
    const lastUpdatedTimes = since ? new Map<string, Date>() : await getLastUpdatedTimes(sql)
    let totalSynced = 0
    let totalSkipped = 0

    for (const { owner, repo, labels, typeLabels } of repos) {
      const sourceRepo = `${owner}/${repo}`
      const sinceDate = since
        ? new Date(since)
        : (lastUpdatedTimes.get(sourceRepo) || defaultSince)

      console.log(`Fetching issues since: ${sinceDate.toISOString()} (${sourceRepo})`)

      const logId = await createSyncLog(sql, { mode: 'incremental', source: sourceRepo })

      try {
        const issuesWithRepo = await fetchIssuesSinceForRepo(
          owner,
          repo,
          labels,
          sinceDate,
          typeLabels
        )
        const items = issuesWithRepo.map(({ issue, typeLabels }) =>
          issueToItemSync(issue, sourceRepo, typeLabels)
        )

        console.log(`Found ${items.length} issues to sync (${sourceRepo})`)

        const { synced, skipped } = await upsertItemsBatch(sql, items)
        totalSynced += synced
        totalSkipped += skipped

        await finishSyncLog(sql, {
          id: logId,
          items_synced: synced,
          error: null,
        })
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`${sourceRepo}: ${errorMsg}`)
        await finishSyncLog(sql, { id: logId, items_synced: 0, error: errorMsg })
        // 继续同步其他仓库，不中断
      }
    }

    const success = errors.length === 0
    return createSyncResult(success, 'incremental', totalSynced, totalSkipped, errors, startTime)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    errors.push(errorMsg)
    return createSyncResult(false, 'incremental', 0, 0, errors, startTime)
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

  const logId = await createSyncLog(sql, { mode: 'full', source: 'all-repos' })

  try {
    // 抓取全部数据
    const issuesWithRepo = await fetchAllApprovedIssues()
    const items = issuesWithRepo.map(({ issue, sourceRepo, typeLabels }) =>
      issueToItemSync(issue, sourceRepo, typeLabels)
    )

    console.log(`Found ${items.length} issues to sync`)

    // 写入数据库 (批量插入)
    const { synced, skipped } = await upsertItemsBatch(sql, items)

    await finishSyncLog(sql, {
      id: logId,
      items_synced: synced,
      error: null,
    })

    return createSyncResult(true, 'full', synced, skipped, errors, startTime)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    errors.push(errorMsg)
    await finishSyncLog(sql, { id: logId, items_synced: 0, error: errorMsg })
    return createSyncResult(false, 'full', 0, 0, errors, startTime)
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

/**
 * 为单条段子触发AI分类
 * 如果段子已有标签则跳过，否则调用AI分类并更新数据库
 *
 * @param itemId 段子ID
 * @returns 是否成功分类
 */
export async function classifyItem(itemId: string): Promise<{ success: boolean; tags: string[] }> {
  const sql = getDb()

  try {
    // 1. 查询段子当前状态
    const result = await sql`
      SELECT id, title, body, tags
      FROM items
      WHERE id = ${itemId}
        AND moderation_status = 'approved'
    ` as { id: string; title: string; body: string; tags: string[] | null }[]

    if (!result || result.length === 0) {
      console.warn(`Item not found: ${itemId}`)
      return { success: false, tags: [] }
    }

    const item = result[0]

    // 2. 检查是否已有标签
    if (item.tags && item.tags.length > 0) {
      console.log(`Item ${itemId} already has tags:`, item.tags)
      return { success: true, tags: item.tags }
    }

    // 3. 调用AI分类
    console.log(`AI classifying item: ${itemId}`)
    const tags = await analyzeContent({
      title: item.title,
      body: item.body,
    })

    // 4. 更新数据库
    await sql`
      UPDATE items
      SET tags = ${tags},
          synced_at = NOW()
      WHERE id = ${itemId}
    `

    console.log(`Item ${itemId} classified with tags:`, tags)
    return { success: true, tags }
  } catch (error) {
    console.error(`Failed to classify item ${itemId}:`, error)
    return { success: false, tags: [] }
  }
}

// 导出类型
export * from './types'
export * from './github-fetcher'
