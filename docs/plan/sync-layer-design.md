# 同步层设计方案

> 本文档描述 vme-app 同步层的设计方案，采用 **GitHub Actions 触发 + Vercel Cron 兜底** 的混合模式。

---

## 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         vme 仓库                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │ Issue 提交  │───▶│ AI 审核     │───▶│ 打标签      │             │
│  │ + 文案标签  │    │ Actions     │    │ "收录"      │             │
│  └─────────────┘    └─────────────┘    └──────┬──────┘             │
│                                               │                     │
│                                               ▼                     │
│                                    ┌──────────────────┐            │
│                                    │ sync_to_neon.yml │            │
│                                    │ (替代 createData)│            │
│                                    └────────┬─────────┘            │
└─────────────────────────────────────────────┼───────────────────────┘
                                              │
                     ┌────────────────────────┼────────────────────────┐
                     │                        │                        │
                     ▼                        ▼                        ▼
        ┌────────────────────┐    ┌────────────────────┐    ┌──────────────┐
        │ 审核通过后触发     │    │ 手动 dispatch      │    │ Vercel Cron  │
        │ (自动)             │    │ (按需全量同步)     │    │ (每小时兜底) │
        └─────────┬──────────┘    └─────────┬──────────┘    └──────┬───────┘
                  │                         │                      │
                  └─────────────────────────┼──────────────────────┘
                                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        vme-app 仓库                                  │
│                  ┌─────────────────────┐                            │
│                  │ POST /api/sync      │                            │
│                  │ - 验证 API Key      │                            │
│                  │ - single/full 模式  │                            │
│                  └──────────┬──────────┘                            │
│                             ▼                                       │
│                  ┌─────────────────────┐                            │
│                  │   Neon PostgreSQL   │                            │
│                  └─────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 触发方式

| 触发方式 | 场景 | 延迟 | 同步模式 |
|----------|------|------|----------|
| **GitHub Actions** (审核后) | Issue 打上"收录"标签 | ~30s | `single` |
| **GitHub Actions** (手动) | workflow_dispatch 全量同步 | ~1min | `full` |
| **Vercel Cron** | 每小时兜底，防止遗漏 | ~1h | `incremental` |

---

## vme 仓库改造

### 废弃 `create_data.yml`

原 `create_data.yml` 将数据写入 `data/*.json` 文件，现改为调用 vme-app 同步 API。

### 新增 `sync_to_neon.yml`

```yaml
# vme/.github/workflows/sync_to_neon.yml
name: 同步数据到 Neon

on:
  # 审核通过后自动触发
  workflow_run:
    workflows: ["Issue 审核"]
    types: [completed]

  # 手动触发全量同步
  workflow_dispatch:
    inputs:
      mode:
        description: '同步模式'
        required: true
        default: 'full'
        type: choice
        options:
          - full
          - incremental

jobs:
  sync:
    runs-on: ubuntu-latest
    if: ${{ github.event_name == 'workflow_dispatch' || github.event.workflow_run.conclusion == 'success' }}

    steps:
      - name: 触发同步 API
        run: |
          MODE="${{ github.event.inputs.mode || 'incremental' }}"

          curl -X POST "${{ secrets.SYNC_API_URL }}" \
            -H "X-API-Key: ${{ secrets.SYNC_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d "{\"mode\": \"${MODE}\"}"
```

### 修改 `issue_moderation.yml` (可选优化)

在审核通过后直接触发单条同步，无需等待 workflow_run：

```yaml
# 在审核通过的 step 后添加
- name: 同步单条数据
  if: steps.moderation.outputs.result == 'approved'
  run: |
    curl -X POST "${{ secrets.SYNC_API_URL }}" \
      -H "X-API-Key: ${{ secrets.SYNC_API_KEY }}" \
      -H "Content-Type: application/json" \
      -d '{
        "mode": "single",
        "issue": {
          "id": "${{ github.event.issue.node_id }}",
          "number": ${{ github.event.issue.number }},
          "title": ${{ toJson(github.event.issue.title) }},
          "body": ${{ toJson(github.event.issue.body) }},
          "user": {
            "login": "${{ github.event.issue.user.login }}",
            "avatar_url": "${{ github.event.issue.user.avatar_url }}",
            "html_url": "${{ github.event.issue.user.html_url }}"
          },
          "created_at": "${{ github.event.issue.created_at }}",
          "updated_at": "${{ github.event.issue.updated_at }}",
          "html_url": "${{ github.event.issue.html_url }}"
        },
        "repo": {
          "owner": "${{ github.repository_owner }}",
          "name": "${{ github.event.repository.name }}"
        }
      }'
```

