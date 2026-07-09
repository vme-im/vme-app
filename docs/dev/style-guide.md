# UI 视觉风格指南（疯狂小报 / Crazy Thursday Daily）

> 本文档是 vme-app 前端视觉的唯一权威。改动界面前先读这里，尤其是「硬性禁令」与「层级三档」。
> 文案用词另受 [`README.md` 术语表](./README.md) 约束（如「文案 / 投稿 / 文案鬼才 / 英雄榜」）。

## 1. 设计理念

站点定位是一份**自嘲式的沙雕报纸**——《疯狂星期四日报·一周只疯一天的日报》。
它保留新野兽派 DNA（红黄黑奶白、黑色硬阴影、粗黑边框），但引入**报纸的排版纪律**：
期数、日期栏、分栏线、栏目眉、byline 这些「报纸家具」本身就是装饰，不靠 emoji 和旋转贴纸堆气氛。

一句话方针：**克制是为了让疯狂更有效**。头版该炸的地方炸（大字号刊名、今日头条、页尾 CTA），
栏目区收干净（纯排版 + 分栏线）。

---

## 2. 层级三档（核心纪律）

界面元素按重要性分三档，装饰额度**逐档递减**：

| 档位       | 适用区域                     | 允许的装饰                                                                               |
| :--------- | :--------------------------- | :--------------------------------------------------------------------------------------- |
| **头版级** | 报头刊名、今日头条、页尾 CTA | 全部：大字号、贴纸标签、硬阴影、色块、±1~3° 旋转                                         |
| **栏目级** | 各 section                   | 仅一条**栏目眉**（小号红色粗体栏目名）+ 内容；不用大标题条、不用 emoji 前缀              |
| **列表级** | 文案条目                     | 纯排版：正文 + byline，`news-rule` 分栏线分隔；无卡片边框、无阴影、无旋转、无 emoji 背景 |

---

## 3. 硬性禁令

- **禁止中文假斜体**：任何中文文本不得使用 `italic`。标题靠 `font-black`（900）+ 字号撑气场。
  仅英文装饰词（走 `--font-display` / Mona Sans）可用 italic。改动后请 `grep italic` 自查。
- **禁止 emoji 作装饰**：背景大 emoji、标题前缀 emoji 一律移除。正文里用户自己写的 emoji 保留。
- **双语标签只允许出现在报头和 Footer**。内容区不再出现「VIEW ARCHIVE / 查看全部」式双语并排。
- **禁止硬编码色值**：只用 `@theme` 代币，马卡龙色（粉/紫/青/杏）已全部退役。
- **红色纪律**：`kfc-red` 只用于刊头点缀、栏目眉、CTA、关键强调，**不做大面积底色**（页尾 CTA 除外）。
- **hover 统一**（见 §6）：可点击卡片按压方向一致；纯文字链接只变红。不再随机 `-translate-y-1`。
- **动画降级**：所有装饰性动画必须响应 `prefers-reduced-motion`（见 §7）。

---

## 4. 设计代币（Design Tokens）

全部定义在 [`src/app/globals.css`](../../src/app/globals.css) 的 `@theme` 中。

### 配色

| 代币   | Hex       | Tailwind 类           | 用途                                                        |
| :----- | :-------- | :-------------------- | :---------------------------------------------------------- |
| KFC 红 | `#c41200` | `kfc-red`             | 刊名点缀、栏目眉、CTA、强调                                 |
| KFC 黄 | `#ffc72c` | `kfc-yellow`          | 贴纸标签、号外条、caption、高亮                             |
| 奶白   | `#f4f1ea` | `kfc-cream`           | 报头/页面底色（牛皮纸质感）                                 |
| 纯黑   | `#121212` | `kfc-black` / `black` | 文字、边框、硬阴影、导航横条                                |
| 分栏线 | `#c9c5b8` | `news-rule`           | 分栏线、细规则线（`border-news-rule` / `divide-news-rule`） |
| 报纸灰 | `#6b6b62` | `news-gray`           | byline、日期栏、辅助信息                                    |

### 阴影（黑色硬位移阴影）

`shadow-neo-sm`（2px）/ `shadow-neo`（4px）/ `shadow-neo-lg`（6px）/ `shadow-neo-xl`（8px）；
另有 `shadow-neo-red` / `shadow-neo-yellow` 备用。

### 字体

| 代币                                     | 字体                   | 用途                                                   |
| :--------------------------------------- | :--------------------- | :----------------------------------------------------- |
| `--font-sans`                            | PingFang SC / 微软雅黑 | 正文                                                   |
| `--font-display`（`font-display`）       | Mona Sans              | 英文装饰词、数字、报头 overline（可 italic、拉开字距） |
| `--font-serif-news`（`font-serif-news`） | Songti SC / SimSun     | **仅小面积**报纸点缀：日期栏、引言。不用于大标题       |

### 图标

统一走 [`@/components/shared/Icon`](../../src/components/shared/Icon.tsx)（内联 SVG，lucide 风格描边）：
`<Icon name="arrow-right" className="..." />`。Font Awesome 已退役，禁止再引入 `fa fa-*`。

---

## 5. 报纸家具（Newspaper Furniture）

这些是「疯狂小报」的识别性构件，优先用它们表达报纸感，而不是加 emoji。

### 报头（Masthead）— `src/components/shared/Header.tsx`

