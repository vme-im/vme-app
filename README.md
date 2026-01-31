# 🍗 vme-app - Web 应用与同步服务

> 本仓库负责 **Web 应用** 与 **同步 API**。  
> 文案数据与自动化脚本已拆分至 **vme-content**。

## ✨ 项目概览

- 🎯 **社区驱动** - 通过 GitHub Issues 收集和管理文案内容
- 🎲 **随机推荐** - 每次访问都有新的文案惊喜
- 👑 **V50 英雄榜** - 展示最受欢迎的文案鬼才
- 📊 **实时互动** - 支持点赞、评论等社交功能
- 📱 **完美适配** - 响应式设计，手机电脑都能畅享
- ⚡ **极速体验** - 智能缓存，秒开页面

## 🧩 仓库职责

- **Web 应用**：页面展示与互动
- **同步 API**：通过 Cron 增量同步数据到 Neon
- **LLM 打标**：对文案进行内容分析与标签输出

## 🚀 使用入口

```
https://vme.im/submit
```

## 🔁 同步策略（拆分后）

- 统一采用 **增量同步（Cron）**
- GitHub Actions **不再作为同步入口**

## 📖 开发者与协作指南

如果您是开发者或 AI Agent，请查阅：

### 💻 [开发者与 Agent 协作指南](./docs/dev/README.md)
*包含本地开发、技术架构、[UI 风格指南](./docs/dev/style-guide.md)、[组件说明](./docs/dev/components.md) 以及 **AI Agent 专项指令**。*

## 🔗 相关仓库

```
https://github.com/vme-im/vme-app
https://github.com/vme-im/vme-content
```
