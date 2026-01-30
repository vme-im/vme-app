// LLM 内容分析模块
import type { GitHubIssuePayload } from './types'

const TONE_TAGS = ['温情', '反转', '抽象', '自嘲', '讽刺', '励志']
const THEME_TAGS = ['职场', '恋爱', '学生', '社畜', '单身', '家庭', '朋友']
const STYLE_TAGS = ['对话体', '独白体', '故事体', '排比', '谐音梗']
const ALL_TAGS = new Set([...TONE_TAGS, ...THEME_TAGS, ...STYLE_TAGS])

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  const filtered = tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter((tag) => ALL_TAGS.has(tag))

  const unique: string[] = []
  for (const tag of filtered) {
    if (!unique.includes(tag)) unique.push(tag)
  }

  return unique.slice(0, 3)
}

function extractJson(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/)
  return match ? match[0] : null
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

  const systemPrompt = [
    '你是内容审核助手，需要为文案生成标签。',
    '严格按 JSON 输出：{"tags":["..."]}',
    `情感基调标签（选 1 个）：${TONE_TAGS.join('、')}`,
    `内容主题标签（选 0-2 个）：${THEME_TAGS.join('、')}`,
    `表现手法标签（选 0-1 个）：${STYLE_TAGS.join('、')}`,
    'tags 最多 3 个，不能输出列表外的标签。',
  ].join('\n')

  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content },
        ],
      }),
    })

    if (!response.ok) {
      console.warn('LLM analyze failed:', response.status, response.statusText)
      return fallback
    }

    const data = await response.json()
    const messageContent = data?.choices?.[0]?.message?.content
    if (typeof messageContent !== 'string') {
      return fallback
    }

    const jsonText = extractJson(messageContent)
    if (!jsonText) {
      return fallback
    }

    const parsed = JSON.parse(jsonText) as { tags?: unknown }
    return normalizeTags(parsed.tags)
  } catch (error) {
    console.warn('LLM analyze error:', error)
    return fallback
  }
}