自上而下：

1. **日期栏**：`font-serif-news` 小字，`news-gray`。左侧「第 N 期 · YYYY 年 M 月 D 日 · 星期X」，
   右侧倒计时（周四当天红字「今天就是疯狂星期四」）+「N 位文案鬼才在线」。随页面滚动隐去。
2. **刊名**：overline「CRAZY THURSDAY NEWS PORTAL」（`font-display`、`uppercase`、拉开字距）；
   大刊名「疯狂星期四**日报**」（`font-black`，「日报」二字 `kfc-red`，**不 italic**）；
   副题「一周只疯一天的日报」（`news-gray`）；`border-b-4 border-double border-black` 双线压底。
3. **导航横条**：`bg-kfc-black` 白字，`sticky top-0 z-50`（作为 header 的兄弟节点，容器块为整页列，
   故可全程吸顶）。当前页高亮 `bg-kfc-red` 白字，非当前页 hover 变 `kfc-yellow`。登录按钮驻留其中。
   移动端汉堡菜单见 §7。

### 号外条（Ticker）— `src/components/shared/TickerBanner.tsx`

报头下方一条**克制的**跑马灯：`bg-kfc-yellow` 薄条（`py-1`）、慢速（`animate-marquee-slow`）、
`✦` 印刷体分隔、无食物 emoji。保留「号外」性格但降噪。

### 栏目眉（Section Eyebrow）

```jsx
<div className="text-kfc-red text-xs font-black tracking-wide">专栏 · {标签名}</div>
```

用文案真实 `tags` 数据；没有 tags 时回退「专栏 · 精选」。可选右侧同行放「查看全部 →」纯文字链接。

### byline

```jsx
<p className="text-news-gray text-xs">
  文 / <Link className="text-kfc-black hover:text-kfc-red font-bold">@{username}</Link>
  {' · '}
  {日期}
  {' · ♥ '}
  {reactions.totalCount}
</p>
```

作者名可点击（跳 `/authors/{username}`）。日期用 `toLocaleDateString('zh-CN', { year, month, day })`。

### 贴纸标签（Sticker，仅头版级）

黄底/白底 + `border-2 border-black` + `shadow-neo-sm`，可 `rotate-2` 等 ±1~3° 旋转。
例：今日头条标签、热图 caption 条「本期热图」。

### 版面条（Section Strip）

替代彩色标签卡：`bg-kfc-black` 横条，黄字栏名 +「{tag}{count}」链接列表（count 用 `kfc-yellow`）。

### Footer 版权栏 — `src/components/shared/Footer.tsx`

报纸报尾：`bg-kfc-black`，一行报眉 + 一行导航 + 细规则线 + 版权/免责。此处**允许双语**。

---

## 6. 组件模式与交互

### NeoButton — 唯一按钮组件

[`src/components/shared/NeoButton.tsx`](../../src/components/shared/NeoButton.tsx)。
变体 `primary/secondary/black/ghost`，尺寸 `sm/md/lg`，`icon` 传 Icon 名称。

### hover 统一规范

| 元素              | hover 行为                                                                                                                                      |
| :---------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| 可点击卡片 / 按钮 | `translate(-2px,-2px)` + 阴影 `neo` → `neo-lg`（按压感方向一致）。Tailwind：`hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo-lg` |
| 纯文字链接        | 文字变 `kfc-red`（导航横条上是变 `kfc-yellow`）                                                                                                 |

不再使用 `-translate-y-1` 等随机位移。

### 卡片基线

`border-3 border-black` + `bg-white` + `shadow-neo`，配合上面的 hover。仅用于头版级/需要卡片语义处；
列表级文案条目**不套卡片**。

---

## 7. 动画与无障碍

- 动画工具类：`animate-marquee` / `animate-marquee-slow`（号外条）、`animate-neo-blink`（在线指示点）。
- 移动端菜单：容器 `id="mobile-menu"`，用 `hidden` class 切换显隐（**class 驱动**，非内联 style）；
  展开动画由 `globals.css` 的 `#mobile-menu:not(.hidden)` 触发 `slideDown`。
- `prefers-reduced-motion: reduce` 下，上述动画统一降为瞬时（`0.01ms` / 单次），
  规则集中在 `globals.css` 底部，新增装饰动画需同步登记进去。

---

## 8. 期数机制

创刊号 = **2024-01-04**（2024 年第一个周四）。计算集中在纯函数
[`src/lib/issue-number.ts`](../../src/lib/issue-number.ts)（含单测），要点：

- 一律按**中国时区（UTC+8）**换算日期分量与自然日。
- 期数 = 当前日距创刊号过了多少个完整周（每周四进一期）+ 1。
- `getIssueInfo()` 产出日期栏所需的 `dateLine` / `countdownLabel` / `isThursday` 等字段。
- 由**服务端**（`layout.tsx`）计算后作为 prop 传入 Header，避免客户端算日期造成水合不一致；
  页面在 ISR（`revalidate 3600`）下时效足够。

---

## 9. 文案尺度

自嘲、抽象、玩梗，但**不促销腔**（不要「限时」「火爆」「快来」）。
现有 slogan（「不疯狂不星期四」「V ME 50」「精神状态遥遥领先」等）尽量复用，别自己发明促销话术。
详见 [`README.md` 术语表](./README.md)。
