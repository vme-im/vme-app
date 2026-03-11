// ============================================================
// 疯四文案标签体系
// 设计原则：少而精、高区分度、贴合疯四文案特点
// ============================================================

// 情绪向：读完这篇文案，读者的核心感受是什么？
export const TONE_TAGS = [
  '温情',
  '荒诞', // 替代"无厘头"，更精准
  '抽象',
  '自嘲',
  '讽刺',
  '黑色幽默',
  '暴躁',
  '尴尬',
  '甜蜜',
  '崩溃',
  '治愈',
  '魔性',
  '摆烂',
  '冷幽默',
  '心酸',
  '无奈',
  '怀旧',
  '卑微',
  '破防',
  '凡尔赛',
  '阴阳怪气',
  '中二',
]

// 题材向：去掉KFC结尾后，正文讲的是什么话题？
export const THEME_TAGS = [
  '职场',
  '恋爱',
  '网恋',
  '单身',
  '家庭',
  '朋友',
  '群聊', // 大量文案围绕群聊场景
  '考试',
  '校园',
  '租房',
  '加班',
  '工资',
  '游戏',
  '旅行',
  '相亲',
  '熬夜',
  '宠物',
  '理财',
  '社交',
  '追星',
  '八卦',
  '创业',
  '大厂',
  '面试',
  '古风', // 武侠/历史/仙侠类
]

// 手法向：这篇文案用了什么创作技巧？
export const STYLE_TAGS = [
  '对话',
  '排比',
  '谐音梗',
  '夸张',
  '押韵',
  '口号',
  '通知', // 模仿通知/公告格式
  '吐槽',
  '清单',
  '模仿', // 模仿新闻/考题/论文/说明书等特定格式
  '诗歌',
  '书信',
  '翻译腔',
  '拟人',
  '字符画',
  '角色扮演', // 扮演名人/虚构角色
]

export const FALLBACK_TAG = '其他'

type TagDimension = 'tone' | 'theme' | 'style'

const buildTagIndex = (tags: string[], dimension: TagDimension, prefix: string) => {
  return tags.reduce<Record<string, { dimension: TagDimension; description: string }>>(
    (acc, tag) => {
      acc[tag] = {
        dimension,
        description: `${prefix}：${tag}`,
      }
      return acc
    },
    {},
  )
}

export const TAG_TAXONOMY: Record<string, { dimension: TagDimension; description: string }> = {
  ...buildTagIndex(TONE_TAGS, 'tone', '情绪向'),
  ...buildTagIndex(THEME_TAGS, 'theme', '题材向'),
  ...buildTagIndex(STYLE_TAGS, 'style', '风格向'),
}

