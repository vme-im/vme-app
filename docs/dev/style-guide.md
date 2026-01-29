# UI 视觉风格指南 (UI Style Guide)

## 1. 设计理念 (Design Philosophy)

**疯狂星期四-新野兽派 (Crazy Thursday Neo-Brutalism)**

本项目采用极具视觉冲击力的"新野兽派"风格，旨在致敬肯德基"疯狂星期四"的营销文化。核心特征包括：

- **高对比度 (High Contrast)**: 使用极高饱和度的红黄配色，配合黑色实线，产生强烈的视觉刺激。
- **粗犷排版 (Bold Typography)**: 大量使用粗体、斜体和超大字号，强调情绪宣泄和呐喊感。
- **硬阴影 (Hard Shadows)**: 摒弃柔和的模糊阴影，统一使用黑色实线位移阴影，模拟贴纸或拼贴画的质感。
- **梗文化 (Meme Culture)**: 界面设计融入"土味"但潮酷的梗图元素，营造轻松诙谐的社区氛围。

---

## 2. 配色方案 (Color Palette)

| 颜色名称 | Hex 代码 | Tailwind 类 | 用途 |
| :--- | :--- | :--- | :--- |
| **KFC 红** | `#C41200` | `bg-kfc-red` / `text-kfc-red` | 核心品牌色，用于主标题、CTA按钮、强调边框 |
| **KFC 黄** | `#FFC72C` | `bg-kfc-yellow` / `text-kfc-yellow` | 辅助品牌色，用于高亮背景、装饰标签、次级按钮 |
| **奶昔白 (底色)** | `#F4F1EA` | `bg-kfc-cream` | 页面背景色，模拟牛皮纸或旧报纸的质感 |
| **纯黑** | `#121212` | `bg-black` / `text-black` | 文字、边框、硬阴影 |
| **纯白** | `#FFFFFF` | `bg-white` | 卡片背景，用于在奶昔白底色上区分内容 |

---

## 3. 排版规范 (Typography)

### 字体家族
- **正文 (Sans)**: `"PingFang SC"`, `"Microsoft YaHei"`, `sans-serif`
- **装饰标题 (Display)**: `"Mona Sans"`, `sans-serif` (主要用于英文数字/口号)
- **趣味字体 (Funny)**: `"Comic Sans MS"`, `cursive` (用于手写体装饰)

### 标题样式
- **H1**: 特粗 (Extra Bold) + 斜体 (Italic)。通常配合下划线或文字阴影。
- **文本修饰**:
  - `uppercase`: 英文口号统一大写。
  - `text-justify`: 长段子内容使用两端对齐。

---

## 4. UI 组件规范 (UI Components)

### 卡片 (Cards)
页面中的所有内容区块都应遵循以下"硬核"卡片样式：
- **边框**: `border-3 border-black` (3px 黑色实线)
- **阴影**: `shadow-neo` (4px 黑色硬阴影) 或 `shadow-neo-lg` (6px 黑色硬阴影)
- **交互**: 悬停时通过 `translate-x/y` 产生位移，同时改变阴影大小，模拟物理按压感。

```jsx
// 卡片示例
<div className="border-3 border-black bg-white p-6 shadow-neo transition-all hover:-translate-y-1 hover:shadow-neo-lg">
  {/* 内容 */}
</div>
```

---

## 5. 布局模式 (Layout Patterns)

- **报纸网格**: 采用类似报纸排版的多列布局 (Masonry/Grid)。
- **醒目头版 (Hero)**: 巨大的文字排版，配合不对称的装饰元素，模仿传单海报。
- **置顶横幅**: 鲜艳的红/黄配色顶栏，可包含滚动文字效果。
