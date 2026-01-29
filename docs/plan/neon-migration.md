# Neon 数据库迁移技术方案

> **架构原则**: GitHub Issues 是唯一可信数据源，Neon 数据库仅作为加速查询和便于筛选的缓存层。

## 一、现状分析

### 1.1 当前架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  GitHub Issues  │────▶│  GitHub Actions │────▶│   data.json     │
│  (数据源)       │     │  (审核+同步)     │     │   (静态文件)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
                                                  ┌─────────────────┐
                                                  │  Next.js API    │
                                                  │  (读取JSON)      │
                                                  └─────────────────┘
```

### 1.2 存在的问题

| 问题 | 描述 | 影响 |
|------|------|------|
| **全量加载** | `data.json` 全部加载到内存 | 内存占用高，随数据量增长线性增长 |
| **查询能力弱** | 无法高效筛选、排序、搜索 | 功能受限，需额外代码实现 |
| **无索引** | 无法基于任意字段快速查找 | 随机查询需遍历全量数据 |
| **实时性差** | 依赖 GitHub Actions 同步 | 数据更新延迟 |
| **统计困难** | 贡献者排行、月度统计需全量计算 | API 响应慢 |

### 1.3 数据模型

```typescript
// IKfcItem - 核心数据结构
interface IKfcItem {
  id: string              // GitHub Issue ID
  title: string           // 文案标题
  url: string            // GitHub Issue 链接
  body: string           // 文案内容
  createdAt: string      // 创建时间
  updatedAt: string      // 更新时间
  author: {
    username: string
    avatarUrl: string
    url: string
  }
  reactions?: {
    totalCount: number
  }
}

