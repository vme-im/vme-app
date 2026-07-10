# UI 视觉风格指南（疯四新野兽派 v2）

> 本文档是 vme-app 前端视觉的唯一权威。改动界面前先读这里，尤其是「硬性禁令」与「响度分级」。
> 文案用词另受 [`README.md` 术语表](./README.md) 约束（如「文案 / 投稿 / 文案鬼才 / 英雄榜」）。

## 1. 设计理念

站点是「疯狂星期四 VME50」——一个抽象、快节奏、自嘲刷梗的疯四文案站。
视觉语言是**新野兽派**：红黄黑奶白、黑色硬阴影、粗黑边框、黄底贴纸、大黑体。
贴纸和大字号是主角，但**响度必须分级**：不是每个元素都嚷嚷，才轮得到该嚷的元素嚷。

一句话方针：**响的地方炸，静的地方读**。首页头条区放开炸，列表和详情页让文案本身当主角。

---

## 2. 响度分级（核心纪律）

界面元素按「响度」分三档，装饰额度**逐档递减**。**每页最多一个最响元素**。

| 档位     | 适用区域                                   | 允许的装饰                                                                           |
| :------- | :----------------------------------------- | :----------------------------------------------------------------------------------- |
| **最响** | 站头、首页今日最疯、页尾 CTA、404/500 主卡 | 全部：大字号、大贴纸、硬阴影、色块、±1~3° 旋转                                       |
| **次响** | 各 section 标题、领奖台、投稿小卡          | 统一的 SectionTitle 标题贴纸（见 §5）+ 内容；不再自造大标题条                        |
| **安静** | 文案条目、byline、辅助说明                 | 纯排版：正文 + byline，`news-rule` 分隔线；无卡片边框、无阴影、无旋转、无 emoji 背景 |

每页的响度配比也有基准：**首页最吵**（头条区放开），**列表/详情等阅读页安静**，**投稿/状态页居中**。

---

## 3. 硬性禁令

- **禁止中文假斜体**：任何中文文本不得使用 `italic`。标题靠 `font-black`（900）+ 字号撑气场。
  仅英文装饰词（走 `--font-display` / Mona Sans）可用 italic。改动后请 `grep italic` 自查。
- **禁止衬线**：衬线字体已全站退役，没有 `--font-serif-news` 这个代币，也不要再引入。
- **禁止 emoji 作装饰**：背景大 emoji、标题前缀 emoji 一律移除。正文里用户自己写的 emoji 保留。
- **禁止报纸拟态**：刊名/期数/日期栏/栏目眉/「本报」「简讯」「版面」等报纸家具与报纸腔文案
  已全部退役，不要再回潮。倒计时「距下个疯狂星期四还有 N 天」是疯四梗不是报纸梗，保留。
- **双语标签只允许出现在站头和 Footer**。内容区不出现「VIEW ALL / 查看全部」式双语并排。
- **禁止硬编码色值**：只用 `@theme` 代币。
- **红色纪律**：`kfc-red` 只用于强调、贴纸、CTA、导航当前项，**不做大面积底色**（页尾 CTA 除外）。
- **hover 统一**（见 §6）：可点击卡片按压方向一致；纯文字链接只变红。不再随机 `-translate-y-1`。
- **动画降级**：所有装饰性动画必须响应 `prefers-reduced-motion`（见 §7）。

---

## 4. 设计代币（Design Tokens）

全部定义在 [`src/app/globals.css`](../../src/app/globals.css) 的 `@theme` 中。

### 配色

| 代币     | Hex       | Tailwind 类           | 用途                                                            |
| :------- | :-------- | :-------------------- | :-------------------------------------------------------------- |
| KFC 红   | `#c41200` | `kfc-red`             | 强调、红贴纸、CTA、导航当前项                                   |
| KFC 黄   | `#ffc72c` | `kfc-yellow`          | 标题贴纸、ticker、VME50 徽章、高亮                              |
| 奶白     | `#f4f1ea` | `kfc-cream`           | 站头/页面底色（牛皮纸质感）                                     |
| 纯黑     | `#121212` | `kfc-black` / `black` | 文字、边框、硬阴影、导航横条                                    |
| 细分隔线 | `#c9c5b8` | `news-rule`           | 列表分隔线、细规则线（`border-news-rule` / `divide-news-rule`） |
| 辅助灰   | `#6b6b62` | `news-gray`           | byline、次要信息                                                |

