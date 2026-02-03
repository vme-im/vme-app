export const TONE_TAGS = [
  '温情',
  '反转',
  '抽象',
  '自嘲',
  '讽刺',
  '励志',
  '无厘头',
  '黑色幽默',
  '暴躁',
  '尴尬',
  '甜蜜',
  '崩溃',
  '治愈',
  '魔性',
  '焦虑',
  '摆烂',
  '冷幽默',
  '心酸',
  '怀旧',
  '傲娇',
  '卑微',
  '破防',
  '凡尔赛',
  '阴阳怪气',
  '佛系',
  '燃',
  '中二',
  '正能量',
]

export const THEME_TAGS = [
  '职场',
  '恋爱',
  '学生',
  '社畜',
  '单身',
  '家庭',
  '朋友',
  '美食',
  '外卖',
  '考试',
  '租房',
  '加班',
  '游戏',
  '旅行',
  '通勤',
  '工资',
  '相亲',
  '节日',
  '熬夜',
  '天气',
  '宠物',
  '健身',
  '减肥',
  '理财',
  '网购',
  '社交',
  '追星',
  '校园',
  '亚文化',
  '科技',
  '八卦',
  '创业',
  '大厂',
  '面试',
]

export const STYLE_TAGS = [
  '对话',
  '独白',
  '故事',
  '排比',
  '谐音梗',
  '反问',
  '夸张',
  '押韵',
  '口号',
  '通知',
  '吐槽',
  '清单',
  '采访',
  '直播',
  '自问自答',
  '诗歌',
  '书信',
  '翻译腔',
  '纪录片',
  '会议纪要',
  '论文',
  '说明书',
  '拟人',
  '反讽',
  '隐喻',
  '蒙太奇',
  '字符画',
]

export const FALLBACK_TAG = '其他'

type TagDimension = 'tone' | 'theme' | 'style'