// Summary - 统计数据
interface Summary {
  totalItems: number
  totalContributors: number
  months: { month: string, count: number }[]
  contributors: Contributor[]
  topContributors: Contributor[]
  updatedAt: string
}
```

## 二、目标架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GitHub Issues (SSOT)                         │
│                      唯一可信数据源 (Single Source of Truth)         │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      GitHub Actions (Sync Layer)                     │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐         │
│  │  Issue Spider │──▶│ AI 审核模块   │──▶│  Neon Writer  │         │
│  │  (抓取新文案)  │   │  (内容审核)    │   │  (写入缓存)    │         │
│  └───────────────┘   └───────────────┘   └───────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
                                                                │
                                                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Neon PostgreSQL                              │
│                        (缓存层 / Cache Layer)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  items 表    │  │  authors 表  │  │  stats 表    │              │
│  │  (文案数据)   │  │  (作者信息)   │  │  (统计数据)   │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                     │
│  - 索引优化 (id, author_id, created_at, reactions_count)            │
│  - 全文搜索 (title, body)                                           │
│  - 自动清理过期数据                                                  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Next.js Application                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      API Routes                              │   │
│  │  /api/items  → Neon 查询 (分页、筛选、搜索)                   │   │
│  │  /api/random → Neon 随机 (ORDER BY RANDOM() LIMIT 1)          │   │
│  │  /api/status → Neon 统计 + GitHub API 实时 reactions          │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## 三、数据库设计

### 3.1 表结构

```sql
-- 文案表 (核心数据)
CREATE TABLE items (
  id TEXT PRIMARY KEY,              -- GitHub Issue ID
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  author_username TEXT NOT NULL,
  author_avatar_url TEXT NOT NULL,
  author_url TEXT NOT NULL,
  reactions_count INTEGER DEFAULT 0,

  -- 审核状态
  moderation_status TEXT DEFAULT 'approved', -- approved, pending, rejected

  -- 用于随机查询的辅助字段
  random_seed REAL GENERATED ALWAYS AS (random()) STORED,

  -- 元数据
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 作者表 (用于排行榜)
CREATE TABLE authors (
  username TEXT PRIMARY KEY,
  avatar_url TEXT NOT NULL,
  url TEXT NOT NULL,
  item_count INTEGER DEFAULT 0,
  total_reactions INTEGER DEFAULT 0,

  -- V50 指数 (综合评分)
  v50_score REAL DEFAULT 0,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 统计表 (预聚合数据)
CREATE TABLE stats (
  id TEXT PRIMARY KEY DEFAULT 'latest',
  total_items INTEGER DEFAULT 0,
  total_contributors INTEGER DEFAULT 0,
  top_contributors JSONB DEFAULT '{}',
  monthly_stats JSONB DEFAULT '{}',  -- {"2024-01": 10, "2024-02": 15}
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 同步记录表 (用于监控)
CREATE TABLE sync_log (
  id SERIAL PRIMARY KEY,
  sync_type TEXT NOT NULL,          -- full, incremental
  items_added INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_deleted INTEGER DEFAULT 0,
  status TEXT NOT NULL,              -- success, failed
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### 3.2 索引设计

```sql
-- 高频查询索引
CREATE INDEX idx_items_created_at ON items(created_at DESC);
CREATE INDEX idx_items_reactions_count ON items(reactions_count DESC);
CREATE INDEX idx_items_author_username ON items(author_username);
CREATE INDEX idx_items_moderation_status ON items(moderation_status);

-- 全文搜索索引
CREATE INDEX idx_items_body_search ON items USING gin(to_tsvector('simple', body));
CREATE INDEX idx_items_title_search ON items USING gin(to_tsvector('simple', title));

-- 复合索引 (用于组合查询)
CREATE INDEX idx_items_author_reactions ON items(author_username, reactions_count DESC);
CREATE INDEX idx_items_status_created ON items(moderation_status, created_at DESC);
```

### 3.3 数据库视图

```sql
-- 热门文案视图 (用于排行榜)
CREATE MATERIALIZED VIEW hot_items AS
SELECT
  id,
  title,
  body,
  author_username,
  reactions_count,
  created_at,
  (reactions_count * 1.0 / EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 + 1)
    AS hot_score
FROM items
WHERE moderation_status = 'approved'
ORDER BY hot_score DESC;

-- 定期刷新: REFRESH MATERIALIZED VIEW hot_items;
```

## 四、数据同步策略

### 4.1 同步流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflow                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: Fetch Issues                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ GET /repos/zkl2333/vme/issues                             │  │
│  │ - state: closed (已审核关闭的文案)                        │  │
│  │ - per_page: 100                                           │  │
│  │ - since: last_sync_at (增量同步)                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                      │
│                          ▼                                      │
│  Step 2: Transform & Upsert                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ INSERT INTO items (...) VALUES (...)                      │  │
│  │ ON CONFLICT (id) DO UPDATE SET ...                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                      │
│                          ▼                                      │
│  Step 3: Update Author Stats                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ UPDATE authors                                            │  │
│  │ SET item_count = (SELECT COUNT(*) FROM items WHERE ...)   │  │
│  │ WHERE username = $1                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                      │
│                          ▼                                      │
│  Step 4: Refresh Aggregated Stats                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ UPDATE stats SET ...                                      │  │
│  │ - total_items, monthly_stats, top_contributors            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 同步脚本结构

```typescript
// actions_scripts/src/neon-sync/syncToNeon.ts

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function syncIssuesToNeon(issues: GitHubIssue[]) {
  const startTime = new Date();
  let added = 0, updated = 0;

  for (const issue of issues) {
    const result = await sql`
      INSERT INTO items (
        id, title, url, body, created_at, updated_at,
        author_username, author_avatar_url, author_url,
        reactions_count, moderation_status
      ) VALUES (
        ${issue.id}, ${issue.title}, ${issue.url}, ${issue.body},
        ${issue.created_at}, ${issue.updated_at},
        ${issue.author.username}, ${issue.author.avatarUrl}, ${issue.author.url},
        ${issue.reactions?.totalCount || 0}, 'approved'
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        body = EXCLUDED.body,
        updated_at = EXCLUDED.updated_at,
        reactions_count = EXCLUDED.reactions_count,
        synced_at = NOW()
      RETURNING (xmax = 0) AS inserted
    `;

    if (result[0].inserted) added++; else updated++;
  }

  // 更新作者统计
  await updateAuthorStats();

  // 更新全局统计
  await updateGlobalStats();

  // 记录同步日志
  await sql`
    INSERT INTO sync_log (sync_type, items_added, items_updated, status)
    VALUES ('incremental', ${added}, ${updated}, 'success')
  `;

  return { added, updated, duration: Date.now() - startTime };
}
```

### 4.3 同步触发方式

| 方式 | 触发条件 | 延迟 | 适用场景 |
|------|----------|------|----------|
| **Webhook** | Issue 关闭/编辑 | < 1分钟 | 实时性要求高 |
| **Cron** | 每小时一次 | ~1小时 | 常规同步 |
| **手动** | API 调用 | 即时 | 数据修复 |

## 五、API 改造方案

### 5.1 数据访问层抽象

```typescript
// src/lib/data-access/index.ts

export interface DataProvider {
  getItems(params: GetItemsParams): Promise<PaginatedItems>
  getRandomItem(): Promise<IKfcItem | null>
  getItemById(id: string): Promise<IKfcItem | null>
  getStats(): Promise<Summary>
  searchItems(query: string): Promise<IKfcItem[]>
}

// src/lib/data-access/neon-provider.ts
export class NeonProvider implements DataProvider {
  private sql: Sql

  constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl);
  }

  async getItems(params: GetItemsParams): Promise<PaginatedItems> {
    const { page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = params;
    const offset = (page - 1) * limit;

    const items = await this.sql`
      SELECT * FROM items
      WHERE moderation_status = 'approved'
      ORDER BY ${sql(this.getSortColumn(sortBy))} ${sql(order.toUpperCase())}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [{ count }] = await this.sql`
      SELECT COUNT(*) as count FROM items
      WHERE moderation_status = 'approved'
    `;

    return { items, total: count, page, limit };
  }

  async getRandomItem(): Promise<IKfcItem | null> {
    const items = await this.sql`
      SELECT * FROM items
      WHERE moderation_status = 'approved'
      ORDER BY RANDOM()
      LIMIT 1
    `;
    return items[0] || null;
  }

  // ... 其他方法
}

// src/lib/data-access/fallback-provider.ts
// 降级策略: Neon 不可用时回退到 GitHub API 或 data.json
export class FallbackProvider implements DataProvider {
  private primary: DataProvider;
  private fallback: DataProvider;

  async getItems(params: GetItemsParams): Promise<PaginatedItems> {
    try {
      return await this.primary.getItems(params);
    } catch (error) {
      console.warn('Primary provider failed, using fallback');
      return await this.fallback.getItems(params);
    }
  }
}
```

### 5.2 API 路由改造

```typescript
// src/app/api/items/route.ts

import { dataProvider } from '@/lib/data-access';

export const revalidate = 300 // 5分钟缓存 (从 3600 降低)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    const result = await dataProvider.getItems({ page, limit });
    return NextResponse.json(result);
  } catch (error) {
    // 降级处理
    return NextResponse.json(
      { error: 'Service temporarily unavailable' },
      { status: 503 }
    );
  }
}

// 支持新的查询参数
// ?sort=hot&order=desc
// ?author=zkl2333
// ?search=肯德基
// ?before=2024-01-01&after=2023-01-01
```

### 5.3 新增功能

```typescript
// src/app/api/search/route.ts - 全文搜索
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  const results = await dataProvider.searchItems(query!);
  return NextResponse.json({ results, total: results.length });
}

