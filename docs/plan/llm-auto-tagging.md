# LLM 自动打标设计（Webhook 版）

## 概述

在现有审核流程基础上，使用 Webhook 将“审核通过”的文案实时同步到 `vme-app`，由服务端执行 LLM 内容分析（content_type + tags）并写入 Neon 数据库。  
**不再保留 GitHub Actions 的同步流程**。  
**第三方仓库不接入 Webhook**，仅通过增量抓取同步。

## 目标

- 审核通过后尽快同步（分钟级体验）
- 服务端集中完成 LLM 打标与写库
- 多仓库接入：自有仓库实时，第三方仓库增量
- 幂等、可重试、可回溯

## 现状与问题

- 现有流程依赖 Actions 写入或触发同步
- 拆分后同步逻辑更适合集中在 `vme-app`
- Webhook 更稳定、延迟更低，便于统一观测

## 总体流程（Webhook 主路径）

```
Issue 被打上“收录”标签
          ↓
GitHub Webhook -> vme-app /api/sync-webhook
          ↓
签名校验 + 事件过滤
          ↓
LLM 内容分析（失败不阻塞）
          ↓
upsert 写入 Neon（幂等）
```

## 事件来源与接入策略

### 自有仓库（同组织）
- 接入 Webhook（实时）
- 触发事件：`issues` 的 `labeled` / `edited` / `closed`
- 过滤：label 包含 `收录`

### 第三方仓库（仅采集）
- **不接入 Webhook**
- 使用 `vme-app` 的增量同步（cron 或手动）

## 鉴权与安全

- 使用 GitHub Webhook Secret 验签（`X-Hub-Signature-256`）
- 允许列表校验：仅处理配置的仓库
- 不向第三方仓库回写（只读采集）

## 幂等与去重

- 主键：`issue.node_id`
- 版本：`issue.updated_at`
- Upsert 规则：
  - 同 `id` 且 `updated_at` 未变化则跳过
  - 变化则更新 `title/body/tags/content_type`

## 标签体系

### content_type（互斥，必选）

| 值 | 说明 |
|---|---|
| `text` | 纯文字文案 |
| `meme` | 包含图片/表情包 |

### tags（多选，0-3 个）

**情感基调**（选 1 个）
| 标签 | 说明 |
|---|---|
| 温情 | 感人、暖心的内容 |
| 反转 | 结尾意想不到的转折 |
| 抽象 | 无厘头、超现实的内容 |
| 自嘲 | 自我调侃、苦中作乐 |
| 讽刺 | 带有讽刺意味 |
| 励志 | 正能量、鼓励型 |

**内容主题**（选 0-2 个）
| 标签 | 说明 |
|---|---|
| 职场 | 工作、同事、老板相关 |
| 恋爱 | 情侣、暧昧、表白相关 |
| 学生 | 学校、考试、作业相关 |
| 社畜 | 打工人生活 |
| 单身 | 单身狗、母胎 solo |
| 家庭 | 亲人、家庭关系 |
| 朋友 | 友情相关 |

**表现手法**（选 0-1 个）
| 标签 | 说明 |
|---|---|
| 对话体 | 包含对话形式 |
| 独白体 | 第一人称叙述 |
| 故事体 | 有完整故事情节 |
| 排比 | 使用排比句式 |
| 谐音梗 | 包含谐音/双关 |

## API 设计（Webhook）

### `/api/sync-webhook`

- 接收 GitHub Webhook（issues）
- 校验签名 + repo allowlist
- 转换为内部 `SyncRequest`：
  - `mode: 'single'`
  - `issue: GitHubIssuePayload`
  - `repo: { owner, name }`
- 直接触发 `syncSingleIssue`（并传入 LLM 分析结果）

## 同步层调整（vme-app）

### types

`SyncRequest` 允许携带：
- `content_type?: 'text' | 'meme'`
- `tags?: string[]`

### syncSingleIssue

- 若 request 中带 `content_type` / `tags`，优先使用
- 否则保持当前自动判断逻辑

## LLM 内容分析（服务端）

- 模块：`src/lib/sync/content-analyzer.ts`
- 失败不阻塞：默认 `tags=[]`，`content_type` 走正则判断
- 解析失败时记录日志，不抛错

## 增量同步（第三方仓库）

- 使用现有 `/api/sync` 的 `incremental` 模式
- Vercel Cron 定时触发（例如每小时或每天）
- 仅抓取配置仓库的收录标签

## 环境变量

### vme-app

```
DATABASE_URL=postgresql://...
SYNC_API_KEY=xxx
WEBHOOK_SECRET=xxx
AI_API_KEY=sk-xxx
AI_API_BASE_URL=https://api.openai.com
LLM_MODEL=gpt-4o-mini
```

## 实现步骤

1. 新增 `src/app/api/sync-webhook/route.ts`
2. 新增 `src/lib/sync/content-analyzer.ts`
3. 扩展 `SyncRequest` 类型与 `syncSingleIssue` 入参
4. 在 `sync-webhook` 中调用 LLM 分析并写库
5. 配置 Webhook 与 Secret（自有仓库）
6. 配置 Vercel Cron 做第三方仓库增量同步
7. 端到端测试（labeled/edited/closed）

## 测试清单

- labeled 触发，立即写库
- edited 触发更新 tags/body
- 签名错误拒绝（401）
- LLM 失败仍能写库
- 第三方仓库仅增量，不触发 webhook
