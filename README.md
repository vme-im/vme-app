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

_包含本地开发、技术架构、[UI 风格指南](./docs/dev/style-guide.md)、[组件说明](./docs/dev/components.md) 以及 **AI Agent 专项指令**。_

## 🔌 API 接入指南

本项目提供开放 API 供第三方服务调用，所有接口均支持跨域（CORS）。

### 1. 随机获取文案

获取库中的一条随机文案。

- **URL**: `/api/random`
- **Method**: `GET`
- **Params**:
  - `format`: 可选。设为 `text` 仅返回纯文本内容，否则返回 JSON。
- **Example**: `https://vme.im/api/random?format=text`

### 2. 分页获取文案

获取分页后的文案列表。

- **URL**: `/api/items/page`
- **Method**: `GET`
- **Params**:
  - `page`: 页码（默认 1）
  - `pageSize`: 每页数量（默认 10）
- **Example**: `https://vme.im/api/items/page?page=1&pageSize=20`

### 3. 获取特定文案

通过 ID 获取指定文案的详细信息。

- **URL**: `/api/items/[id]`
- **Method**: `GET`
- **Example**: `https://vme.im/api/items/MDEyOklzc3VlNjM0NTY3ODkw`

### 4. 获取所有文案

一次性获取所有文案（最多 1000 条）。

- **URL**: `/api/items`
- **Method**: `GET`
- **Example**: `https://vme.im/api/items`

## 🔗 相关仓库

- [vme-app](https://github.com/vme-im/vme-app) - Web 应用与同步服务
- [vme-content](https://github.com/vme-im/vme-content) - 文案数据与自动化脚本