---

## vme-app 实现

### 目录结构

```
src/
├── app/
│   └── api/
│       └── sync/
│           └── route.ts          # 同步 API
├── lib/
│   ├── data-access/              # 已完成
│   │   ├── index.ts
│   │   ├── neon-provider.ts
│   │   └── types.ts
│   └── sync/                     # 新增
│       ├── index.ts              # 同步入口
│       ├── github-fetcher.ts     # GitHub Issues 抓取
│       └── types.ts              # 类型定义
└── ...

vercel.json                       # Cron 配置
```

### 同步 API 设计

```typescript
// /api/sync/route.ts

interface SyncRequest {
  mode: 'single' | 'incremental' | 'full'
  issue?: GitHubIssuePayload    // single 模式: Actions 直接传入 issue 数据
  repo?: { owner: string; name: string }  // single 模式: 来源仓库
  since?: string                // incremental 模式: 起始时间
}

export async function POST(request: Request) {
  // 鉴权: Cron Secret 或 API Key
  const isVercelCron = request.headers.get('Authorization') === `Bearer ${process.env.CRON_SECRET}`
  const apiKey = request.headers.get('X-API-Key')
  const isValidApiKey = apiKey === process.env.SYNC_API_KEY

  if (!isVercelCron && !isValidApiKey) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: SyncRequest = await request.json()

  switch (body.mode) {
    case 'single':
      // GitHub Actions 传入单条 issue，直接写入
      return await syncSingleIssue(body.issue!, body.repo!)

    case 'incremental':
      // 增量同步: 抓取 since 之后更新的 issues
      return await syncIncremental(body.since)

    case 'full':
    default:
      // 全量同步: 抓取所有仓库的全部数据
      return await syncFull()
  }
}
```

### 同步流程

```
┌─────────────────────────────────────────────────────────────┐
│                      同步模式                                │
├─────────────────┬─────────────────┬─────────────────────────┤
│     single      │   incremental   │         full            │
├─────────────────┼─────────────────┼─────────────────────────┤
│ Actions 传入    │ 查询 sync_log   │ 抓取全部仓库            │
│ issue 数据      │ 获取 last_sync  │ 所有 issues             │
│       │         │       │         │         │               │
│       ▼         │       ▼         │         ▼               │
│ 转换格式        │ 按 since 抓取   │ 按标签抓取              │
│ IssuePayload    │ 增量 issues     │ 全量 issues             │
│ → ItemRow       │       │         │         │               │
│       │         │       ▼         │         ▼               │
└───────┴─────────┴───────┴─────────┴─────────┴───────────────┘
                          │
                          ▼
            ┌─────────────────────────────┐
            │  Upsert 到 Neon             │
            │  ON CONFLICT (github_id)    │
            │  DO UPDATE ...              │
            └──────────────┬──────────────┘
                           │
                           ▼
            ┌─────────────────────────────┐
            │  更新统计数据               │
            │  - authors 表               │
            │  - stats 表                 │
            └──────────────┬──────────────┘
                           │
                           ▼
            ┌─────────────────────────────┐
            │  记录同步日志               │
            │  INSERT INTO sync_log       │
            └─────────────────────────────┘
```

---

## 多仓库配置

```typescript
// src/lib/sync/types.ts

export interface RepoConfig {
  owner: string
  repo: string
  labels: string[]
}

// 环境变量配置，支持动态扩展
export const SYNC_REPOS: RepoConfig[] = JSON.parse(
  process.env.SYNC_REPOS || '[{"owner":"zkl2333","repo":"vme","labels":["收录"]},{"owner":"whitescent","repo":"KFC-Crazy-Thursday","labels":["文案提供"]}]'
)
```

```bash
# .env.local
SYNC_REPOS='[
  {"owner":"zkl2333","repo":"vme","labels":["收录"]},
  {"owner":"whitescent","repo":"KFC-Crazy-Thursday","labels":["文案提供"]}
]'
```

---

## 环境变量

### vme-app (.env.local)