// 数据库实现
async searchItems(query: string): Promise<IKfcItem[]> {
  return await this.sql`
    SELECT * FROM items
    WHERE
      moderation_status = 'approved' AND
      (
        to_tsvector('simple', title) @@ plainto_tsquery('simple', ${query}) OR
        to_tsvector('simple', body) @@ plainto_tsquery('simple', ${query})
      )
    ORDER BY created_at DESC
    LIMIT 50
  `;
}
```

## 六、环境配置

### 6.1 环境变量

```bash
# .env.local
# Neon 数据库连接
DATABASE_URL="postgresql://user:password@ep-xxx.aws.neon.tech/vme?sslmode=require"

# GitHub Token (用于同步)
GITHUB_TOKEN=ghp_xxx

# 同步配置
SYNC_ENABLED=true
SYNC_INTERVAL=3600000  # 1小时
```

### 6.2 依赖安装

```bash
# Neon 客户端 (无服务器友好)
npm install @neondatabase/serverless

# 或 Prisma ORM (如需类型安全)
npm install prisma @prisma/client
```

## 七、实施计划

### Phase 1: 基础设施 (1-2天)

- [ ] 创建 Neon 项目，获取连接字符串
- [ ] 执行数据库 Schema 创建
- [ ] 配置 GitHub Actions Secrets
- [ ] 编写数据库迁移脚本

### Phase 2: 同步层 (2-3天)

- [ ] 实现 `syncToNeon.ts` 同步脚本
- [ ] 编写增量同步逻辑
- [ ] 配置 GitHub Actions Workflow
- [ ] 测试数据同步正确性

### Phase 3: API 改造 (3-4天)

- [ ] 实现 `DataProvider` 接口
- [ ] 改造 `/api/items` 使用 Neon
- [ ] 改造 `/api/random` 使用 Neon
- [ ] 改造 `/api/status` 使用 Neon
- [ ] 实现降级策略

### Phase 4: 新功能 (2-3天)

- [ ] 实现全文搜索 `/api/search`
- [ ] 实现高级筛选功能
- [ ] 优化 V50 英雄榜查询
- [ ] 实现 Materialized View 刷新

### Phase 5: 测试与上线 (1-2天)

- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能测试
- [ ] 灰度发布
- [ ] 监控告警配置

## 八、降级与容错

### 8.1 多层降级策略

```
┌─────────────────────────────────────────────────────────────┐
│                    请求进入                                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Neon 数据库可用?     │
              └─────────┬─────────────┘
                        │
           ┌────────────┴────────────┐
           │ Yes                    │ No
           ▼                        ▼
    ┌──────────────┐        ┌──────────────┐
    │ 查询 Neon    │        │ 回退到        │
    │              │        │ GitHub API    │
    └──────────────┘        └──────────────┘
           │                        │
           │ 异常                    │ 异常
           ▼                        ▼
    ┌──────────────┐        ┌──────────────┐
    │ 使用 data.json│       │ 返回 503     │
    │ 静态文件      │        │ (错误页面)    │
    └──────────────┘        └──────────────┘
