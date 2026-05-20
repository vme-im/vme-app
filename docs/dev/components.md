# 组件结构说明

## 📁 目录结构

```
src/components/
├── jokes/              文案展示（卡片 / 列表 / 带互动列表）
├── leaderboard/        V50 英雄榜（列表 + 排序切换）
├── reactions/          GitHub Reactions 互动（按钮 / 登录态 / 容器）
├── submit/             投稿表单 + 配图上传
├── status/             系统状态与 GitHub 限流仪表盘
├── shared/             通用组件（Header / Footer / NeoButton / Pagination 等）
├── pwa-registration    PWA 注册（顶层 client 组件）
└── vercel-analytics    Vercel Analytics 注入
```

## 🎯 模块职责

- **jokes**: 服务端组件，分页拉取文案；`ListWithReactions` 把卡片与互动按钮拼装在一起。
- **leaderboard**: 文案鬼才排行榜，按 `total` / `meme` / `month` 切换排序维度。
- **reactions**: 详情页 / 卡片的点赞互动；真相走 GitHub Reactions，未登录走 `LoginDialog` 引导。
- **submit**: 投稿表单（文案 / 梗图），图片走 `/api/image-upload` 上 R2。
- **status**: `Dashboard` 拉 `/api/status`，监控 GitHub 限流与系统时间戳。
- **shared**: 跨页面的 UI 原件，遵循 [style-guide.md](./style-guide.md) 的新野兽派规范。

## 💡 设计原则

1. **按功能分组**：相关组件放在同一模块，跨模块依赖经 `shared/`。
2. **服务端优先**：文案展示走 RSC（`getKfcItemsWithPagination` 直读 `DataProvider`）；只在需要会话或交互时降到 client 组件。
3. **降级友好**：交互层（点赞 / 上传）失败不影响内容核心展示。