> `news-rule` / `news-gray` 是历史沿用的**变量名**，不承载报纸语义，不要改名。

### 阴影（黑色硬位移阴影）

`shadow-neo-sm`（2px）/ `shadow-neo`（4px）/ `shadow-neo-lg`（6px）/ `shadow-neo-xl`（8px）；
另有 `shadow-neo-red` / `shadow-neo-yellow` 备用。

### 字体

| 代币                               | 字体                   | 用途                                       |
| :--------------------------------- | :--------------------- | :----------------------------------------- |
| `--font-sans`                      | PingFang SC / 微软雅黑 | 正文与标题（大黑体 = `font-black` + 字号） |
| `--font-display`（`font-display`） | Mona Sans              | 英文装饰词、数字、VME50 徽章（可 italic）  |

### 图标

统一走 [`@/components/shared/Icon`](../../src/components/shared/Icon.tsx)（内联 SVG，lucide 风格描边）：
`<Icon name="arrow-right" className="..." />`。禁止引入 `fa fa-*`。

---

## 5. 识别性构件

### 站头（Header）— `src/components/shared/Header.tsx`

1. **站名**：大黑体「疯狂星期四」+ 黄底黑边 `VME50` 贴纸（`font-display`、`rotate-3`、`shadow-neo-sm`）；
   下一行 slogan「不疯狂不星期四」（`news-gray`）。`border-b-4 border-black` 压底。
2. **倒计时贴纸**（疯四梗，常驻显眼位）：「距下个疯狂星期四还有 N 天」白底黑边；
   周四当天变红底白字 + `-rotate-1`「今天就是疯狂星期四」。旁挂「N 位文案鬼才在线」。
   由**服务端**（`layout.tsx` 调 [`src/lib/crazy-thursday.ts`](../../src/lib/crazy-thursday.ts)，含单测）
   按**中国时区（UTC+8）**计算后作为 prop 传入，避免客户端算日期造成水合不一致。
3. **导航横条**：`bg-kfc-black` 白字，`sticky top-0 z-50`（作为 header 的兄弟节点，容器块为整页列，
   故可全程吸顶）。当前页高亮 `bg-kfc-red` 白字，非当前页 hover 变 `kfc-yellow`。登录按钮驻留其中。
   移动端汉堡菜单见 §7。

### SectionTitle — 全站唯一的 section 标题格式

[`src/components/shared/SectionTitle.tsx`](../../src/components/shared/SectionTitle.tsx)。
**所有页面的 section 标题一律用它**，不再各自发明标题条——这是全站观感统一的钥匙。

```jsx
<SectionTitle label="新鲜出炉" action={{ label: '查看全部', href: '/jokes' }} />
```

格式：黄底黑边贴纸（`bg-kfc-yellow border-2 border-black shadow-neo-sm -rotate-1 text-xs font-black`）

- 可选右侧纯文字动作链接（`news-gray` hover 变红，自带「→」）。
  右侧也可挂自定义内容（`children`，如英雄榜的排序 tab）。
  页头用法：SectionTitle + 大黑体 `h1` + `border-b-4 border-black` 底线（见 /jokes、/submit、/status）。

### Ticker — `src/components/shared/TickerBanner.tsx`

站头下方一条克制的跑马灯（原版就有的梗文化）：`bg-kfc-yellow` 薄条（`py-1`）、
慢速（`animate-marquee-slow`）、`✦` 分隔、无食物 emoji。文案全是疯四梗，不写报纸腔。

### byline

```jsx
<p className="text-news-gray text-xs">
  <Link className="text-kfc-black hover:text-kfc-red font-bold">@{username}</Link>
  {' · '}
  {日期}
  {' · ♥ '}
  {reactions.totalCount}
</p>
```

统一格式「@作者 · 日期 · ♥ N」。作者名可点击（跳 `/authors/{username}`）。
日期用 `toLocaleDateString('zh-CN', { year, month, day })`。

### 贴纸（Sticker，最响级）

