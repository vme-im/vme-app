// LLM 内容分析模块
import OpenAI from 'openai'
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
  '字符画',
]
const FALLBACK_TAG = '其他'

// 标签设置工具定义
const SET_TAGS_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'set_tags',
    description: '为文案设置标签',
    parameters: {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
          description:
            '选中的标签（可以是参考列表中的，也可以是自创的），最多5个',
        },
      },
      required: ['tags'],
    },
  },
}

// 构建系统 Prompt
function buildSystemPrompt(): string {
  return `# Role
You are a Senior Content Analyst specializing in Chinese internet culture, specifically the "Crazy Thursday" (肯德基疯狂星期四) meme.

# Context
"Crazy Thursday" is a viral marketing meme on Chinese social media. Netizens write misleading stories (genres: CEO romance, Wuxia, Sci-Fi, emotional drama, news, etc.) that end with a sudden twist requesting money for KFC: "It's KFC Crazy Thursday, V me 50" (transfer me 50 yuan).
**The artistic value lies in the creative story in the first half, NOT the fixed ending.**

# Taxonomy Targets
Select 0-5 tags TOTAL from ANY of the following dimensions.
You do NOT need to select one from each dimension. Focus on the most prominent features.
For example, you can select 2 TONE tags and 1 THEME tag, or just 1 STYLE tag.

## TONE (Emotional atmosphere)
${TONE_TAGS.join('、')}

## THEME (Story background/topic)
${THEME_TAGS.join('、')}

## STYLE (Narrative technique)
${STYLE_TAGS.join('、')}

# Analysis Workflow
1. **Check for ASCII Art**: If the content is primarily visual/ASCII art, tag as "字符画".
2. **Strip Ending**: IGNORE fixed endings like "肯德基" (KFC), "疯狂星期四" (Crazy Thursday), "V我50".
3. **Extract Core**: What is the story actually about? Who is the protagonist? What happened?
4. **Identify Atmosphere**: What is the reader's emotional reaction? (Funny, sad, absurd, healing...)
5. **Match Tags**: Select tags that best summarize the core features from the three dimensions.

# ⚠️ Negative Constraints (CRITICAL)
- **NO "美食" (Food) Tag**: Unless the story is LEGITIMATELY about cooking or tasting food. Mentioning KFC at the end does NOT count.
- **NO "节日" (Festival) Tag**: "Thursday" is not a traditional festival. Only use if the story is about Spring Festival, etc.
- **"正能量" (Positive Energy)**: Use cautiously. Satirical chicken soup or irony should be classified as "讽刺" (Satire) or "反讽" (Irony).
- **"自嘲" (Self-mockery) vs "卑微" (Humble/Pathetic)**: Self-mockery has humor; Humble is genuinely low-status/sad.
- **"抽象" (Abstract) vs "无厘头" (Nonsense)**: "Abstract" refers to the specific absurd style of Chinese internet culture; "Nonsense" is more like Stephen Chow's comedy.

# Few-Shot Examples

## ✅ Good Example
Input: "我是个普通程序员，每天加班到凌晨两点，老板说年终奖会有的，结果年底只发了个文件夹...... 今天是肯德基疯狂星期四，V我50"
Tags: ["社畜", "心酸", "反转"]
Reasoning: The core is the sad experience of an overworked programmer. Tone is "心酸" (Sad). Structure contains a twist "反转".

## ❌ Bad Example
Input: (Same text as above)
Bad Tags: ["美食", "节日", "正能量"]
Reasoning: KFC ending != "美食" (Food); Thursday != "节日" (Festival); Sad story != "正能量".

# Output Requirements
- Return a JSON array of strings.
- Aim for 3 tags usually, but up to 5 is allowed if the content is complex.
- Tags implies the core selling point of the copy.`
}

function normalizeTags(tags: string[]): string[] {
  // 过滤掉空字符串和多余空格，限制在前3个
  const valid = tags
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= 10) // 限制标签长度在10字符以内防止长句被误认为标签

  if (valid.length === 0) {
    return [FALLBACK_TAG]
  }

  return valid.slice(0, 5)
}

// 创建 OpenAI 客户端（支持自定义 baseURL）
function createClient(): OpenAI | null {
  const apiKey = process.env.AI_API_KEY
  if (!apiKey) {
    return null
  }

  const baseURL =
    (process.env.AI_API_BASE_URL || 'https://api.openai.com').replace(
      /\/$/,
      '',
    ) + '/v1'

  return new OpenAI({
    apiKey,
    baseURL,
    defaultHeaders: {
      'APP-Code': 'USYC0298',
    },
  })
}

export async function analyzeContent(
  issue: Pick<GitHubIssuePayload, 'title' | 'body'>,
): Promise<string[]> {
  const fallback: string[] = []

  const client = createClient()
  if (!client) {
    return fallback
  }

  const model = process.env.LLM_MODEL || 'gpt-5-nano'
  const content = `${issue.title}\n\n${issue.body || ''}`.slice(0, 6000)

  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        {
          role: 'user',
          content: `请分析以下文案并生成标签：

---
${content}
---

请运用上述分析流程，输出最贴切的标签。`,
        },
      ],
      tools: [SET_TAGS_TOOL],
      tool_choice: { type: 'function', function: { name: 'set_tags' } },
    })

    const toolCall = response.choices[0]?.message?.tool_calls?.[0]

    // 类型守卫：确保是 function 类型的 tool call
    if (
      !toolCall ||
      toolCall.type !== 'function' ||
      toolCall.function.name !== 'set_tags'
    ) {
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
