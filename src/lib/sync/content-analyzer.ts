// LLM 内容分析模块
import type { GitHubIssuePayload } from './types'

const TONE_TAGS = [
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
const THEME_TAGS = [
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
const STYLE_TAGS = [
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
]
const FALLBACK_TAG = '其他'
const ALL_TAGS_LIST = [...TONE_TAGS, ...THEME_TAGS, ...STYLE_TAGS, FALLBACK_TAG]
const ALL_TAGS_SET = new Set(ALL_TAGS_LIST)

function normalizeTags(tags: string[]): string[] {
  // 过滤掉空字符串和多余空格，限制在前3个
  const valid = tags
    .map(t => t.trim())
    .filter(t => t.length > 0 && t.length <= 10) // 限制标签长度在10字符以内防止长句被误认为标签

  if (valid.length === 0) {
    return [FALLBACK_TAG]
  }

  return valid.slice(0, 3)
}

export async function analyzeContent(
  issue: Pick<GitHubIssuePayload, 'title' | 'body'>
): Promise<string[]> {
  const fallback: string[] = []

  const apiKey = process.env.AI_API_KEY
  if (!apiKey) {
    return fallback
  }

  const baseUrl = (process.env.AI_API_BASE_URL || 'https://api.openai.com').replace(/\/$/, '')
  const model = process.env.LLM_MODEL || 'gpt-5-nano'
  const content = `${issue.title}\n\n${issue.body || ''}`.slice(0, 6000)

  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'APP-Code': 'USYC0298',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: `你是内容分析专家，专门负责为“肯德基疯狂星期四”系列文案生成标签。

背景知识：
“肯德基疯狂星期四”是中国社交网络上的一种病毒式营销文化。网友会创作各种极具误导性的长篇故事（涵盖霸总、武侠、科幻、情感、社会新闻等各种题材），但在结尾处突然反转，引向“今天是肯德基疯狂星期四，谁请我吃”的主题。

任务要求：
1. **侧重故事内容**：忽略结尾固定的“肯德基”、“星期四”、“V 我 50”等话术。重点分析文案前半部分所讲述的故事、情感和背景（如职场、中二、恋爱等）。
2. **避免泛化标签**：除非文案主体内容确实是关于烹饪或品鉴美食的，否则**严禁使用“美食”标签**。不要因为结尾提到了肯德基就打上“美食”标签。
3. **识别核心特征**：优先从参考列表中选择最能体现文案故事内核的标签。
4. 参考标签列表：${ALL_TAGS_LIST.join('、')}
5. 最多输出 3 个最贴切的标签。
`
          },
          {
            role: 'user',
            content: `请为以下文案生成标签：\n\n${content}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'set_tags',
              description: '为文案设置标签',
              parameters: {
                type: 'object',
                properties: {
                  tags: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                    description: '选中的标签（可以是参考列表中的，也可以是自创的），最多3个',
                    maxItems: 3
                  }
                },
                required: ['tags']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'set_tags' } }
      }),
    })

    if (!response.ok) {
      console.warn('LLM analyze failed:', response.status, response.statusText)
      return fallback
    }

    const data = await response.json()
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0]

    if (!toolCall || toolCall.function.name !== 'set_tags') {
      console.warn('No valid tool call in response')
      return fallback
    }

    const functionArgs = JSON.parse(toolCall.function.arguments)
    const tags = functionArgs?.tags

    if (!Array.isArray(tags)) {
      console.warn('Invalid tags format in tool call')
      return fallback
    }

    return normalizeTags(tags)
  } catch (error) {
    console.warn('LLM analyze error:', error)
    return fallback
  }
}