黄底/白底/红底 + `border-2 border-black` + `shadow-neo-sm`，可 `rotate-2` 等 ±1~3° 旋转。
例：首页「今日最疯」、详情页「被 V 爆了」热贴纸、404「知情人士称」。
section 级贴纸一律走 SectionTitle，不要手写。

### 黑底标签条

`bg-kfc-black` 横条，黄字条名 +「{tag}{count}」链接列表（count 用 `kfc-yellow`）。见首页热门标签条。

### Footer — `src/components/shared/Footer.tsx`

`bg-kfc-black`：一行站名（疯狂星期四 VME50）+ 一行导航 + 细规则线 + 版权/免责。此处**允许双语**。

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
| 列表条目          | 左外侧伪元素长出 `kfc-red` 竖条（不占位、不推移内容），正文 `group-hover:text-kfc-red`                                                          |

不再使用 `-translate-y-1` 等随机位移。

### 卡片基线

`border-3 border-black` + `bg-white` + `shadow-neo`，配合上面的 hover。仅用于最响级/需要卡片语义处；
列表级文案条目**不套卡片**。

### 版式基线

- 阅读页：限宽阅读列（`max-w-3xl` 详情 / `minmax(0,1fr)_17rem` 列表 + 侧栏），文案是主角。
- 首页：保持信息密度——头条 / 三栏精选 / 双栏带（新鲜出炉 + 被 V 爆的）/ 金句 / 鬼才条 / CTA。

---

## 7. 动画与无障碍

- 动画工具类：`animate-marquee-slow`（ticker）、`animate-neo-blink`（在线指示点）。
- 移动端菜单：容器 `id="mobile-menu"`，用 `hidden` class 切换显隐（**class 驱动**，非内联 style）；
  展开动画由 `globals.css` 的 `#mobile-menu:not(.hidden)` 触发 `slideDown`。
- `prefers-reduced-motion: reduce` 下，上述动画统一降为瞬时（`0.01ms` / 单次），
  规则集中在 `globals.css` 底部，新增装饰动画需同步登记进去。

### 移动端触控基线

- 可点目标在移动端 **≥44px**（`min-h-[44px]` 配 `md:min-h-0` / `lg:min-h-0` 还原桌面尺寸）。
- 表单输入控件字号 **≥16px**（`text-base`），防 iOS 聚焦自动放大。
- **grid/flex 里装用户生成内容（文案正文、GitHub 用户名）必须 `min-w-0` + `wrap-anywhere`**：
  `break-words`（`overflow-wrap: break-word`）不参与 min-content 内在尺寸计算，
  超长无断点串（"v5v5v5…"、39 字符用户名）会把容器撑爆；`wrap-anywhere` 才参与。
- 信息密集条在窄屏优先换行（`flex-col sm:flex-row`），不靠 truncate 硬裁。

---

## 8. 文案尺度

自嘲、抽象、玩梗。现有 slogan（「不疯狂不星期四」「V ME 50」「精神状态遥遥领先」等）和
网络 meme 优先复用——**复制粘贴是疯四文化的本质，引用不算尬**。

**四种腔调是红线**（判别 + 改法）：

| 红线       | 症状示例（禁止）                   | 改法                         |
| :--------- | :--------------------------------- | :--------------------------- |
| 促销腔     | 限时 / 火爆 / 快来 / 荣登          | 直白陈述：「写得好就上首页」 |
| 公文腔     | 请填写标题 / 此操作需要 / 内容应当 | 口语直给：「标题还空着」     |
| 客服卖萌腔 | 开小差了 / 别走开 / 已经帮你恢复   | 说人话：「没点上，再试一次」 |
| AI 空话    | 让每一条文案都有自己的味道         | 删掉，或换成有信息量的实话   |

补充三条：系统提示不用感叹号；报错宁可直白也不硬塞梗；报纸腔（本报/刊/版面）已随
「日报」设定退役，不再出现。

**非直觉命名对照**（只收看现状猜不到的，全量以页面实现为准，勿在此堆清单）：
高赞 =「被 V 爆的 / 被 V 爆了」、互动区 =「表个态」、投稿页 =「交作业」、
状态页 =「后厨监控」、作者档 =「谁写的 / 鬼才档案」、评分 =「V50 指数」。

词汇级替换表（文案 / 上交 / 文案鬼才 / V50 英雄榜）见 [`README.md` 术语表](./README.md)。
