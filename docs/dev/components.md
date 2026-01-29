# 组件结构说明

## 📁 目录结构

```
src/components/
├── jokes/           段子功能模块
├── reactions/       互动反应模块
├── leaderboard/     排行榜模块
├── submit/          提交模块
├── status/          状态监控模块
├── shared/          共享组件
└── IconLink.tsx     # 图标链接（通用）
```

## 🎯 模块职责

- **Jokes**: 获取分页数据，渲染列表结构，批量获取互动数据。
- **Reactions**: 管理数据获取、状态、用户会话，展示反应按钮。
- **Leaderboard**: 获取和展示排行榜数据，排序方式切换。
- **Submit**: 段子提交表单，背景动画。
- **Status**: 系统状态和 API 限流监控。
- **Shared**: 通用组件（CopyButton, Pagination, etc）。

## 💡 设计原则

1. **按功能分组**: 相关组件放在同一模块。
2. **清晰的分层**: UI、逻辑、状态分离。
3. **性能优化**: 批量获取互动数据，避免重复请求。
