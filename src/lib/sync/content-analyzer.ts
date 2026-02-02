// LLM 内容分析模块
import type { GitHubIssuePayload } from './types'

const TONE_TAGS = ['温情', '反转', '抽象', '自嘲', '讽刺', '励志']
const THEME_TAGS = ['职场', '恋爱', '学生', '社畜', '单身', '家庭', '朋友']
const STYLE_TAGS = ['对话体', '独白体', '故事体', '排比', '谐音梗']
const FALLBACK_TAG = '其他'  // 兜底标签，表示已分类但没有合适标签
const ALL_TAGS = new Set([...TONE_TAGS, ...THEME_TAGS, ...STYLE_TAGS, FALLBACK_TAG])

function normalizeTags(tags: string[]): string[] {
  const filtered = tags.filter(tag => ALL_TAGS.has(tag))

  // 如果没有任何有效标签，返回"其他"
  if (filtered.length === 0) {
    return [FALLBACK_TAG]
  }

  return filtered.slice(0, 3)
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
            content: `你是内容审核助手，需要为疯狂星期四文案生成标签。

可用标签：
- 情感基调（选 1 个）：${TONE_TAGS.join('、')}
- 内容主题（选 0-2 个）：${THEME_TAGS.join('、')}
- 表现手法（选 0-1 个）：${STYLE_TAGS.join('、')}

要求：
1. 最多选择 3 个标签
2. 必须从上述列表中选择
3. 如果没有合适的标签，返回"其他"
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
                      enum: [...TONE_TAGS, ...THEME_TAGS, ...STYLE_TAGS, FALLBACK_TAG]
                    },
                    description: '选中的标签，最多3个',
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
