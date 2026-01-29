# 开发者与协作指南

> 本文档面向所有开发者（包括人类与 AI Agent）。

## 🚀 快速开始

### 本地部署
```bash
# 1. 克隆与安装
git clone https://github.com/zkl2333/vme.git
cd vme && npm install

# 2. 环境配置
cp env.local.example .env.local

# 3. 启动开发环境
npm run dev
```

## 🎯 核心规范 (Human & Agent)

### 🎭 梗文化术语表
为了保持项目"疯四"文化的统一性，严禁使用通用枯燥术语。**在撰写代码注释、API 输出或 UI 文案时必须遵循：**

| 通用术语 (禁止) | **项目专用术语 (建议)** | 备注 |
| :--- | :--- | :--- |
| 段子 (Joke) | **文案** | 核心资产 |
| 提交 (Submit) | **投稿 / 上交** | 互动感 |
| 贡献者 (Contributor) | **文案鬼才** | 用户角色感 |
| 排行榜 (Leaderboard) | **V50 英雄榜** | 荣誉感 |
| 评分 (Score) | **V50 指数** | |

<details>
<summary>🤖 <b>AI Agent 协作专项指令 (点击展开)</b></summary>

致 AI 智能体：此文件是项目"单一事实来源"。
- **术语强制**：严禁在生成内容中使用"乞讨/乞丐"等词汇。
- **架构尊重**：优先加载静态 JSON 数据，API 路由统一使用 `NextResponse.json()`。
- **审核逻辑**：审核相关改动必须符合 `actions_scripts/src/moderationLogic.ts`。
- **风格一致性**：强制遵循 [UI 风格指南](./style-guide.md) 中的新野兽派规范。
</details>

---

## 🔧 系统架构

项目采用 **双层架构 (Two-Layer Architecture)**：

### 层级 1：自动化与数据层
*   **路径：** `actions_scripts/`
*   **职责：** 处理 GitHub Issues 数据摄入、审核及 JSON 生成。
*   **关键逻辑：** AI 辅助审核 + 莱文斯坦距离查重。

### 层级 2：Web 应用层
*   **路径：** `src/` (Next.js 14)
*   **策略：** 静态数据从 `data/` 读取，交互数据（点赞等）通过 GitHub API 实时获取。

---

## 🛠 技术深度探索
- 🎨 [UI 视觉风格指南 (新野兽派)](./style-guide.md)
- 📦 [组件结构说明](./components.md)
- 🖼 [图文投稿扩展示例](./image-plan.md)

## 🤝 贡献流程
1. Fork 本仓库。
2. 创建 `feature/` 分支。
3. 提交 PR（请确保符合术语规范）。