export const TAG_DISPLAY_OVERRIDES: Record<string, { label?: string; description?: string }> = {
  // 情绪向
  温情: { description: '温柔刀已上膛，暖到心头' },
  荒诞: { description: '离谱得很合理，脑洞飞起' },
  抽象: { description: '抽象值爆表，离谱但合理' },
  自嘲: { description: '自黑天花板，笑着流泪' },
  讽刺: { description: '阴阳能量充足，话里有话' },
  黑色幽默: { description: '笑着流泪，冷到发光' },
  暴躁: { description: '火气直接拉满，脾气开大' },
  尴尬: { description: '脚趾施工队，社死现场' },
  甜蜜: { description: '糖分超标，心动超速' },
  崩溃: { description: '心态碎一地，情绪大翻车' },
  治愈: { description: '精神回血包，瞬间暖起来' },
  魔性: { description: '洗脑循环播放，停不下来' },
  摆烂: { description: '躺平不挣扎，佛到极致' },
  冷幽默: { description: '冷到发光，笑点很冷' },
  心酸: { description: '苦中带笑，扎心又好笑' },
  无奈: { description: '叹气三连，生活就这样' },
  怀旧: { description: '回忆杀触发，时光倒带' },
  卑微: { description: '低到尘埃里，还在硬撑' },
  破防: { description: '情绪防线失守，瞬间崩溃' },
  凡尔赛: { description: '炫得很含蓄，装得很高级' },
  阴阳怪气: { description: '话里有话，阴阳能量满格' },
  中二: { description: '中二病发作，热血开场' },
  // 题材向
  职场: { description: '打工人的怒吼，绩效风暴预警' },
  恋爱: { description: '修罗场开局，心跳直接超速' },
  网恋: { description: '屏幕那头的心动，奔现倒计时' },
  单身: { description: '孤勇者BGM起，独自发光' },
  家庭: { description: '家长里短即视感，真实到扎心' },
  朋友: { description: '塑料情谊见真章，友情试金石' },
  群聊: { description: '群友日常拉扯，水群现场' },
  考试: { description: '分数判官上线，心跳过山车' },
  校园: { description: '青春疼痛文学，回忆杀触发' },
  租房: { description: '房东文学现场，钱包在滴血' },
  加班: { description: '夜班永动机，黑眼圈加冕' },
  工资: { description: '到账即蒸发，月初即清零' },
  游戏: { description: '上分压力山大，队友不背锅' },
  旅行: { description: '说走就走体质，行李已就位' },
  相亲: { description: '社交尴尬拉扯，话题刹车' },
  熬夜: { description: '日夜颠倒现场，眼皮打架' },
  宠物: { description: '治愈系暴击，摸头即回血' },
  理财: { description: '钱包自我修行，账单在修行' },
  社交: { description: '社恐紧急撤退，尴尬值爆表' },
  追星: { description: '心动暴击现场，彩虹屁已就绪' },
  八卦: { description: '瓜田持续更新，吃瓜不眠' },
  创业: { description: '鸡血管够，梦想燃起来' },
  大厂: { description: '绩效风暴预警，加班雨不停' },
  面试: { description: '自我介绍循环，笑容硬撑' },
  古风: { description: '江湖侠气拉满，穿越感十足' },
  // 手法向
  对话: { description: '对话感拉满，节奏很顺' },
  排比: { description: '气势叠满，句式拉满' },
  谐音梗: { description: '谐音警告，梗点密集' },
  夸张: { description: '夸到起飞，离谱指数飙升' },
  押韵: { description: '节奏感拉满，顺口又上头' },
  口号: { description: '喊麦上线，口号感十足' },
  通知: { description: '公告体出没，严肃中带梗' },
  吐槽: { description: '火力全开，火线输出' },
  清单: { description: '列举到心慌，条条命中' },
  模仿: { description: '格式还原度拉满，以假乱真' },
  诗歌: { description: '诗意暴击，文艺值飙升' },
  书信: { description: '纸短情长，心里话拉满' },
  翻译腔: { description: '机翻味上线，味道很正' },
  拟人: { description: '万物皆可人设，角色感爆棚' },
  字符画: { description: '像素味拉满，视觉冲击' },
  角色扮演: { description: '入戏太深，人设不崩' },
}

const DEFAULT_DESCRIPTION_TEMPLATES: Record<TagDimension, string[]> = {
  tone: [
    '{tag}感拉满',
    '{tag}上头',
    '{tag}爆表',
    '{tag}暴击',
    '{tag}气氛到位',
    '{tag}情绪过山车',
    '{tag}情绪值飙升',
  ],
  theme: [
    '{tag}现场',
    '{tag}氛围爆满',
    '{tag}日常',
    '{tag}浓度超标',
    '{tag}日常即视感',
    '{tag}沉浸式',
  ],
  style: ['{tag}风拉满', '{tag}味十足', '{tag}节奏感', '{tag}腔调', '{tag}笔法'],
}

function hashTag(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

function getDefaultDescription(tag: string): string {
  const taxonomy = TAG_TAXONOMY[tag]
  if (!taxonomy) {
    return '高频出镜，热度在线'
  }
  const templates = DEFAULT_DESCRIPTION_TEMPLATES[taxonomy.dimension]
  const index = hashTag(tag) % templates.length
  return templates[index].replace('{tag}', tag)
}

export function getTagDisplay(tag: string): { label: string; description: string } {
  const override = TAG_DISPLAY_OVERRIDES[tag]
  const label = override?.label ?? tag
  const description = enhanceDescription(override?.description ?? getDefaultDescription(tag))
  return { label, description }
}

function enhanceDescription(description: string): string {
  if (description.length >= 8) {
    return description
  }
  const suffixes = [
    '，疯四味拉满',
    '，看完想V50',
    '，今日份爆款',
    '，情绪直给',
    '，上头警告',
    '，建议收藏',
    '，离谱但合理',
    '，戳中痛点',
    '，一秒上头',
    '，自带BGM',
    '，笑点很密',
    '，后劲十足',
    '，画面感强',
    '，氛围感到位',
    '，爆梗体质',
  ]
  const index = hashTag(description) % suffixes.length
  return `${description}${suffixes[index]}`
}
