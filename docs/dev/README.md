# 开发者与协作指南

> 本文档面向所有开发者（包括人类与 AI Agent）。
>
> 🏛 **架构权威规格**：vme-app + vme-content 的架构决策与实施规格以 [`vme-content/docs/architecture.md`](https://github.com/vme-im/vme-content/blob/main/docs/architecture.md) 为唯一权威，本仓只留指针。

## 🚀 快速开始

```bash
git clone git@github.com:vme-im/vme-app.git
cd vme-app && npm install

cp .env.local.example .env.local   # 按需填入 NEXTAUTH_SECRET、GitHub OAuth、R2 凭据等

npm run dev      # 启动开发服务器
npm run lint     # ESLint
npm test         # 单元测试（Vitest）
```

## 🎯 核心规范 (Human & Agent)

### 🎭 梗文化术语表

为了保持项目"疯四"文化的统一性，严禁使用通用枯燥术语。**在撰写代码注释、API 输出或 UI 文案时必须遵循：**

| 通用术语 (禁止)      | **项目专用术语 (必用)** |
| :------------------- | :---------------------- |
| 段子 (Joke)          | **文案**                |
| 提交 (Submit)        | **投稿 / 上交**         |
| 贡献者 (Contributor) | **文案鬼才**            |
| 排行榜 (Leaderboard) | **V50 英雄榜**          |
| 评分 (Score)         | **V50 指数**            |

> 词汇之上的**腔调红线与页面口径**见 [UI 风格指南 §8 文案尺度](./style-guide.md#8-文案尺度)。

<details>
<summary>🤖 <b>AI Agent 协作专项指令 (点击展开)</b></summary>

致 AI 智能体：本指南与 vme-content 的架构规格共同构成"单一事实来源"。

- **术语强制**：严禁在生成内容中使用"乞讨/乞丐"等词汇。
- **架构尊重**：读模型默认走 [`SqlSnapshotProvider`](../../src/lib/data-access/sql-snapshot-provider.ts)；API 路由统一使用 `NextResponse.json()`。
- **审核逻辑**：投稿审核全部在 vme-content（`actions_scripts/src/moderationLogic.ts`），本仓不重复实现。
- **风格一致性**：强制遵循 [UI 风格指南](./style-guide.md) 中的新野兽派规范。
</details>

---

## 🔧 系统架构（速览）

**真相层 = GitHub Issues**，所有数据由 vme-content 的 `createData` 流水线产出 `snapshot.sql`，vme-app 仅作读模型与界面：

```
GitHub Issues (vme-im/vme-content)
        │
        ▼  fetchIssues + tagger + generateSnapshotSql
data/snapshot.sql      ← 提交进 vme-content（唯一读模型产物）
        │
        ▼  raw.githubusercontent
vme-app SqlSnapshotProvider (sql.js + 5min TTL)
        │
        ▼
Web 展示 / 开放 API
```

无 DB 应急回退：远端 fetch 失败时 provider 自身回退上次 good model 或空 db，不整站 500，且内置 429/5xx 退避重试。`SNAPSHOT_BASE_URL` 可指向自有镜像；生产建议走 jsDelivr CDN（`https://cdn.jsdelivr.net/gh/vme-im/vme-content@main`）避开 raw.githubusercontent 匿名限速，秒级生效由 vme-content 侧 push 后 `curl https://purge.jsdelivr.net/gh/vme-im/vme-content@main/data/snapshot.sql` 兜底。点赞实时拉 GitHub Reactions（详情页交互）。完整决策日志与扩张路线见架构规格。

---

## 🛠 技术深度探索

- 🎨 [UI 视觉风格指南 (新野兽派)](./style-guide.md)
- 📦 [组件结构说明](./components.md)

## 🤝 贡献流程

1. Fork 本仓库。
2. 创建 `feature/` 分支。
3. 提交 PR（请确保符合术语规范，本地跑通 `npm run lint` 与 `npm test`）。
