<div align="center">

# 🍗 vme-app

**疯狂星期四文案库 · Web 应用**

社区共创的 KFC「疯四」文案平台 —— 每个星期四都值得一句「V 我 50」。

[![Live](https://img.shields.io/badge/在线访问-vme.im-C41200?style=flat-square)](https://vme.im)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=000)](https://react.dev)
[![SQLite](https://img.shields.io/badge/sql.js-snapshot-003B57?style=flat-square&logo=sqlite&logoColor=fff)](https://sql.js.org)
[![Deploy](https://img.shields.io/badge/Vercel-部署-000000?style=flat-square&logo=vercel)](https://vercel.com)

[在线体验](https://vme.im) · [我要投稿](https://vme.im/submit) · [开放 API](#-开放-api) · [开发指南](./docs/dev/README.md)

</div>

---

## 这是什么

每周四，KFC 文案鬼才们在社交平台用千奇百怪的段落「乞求」一顿肯德基。**vme-app** 把这些「疯四文案」收集、审核、打标、归档，做成一个能随机刷、能排行榜、能开放调用的内容站。

- 🎲 **随机翻牌** —— 每次访问都有新文案，手气不好就再 V 一次
- 👑 **V50 英雄榜** —— 谁是真正的文案鬼才，数据说话
- 🏷️ **LLM 自动打标** —— 文案自动归类，按标签淘金
- 🔌 **开放 API** —— 全接口支持跨域，欢迎二次创作机器人
- 📱 **新野兽派 UI** —— 响应式、粗黑边、够「疯」

> 想了解整个生态：本仓库是 **Web 应用**；文案数据与自动化脚本在 [vme-content](https://github.com/vme-im/vme-content)。

## 🧩 仓库职责

| 模块         | 说明                                                          |
| :----------- | :------------------------------------------------------------ |
| **Web 应用** | 页面展示、随机推荐、V50 英雄榜、投稿入口、作者主页            |
| **读模型**   | 默认装载 vme-content 的 `snapshot.sql`（sql.js + 5 分钟 TTL） |
| **梗图上传** | 投稿表单图片 → Cloudflare R2                                  |

数据流向：`GitHub Issues 投稿` → `vme-content createData 产 data/snapshot.sql` → `vme-app SqlSnapshotProvider 经 raw.githubusercontent 装载` → `Web 展示`。

> 架构权威规格（含决策日志、双速架构、扩张路线）见 [`vme-content/docs/architecture.md`](https://github.com/vme-im/vme-content/blob/main/docs/architecture.md)。

## 🛠️ 技术栈

Next.js 16（App Router）· React 19 · Tailwind CSS 4 · sql.js · NextAuth · OpenAI · SWR · 部署于 Vercel。无独立数据库——读模型直接装载 vme-content 的 `snapshot.sql`，远端 fetch 失败时 provider 自身回退空 db 兜底（不整站 500）。

## 🚀 本地开发

```bash
git clone git@github.com:vme-im/vme-app.git
cd vme-app && npm install

cp .env.local.example .env.local   # 按需填入 NEXTAUTH_SECRET、GitHub OAuth、R2 凭据等

npm run dev      # 启动开发服务器
npm run lint     # ESLint
npm test         # 单元测试（Vitest）
```

> 读模型从远端 `raw.githubusercontent` 拉 `vme-content/data/snapshot.sql`，本地开发零数据库配置即可启动。需要指向自有快照镜像时设 `SNAPSHOT_BASE_URL`。

> 完整的本地配置、技术架构、UI 风格规范与 **AI Agent 协作指令**，见
> 👉 **[开发者与 Agent 协作指南](./docs/dev/README.md)**（含 [风格指南](./docs/dev/style-guide.md)、[组件说明](./docs/dev/components.md)）。

## 🔌 开放 API

所有接口均为 `GET` 且支持 CORS，欢迎接入你的 Bot / 小程序 / 群机器人。

| 接口              | 用途                                      | 示例                                                                                           |
| :---------------- | :---------------------------------------- | :--------------------------------------------------------------------------------------------- |
| `/api/random`     | 随机一条文案（`?format=text` 返回纯文本） | [`vme.im/api/random?format=text`](https://vme.im/api/random?format=text)                       |
| `/api/items/page` | 分页列表（`page`、`pageSize`）            | [`vme.im/api/items/page?page=1&pageSize=20`](https://vme.im/api/items/page?page=1&pageSize=20) |
| `/api/items/[id]` | 按 ID 获取单条                            | `vme.im/api/items/<id>`                                                                        |
| `/api/items`      | 全量文案（最多 1000 条）                  | [`vme.im/api/items`](https://vme.im/api/items)                                                 |

## 🤝 投稿与贡献

- ✍️ **投稿文案**：直接前往 [vme.im/submit](https://vme.im/submit)，按引导提交即可
- 🛠️ **代码贡献**：欢迎 PR；提交前请本地跑通 `npm run lint` 与 `npm test`
- 🎭 **文化约定**：本项目有专属「疯四」术语表（文案 / 投稿 / 文案鬼才 / V50 英雄榜），详见开发指南

## 🔗 相关仓库

- **[vme-app](https://github.com/vme-im/vme-app)** —— Web 应用（本仓库）
- **[vme-content](https://github.com/vme-im/vme-content)** —— 文案数据与自动化脚本

<div align="center">

**疯狂星期四，V 我 50。** 🍗

</div>