```

### 8.2 健康检查

```typescript
// src/app/api/health/route.ts
export async function GET() {
  const checks = {
    neon: await checkNeonHealth(),
    github: await checkGitHubHealth(),
  };

  const healthy = Object.values(checks).every(c => c.healthy);

  return NextResponse.json({
    status: healthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  }, { status: healthy ? 200 : 503 });
}
```

## 九、成本估算

### Neon 免费套餐

| 项目 | 限制 |
|------|------|
| 存储 | 0.5 GB |
| 计算时间 | 300 小时/月 |
| 数据传输 | 包含在内 |

### 预估使用量

| 指标 | 预估值 |
|------|--------|
| 数据行数 | ~10,000 条文案 (每条约 1KB) |
| 总存储 | ~20 MB (远低于 0.5GB 限制) |
| 查询量 | ~1000 次/天 |

**结论**: Neon 免费套餐完全足够。

## 十、监控指标

```sql
-- 同步健康度监控
SELECT
  DATE_TRUNC('hour', started_at) AS hour,
  COUNT(*) AS sync_count,
  SUM(items_added) AS items_added,
  SUM(items_updated) AS items_updated,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) AS avg_duration_seconds
FROM sync_log
WHERE started_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- 数据新鲜度
SELECT
  MAX(synced_at) AS last_sync,
  EXTRACT(EPOCH FROM (NOW() - MAX(synced_at))) / 60 AS minutes_since_sync
FROM items;

-- 查询性能
SELECT
  schemaname,
  tablename,
  seq_scan,
  idx_scan,
  seq_scan / NULLIF(seq_scan + idx_scan, 0) AS heap_scan_ratio
FROM pg_stat_user_tables
WHERE schemaname = 'public';
```