const buildTagIndex = (
  tags: string[],
  dimension: TagDimension,
  prefix: string,
) => {
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

export const TAG_TAXONOMY: Record<
  string,
  { dimension: TagDimension; description: string }
> = {
  ...buildTagIndex(TONE_TAGS, 'tone', '情绪向'),
  ...buildTagIndex(THEME_TAGS, 'theme', '题材向'),
  ...buildTagIndex(STYLE_TAGS, 'style', '风格向'),
}

export const TAG_DISPLAY_OVERRIDES: Record<
  string,
  { label?: string; description?: string }
> = {
  '乞讨': { label: '求赞', description: '硬核求赞 v50' },
  '感情': { description: '破碎感拉满，心碎BGM起' },
  '哲学': { description: '废话文学大赏，听完像顿悟' },
  '职场': { description: '打工人的怒吼，绩效风暴预警' },
  '恋爱': { description: '修罗场开局，心跳直接超速' },
  '社畜': { description: '今日份PUA，精神值告急' },
  '单身': { description: '孤勇者BGM起，独自发光' },
  '家庭': { description: '家长里短即视感，真实到扎心' },
  '朋友': { description: '塑料情谊见真章，友情试金石' },
  '美食': { description: '馋虫全面上线，味蕾报警' },
  '外卖': { description: '骑手急速赶来，热气还在' },
  '考试': { description: '分数判官上线，心跳过山车' },
  '租房': { description: '房东文学现场，钱包在滴血' },
  '加班': { description: '夜班永动机，黑眼圈加冕' },
  '游戏': { description: '上分压力山大，队友不背锅' },
  '旅行': { description: '说走就走体质，行李已就位' },
  '通勤': { description: '地铁挤压体验，早高峰修行' },
  '工资': { description: '到账即蒸发，月初即清零' },
  '相亲': { description: '社交尴尬拉扯，话题刹车' },
  '节日': { description: '仪式感拉满，氛围组上线' },
  '熬夜': { description: '日夜颠倒现场，眼皮打架' },
  '天气': { description: '情绪随天变，晴雨皆戏' },
  '宠物': { description: '治愈系暴击，摸头即回血' },
  '健身': { description: '燃脂警报拉响，汗水预警' },
  '减肥': { description: '明天一定开始，今晚先吃' },
  '理财': { description: '钱包自我修行，账单在修行' },
  '网购': { description: '购物车失控，快递堆成山' },
  '社交': { description: '社恐紧急撤退，尴尬值爆表' },
  '追星': { description: '心动暴击现场，彩虹屁已就绪' },
  '校园': { description: '青春疼痛文学，回忆杀触发' },
  '科技': { description: '赛博感拉满，未来感爆棚' },
  '八卦': { description: '瓜田持续更新，吃瓜不眠' },
  '创业': { description: '鸡血管够，梦想燃起来' },
  '大厂': { description: '绩效风暴预警，加班雨不停' },
  '面试': { description: '自我介绍循环，笑容硬撑' },
  '温情': { description: '温柔刀已上膛，暖到心头' },
  '反转': { description: '剧情急刹车，反转来得猛' },
  '抽象': { description: '抽象值爆表，离谱但合理' },
  '自嘲': { description: '自黑天花板，笑着流泪' },
  '讽刺': { description: '阴阳能量充足，话里有话' },
  '励志': { description: '鸡血管够，热血不断电' },
  '无厘头': { description: '离谱得很合理，脑洞飞起' },
  '黑色幽默': { description: '笑着流泪，冷到发光' },
  '暴躁': { description: '火气直接拉满，脾气开大' },
  '尴尬': { description: '脚趾施工队，社死现场' },
  '甜蜜': { description: '糖分超标，心动超速' },
  '崩溃': { description: '心态碎一地，情绪大翻车' },
  '治愈': { description: '精神回血包，瞬间暖起来' },
  '魔性': { description: '洗脑循环播放，停不下来' },
  '焦虑': { description: '内耗拉扯局，心跳停不下' },
  '摆烂': { description: '躺平不挣扎，佛到极致' },
  '冷幽默': { description: '冷到发光，笑点很冷' },
  '心酸': { description: '苦中带笑，扎心又好笑' },
  '怀旧': { description: '回忆杀触发，时光倒带' },
  '傲娇': { description: '嘴硬心软派，口嫌体正直' },
  '卑微': { description: '低到尘埃里，还在硬撑' },
  '破防': { description: '情绪防线失守，瞬间崩溃' },
  '凡尔赛': { description: '炫得很含蓄，装得很高级' },
  '阴阳怪气': { description: '话里有话，阴阳能量满格' },
  '佛系': { description: '随缘到极致，一切都行' },
  '燃': { description: '热血充值中，燃到起飞' },
  '中二': { description: '中二病发作，热血开场' },
  '正能量': { description: '光照人间，心态超正' },
  '对话': { description: '对话感拉满，节奏很顺' },
  '独白': { description: '心声大放送，独角戏上线' },
  '故事': { description: '剧情推进中，转折随时来' },
  '排比': { description: '气势叠满，句式拉满' },
  '谐音梗': { description: '谐音警告，梗点密集' },
  '反问': { description: '问号暴击，情绪直接拉满' },
  '夸张': { description: '夸到起飞，离谱指数飙升' },
  '押韵': { description: '节奏感拉满，顺口又上头' },
  '口号': { description: '喊麦上线，口号感十足' },
  '通知': { description: '公告体出没，严肃中带梗' },
  '吐槽': { description: '火力全开，火线输出' },
  '清单': { description: '列举到心慌，条条命中' },
  '采访': { description: '即兴提问中，节奏在线' },
  '直播': { description: '弹幕感十足，现场感拉满' },
  '自问自答': { description: '灵魂拷问局，自己把自己问倒' },
  '诗歌': { description: '诗意暴击，文艺值飙升' },
  '书信': { description: '纸短情长，心里话拉满' },
  '翻译腔': { description: '机翻味上线，味道很正' },
  '纪录片': { description: '纪实风上头，镜头感十足' },
  '会议纪要': { description: '要点式输出，形式感拉满' },
  '论文': { description: '学术味爆棚，严谨到离谱' },
  '说明书': { description: '使用须知模式，步骤很清楚' },
  '拟人': { description: '万物皆可人设，角色感爆棚' },
  '反讽': { description: '笑里藏刀，反向暴击' },
  '隐喻': { description: '话外之意，意味很深' },
  '蒙太奇': { description: '画面切换术，节奏感拉满' },
  '字符画': { description: '像素味拉满，视觉冲击' },
}

const DEFAULT_DESCRIPTION_TEMPLATES: Record<TagDimension, string[]> = {
  tone: [
    '{tag}感拉满',
    '{tag}上头',
    '{tag}爆表',
    '{tag}直冲天灵盖',
    '{tag}暴击',
    '{tag}情绪拉扯',
    '{tag}情绪开大',
    '{tag}气氛到位',
    '{tag}心态波动',
    '{tag}情绪过山车',
    '{tag}情绪共振',
    '{tag}情绪值飙升',
  ],
  theme: [
    '{tag}现场',
    '{tag}纪实',
    '{tag}氛围爆满',
    '{tag}日常',
    '{tag}浓度超标',
    '{tag}故事线拉满',
    '{tag}日常即视感',
    '{tag}体验卡',
    '{tag}主场时刻',
    '{tag}剧情开篇',
    '{tag}场景复刻',
    '{tag}沉浸式',
  ],
  style: [
    '{tag}体表达',
    '{tag}风拉满',
    '{tag}式输出',
    '{tag}味十足',
    '{tag}体质感',
    '{tag}叙事感',
    '{tag}节奏感',
    '{tag}腔调',
    '{tag}流派',
    '{tag}模板',
    '{tag}笔法',
    '{tag}语气包',
  ],
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

function hashTag(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
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
    '，冲击力拉满',
    '，氛围感到位',
    '，爆梗体质',
  ]
  const index = hashTag(description) % suffixes.length
  return `${description}${suffixes[index]}`
}
