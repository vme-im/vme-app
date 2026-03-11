// LLM 内容分析模块
import OpenAI from 'openai'
import type { GitHubIssuePayload } from './types'
import { TONE_TAGS, THEME_TAGS, STYLE_TAGS, FALLBACK_TAG } from '@/lib/tags/taxonomy'

// === 预处理 ===

/** 去掉疯四结尾套话、图片链接、多余空白 */
function preprocessContent(title: string, body: string): string {
  let text = `${title}\n\n${body}`.slice(0, 6000)

  // 去掉 markdown 图片
  text = text.replace(/!\[.*?\]\(.*?\)/g, '')

  // 去掉疯四结尾套话（贪婪匹配到末尾）
  text = text.replace(/[，,。！!？?\s\n]*(今天是?|因为)?(肯德基|KFC)?疯狂星期四[\s\S]*$/i, '')
  // 去掉散落的 V我50 / vivo50 / V50 等变体
  text = text.replace(/[Vv](我|ivo)?\s*\d{1,3}(块|元)?/g, '')

  // 压缩多余空行
  text = text.replace(/\n{3,}/g, '\n\n').trim()

  return text
}

/** 检测是否为纯图片内容（无实质文字） */
function isImageOnly(title: string, body: string): boolean {
  const textContent = `${title}\n${body}`
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .trim()
  return textContent.length < 10
}

// === Tool 定义 ===

const SET_TAGS_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'set_tags',
    description: '为疯四文案打标签',
    parameters: {
      type: 'object',
      properties: {
        core: {
          type: 'string',
          description: '一句话概括：去掉KFC结尾后，这篇文案讲了什么？',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: '2-3个最精准的标签',
        },
      },
      required: ['core', 'tags'],
    },
  },
}

// === Prompt ===

function buildSystemPrompt(): string {
  return `你是疯四文案标签员。给文案打 2-3 个标签。

## 规则
- 文案的KFC/V50结尾已被删除，你看到的是纯正文
- 标签要描述正文的核心创意，不要描述文体格式
- 优先从参考列表选，也可自创2-4字短词
- 每个标签必须具体、有区分度

## 参考标签
情绪：${TONE_TAGS.join('、')}
题材：${THEME_TAGS.join('、')}
手法：${STYLE_TAGS.join('、')}

## 禁止使用的标签
- "反转" — 所有疯四都有反转，标了等于没标
- "故事" — 太笼统，要说清什么类型的故事
- "独白" — 大部分文案都是第一人称，标了没意义
- "美食""外卖""节日" — 已从标签体系移除
- "无厘头" — 已改为"荒诞"，请使用新标签

## 示例

文案：少林寺的方丈位置空出来了，有兴趣的可以转我50，我帮你写推荐信
→ core: 恶搞少林寺方丈招聘
→ tags: ["八卦", "讽刺"]

文案：我是盗号的，看了这个人聊天记录发现他过得非常艰苦
→ core: 假装盗号者同情号主
→ tags: ["社交", "黑色幽默"]

文案：假如你是李华，你的英国笔友Peter向你询问周四的安排，请写一封回信
→ core: 模仿高考英语作文题
→ tags: ["考试", "书信"]

文案：全员核酸检测通知，明日本群进行全员核酸检测，地点：肯德基大门口
→ core: 模仿疫情核酸通知格式
→ tags: ["通知", "讽刺"]

文案：和你分手20年了，你还是那个能影响我情绪的人，整整爱了你二十八年
→ core: 伤感情书风格的感情回忆
→ tags: ["恋爱", "心酸"]

文案：KFC和vivo合作推出了一款手机，叫肯德基疯狂星期四vivo50
→ core: vivo50谐音梗
→ tags: ["谐音梗", "冷幽默"]`
}

// === 后处理 ===

// 硬过滤：这些标签区分度太低或经常误判
const BLOCKED_TAGS = new Set([
  '反转',
  '故事',
  '独白',
  '美食',
  '外卖',
  '节日',
  '无厘头', // 已改为"荒诞"
  '科技', // 高频误判
])

function normalizeTags(tags: string[]): string[] {
  const valid = tags
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && t.length <= 6 && !BLOCKED_TAGS.has(t))

  if (valid.length === 0) {
    return [FALLBACK_TAG]
  }

  // 去重并限制数量
  return [...new Set(valid)].slice(0, 3)
}

// === OpenAI 客户端 ===

function createClient(): OpenAI | null {
  const apiKey = process.env.AI_API_KEY
  if (!apiKey) {
    return null
  }

  const baseURL =
    (process.env.AI_API_BASE_URL || 'https://api.openai.com').replace(/\/$/, '') + '/v1'

  return new OpenAI({
    apiKey,
    baseURL,
    defaultHeaders: {
      'APP-Code': 'USYC0298',
    },
  })
}

// === 主函数 ===

export async function analyzeContent(
  issue: Pick<GitHubIssuePayload, 'title' | 'body'>,
): Promise<string[]> {
  const fallback: string[] = []

  // 纯图片跳过
  if (isImageOnly(issue.title, issue.body || '')) {
    return fallback
  }

  const client = createClient()
  if (!client) {
    return fallback
  }

  const model = process.env.LLM_MODEL || 'gpt-5-nano'
  const content = preprocessContent(issue.title, issue.body || '')

  // 预处理后内容太短，跳过
  if (content.length < 15) {
    return fallback
  }

  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0.1,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: `打标签：\n\n${content}` },
      ],
      tools: [SET_TAGS_TOOL],
      tool_choice: { type: 'function', function: { name: 'set_tags' } },
    })

    const toolCall = response.choices[0]?.message?.tool_calls?.[0]

    if (!toolCall || toolCall.type !== 'function' || toolCall.function.name !== 'set_tags') {
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