```bash
# 数据库
DATABASE_URL=postgresql://...

# 多仓库配置
SYNC_REPOS='[{"owner":"zkl2333","repo":"vme","labels":["收录"]},...]'

# 鉴权
SYNC_API_KEY=sk_xxx               # GitHub Actions 调用
CRON_SECRET=xxx                   # Vercel 自动注入
GITHUB_TOKEN=ghp_xxx              # GitHub API (rate limit: 5000/h)
```

### vme 仓库 (Secrets)

```bash
SYNC_API_URL=https://vme.im/api/sync
SYNC_API_KEY=sk_xxx               # 与 vme-app 一致
```

---

## Vercel Cron 配置

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/sync",
      "schedule": "0 * * * *"
    }
  ]
}
```

Cron 触发时默认执行 `incremental` 模式。

---

## 数据库 Schema 增强

```sql
-- 添加字段支持多仓库去重
ALTER TABLE items ADD COLUMN IF NOT EXISTS github_node_id TEXT UNIQUE;
ALTER TABLE items ADD COLUMN IF NOT EXISTS source_repo TEXT;

-- 同步日志表
CREATE TABLE IF NOT EXISTS sync_log (
  id SERIAL PRIMARY KEY,
  mode TEXT NOT NULL,              -- single/incremental/full
  source TEXT,                     -- github-actions/vercel-cron
  items_synced INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_items_source_repo ON items(source_repo);
CREATE INDEX IF NOT EXISTS idx_sync_log_started_at ON sync_log(started_at DESC);
```

---

## 实施步骤

### Phase 2.1: vme-app 同步核心
- [ ] 创建 `src/lib/sync/types.ts` - 类型定义
- [ ] 创建 `src/lib/sync/github-fetcher.ts` - GitHub Issues 抓取
- [ ] 创建 `src/lib/sync/index.ts` - 同步入口 (single/incremental/full)
- [ ] 数据库迁移: 添加 `github_node_id`, `source_repo` 字段
- [ ] 创建 `sync_log` 表

### Phase 2.2: vme-app API 路由
- [ ] 创建 `/api/sync/route.ts`
- [ ] 实现三种同步模式
- [ ] 实现 Cron/API Key 鉴权
- [ ] 添加错误处理和日志

### Phase 2.3: vme 仓库改造
- [ ] 创建 `sync_to_neon.yml` workflow
- [ ] 配置 Secrets: `SYNC_API_URL`, `SYNC_API_KEY`
- [ ] (可选) 修改 `issue_moderation.yml` 添加 single 模式调用
- [ ] 废弃 `create_data.yml` 和 `data/*.json` 文件

### Phase 2.4: 初始数据导入
- [ ] 手动触发 `full` 模式全量同步
- [ ] 验证数据完整性
- [ ] 配置 `vercel.json` Cron 兜底

---

## 与旧实现对比

| 维度 | 旧实现 (createData.ts) | 新实现 (sync_to_neon) |
|------|------------------------|----------------------|
| 运行环境 | GitHub Actions | GitHub Actions + Vercel |
| 数据存储 | `data/*.json` 文件 | Neon PostgreSQL |
| 触发方式 | workflow_dispatch | 审核后自动 + Cron 兜底 |
| 同步延迟 | 手动触发 | ~30s (审核后自动) |
| 多仓库 | ✅ 硬编码 | ✅ 环境变量配置 |
| 增量同步 | ❌ 全量 | ✅ 支持 |
| 审核流程 | 同仓库 Actions | **保持不变** |

---

## 审核流程 (保持不变)

审核流程继续在 vme 仓库的 GitHub Actions 中运行：

**触发条件** (`issue_moderation.yml`):
- Issue 被打上 `文案` 或 `梗图` 标签时触发

**审核逻辑** (`moderationLogic.ts`):
1. 检查是否已有审核标签 (`违规`、`收录`、`重复`、`待审`)
2. 相似度检测 (防止重复提交)
3. AI 审核 (OpenAI Moderation API)
4. 根据结果打标签并关闭 Issue
5. **新增**: 审核通过后调用同步 API

**标签含义**:
| 标签 | 含义 | 后续操作 |
|------|------|----------|
| `收录` | 审核通过 | 关闭 Issue，**触发同步 API** |
| `违规` | 内容违规 | 关闭 Issue，添加评论说明原因 |
| `重复` | 与现有文案相似 | 关闭 Issue，添加相似文案链接 |
| `待审` | 需人工审核 | 保持 open，等待人工处理 |
