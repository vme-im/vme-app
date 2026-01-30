import { Octokit } from '@octokit/core'
import sharp from 'sharp'

const MODERATION_LABELS = ['违规', '收录', '重复', '待审']

// omni-moderation-latest 支持的类别映射
const categoriesTextMap: Record<string, string> = {
  hate: '仇恨',
  'hate/threatening': '仇恨/威胁',
  harassment: '骚扰',
  'harassment/threatening': '骚扰/威胁',
  sexual: '色情',
  'sexual/minors': '未成年人色情',
  violence: '暴力',
  'violence/graphic': '暴力/血腥',
  'self-harm': '自残',
  'self-harm/intent': '自残意图',
  'self-harm/instructions': '自残指导',
  illicit: '非法',
  'illicit/violent': '非法/暴力',
}

export interface ModerationResult {
  type: 'similar' | 'violation' | 'approved' | 'pending' | 'skipped'
  message?: string
  categories?: string[]
}

interface IssueNode {
  id: string
  title: string
  url: string
  body: string
  createdAt: string
  updatedAt: string
  author?: {
    username: string
    avatarUrl?: string
    url?: string
  }
  imageHashes?: string[]
}

// 多模态输入类型
type ModerationInput =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

const DATA_CACHE_TTL_MS = 5 * 60 * 1000
let cachedData: IssueNode[] | null = null
let cachedAt = 0

function getOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    throw new Error('GITHUB_TOKEN not set')
  }
  return new Octokit({ auth: token })
}

function getContentDataUrl(): string {
  return (
    process.env.CONTENT_DATA_URL ||
    'https://raw.githubusercontent.com/vme-im/vme-content/main/data.json'
  )
}

// 从 issue body 中提取图片 URL
export function extractImageUrls(body: string): string[] {
  const regex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g
  const urls: string[] = []
  let match
  while ((match = regex.exec(body)) !== null) {
    urls.push(match[1])
  }
  return urls
}

// 从 issue body 中提取纯文本（移除图片 Markdown）
export function extractText(body: string): string {
  return body.replace(/!\[.*?\]\(https?:\/\/[^\s)]+\)/g, '').trim()
}

// 计算图片的感知哈希 (pHash)
async function calculateImageHash(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      return null
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const { data } = await sharp(buffer)
      .resize(8, 8, { fit: 'fill' })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true })

    let sum = 0
    for (let i = 0; i < data.length; i++) {
      sum += data[i]
    }
    const avg = sum / data.length

    let hash = ''
    for (let i = 0; i < data.length; i++) {
      hash += data[i] > avg ? '1' : '0'
    }

    return BigInt('0b' + hash).toString(16).padStart(16, '0')
  } catch (error) {
    console.error(`计算图片哈希失败 (${imageUrl}):`, error)
    return null
  }
}

function hammingDistance(hash1: string, hash2: string): number {
  const bin1 = BigInt('0x' + hash1).toString(2).padStart(64, '0')
  const bin2 = BigInt('0x' + hash2).toString(2).padStart(64, '0')

  let distance = 0
  for (let i = 0; i < bin1.length; i++) {
    if (bin1[i] !== bin2[i]) distance++
  }
  return distance
}

function isImageSimilar(hash1: string, hash2: string, threshold: number = 10): boolean {
  return hammingDistance(hash1, hash2) < threshold
}

async function calculateImageHashes(urls: string[]): Promise<string[]> {
  const results: string[] = []
  for (const url of urls) {
    const hash = await calculateImageHash(url)
    if (hash) {
      results.push(hash)
    }
  }
  return results
}

function minDistance(word1: string, word2: string): number {
  const m = word1.length
  const n = word2.length
  const dp = new Array(m + 1).fill(0).map(() => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    dp[i][0] = i
  }
  for (let j = 1; j <= n; j++) {
    dp[0][j] = j
  }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1,
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1
        )
      }
    }
  }
  return dp[m][n]
}

function removeSeparator(str: string): string {
  const halfWidthPunctuations = '\\x20,!@#.;:'
  const fullWidthPunctuations = '\u3000\uFF0C\u3002\uFF1B\uFF1A'
  const chinesePunctuations =
    '\u3001\u201C\u201D\u2018\u2019\uFF08\uFF09\u3010\u3011\u300A\u300B\uFF01\uFF1F\u2014\uFF5E'
  const specialCharacters = '\\^&*()_+=\\-\\[\\]{}|<>?`~'

  const regex = new RegExp(
    `[${halfWidthPunctuations}${fullWidthPunctuations}${chinesePunctuations}${specialCharacters}]`,
    'g'
  )

  return str.replace(regex, '')
}

function isSimilar(str1: string, str2: string): boolean {
  const distance = minDistance(removeSeparator(str1), removeSeparator(str2))
  const maxLength = Math.max(str1.length, str2.length)
  return maxLength > 0 && distance / maxLength < 0.2
}

async function fetchContentData(): Promise<IssueNode[]> {
  const now = Date.now()
  if (cachedData && now - cachedAt < DATA_CACHE_TTL_MS) {
    return cachedData
  }

  try {
    const response = await fetch(getContentDataUrl(), { cache: 'no-store' })
    if (!response.ok) {
      console.warn('内容数据获取失败:', response.status, response.statusText)
      return cachedData || []
    }
    const data = (await response.json()) as IssueNode[]
    cachedData = Array.isArray(data) ? data : []
    cachedAt = now
    return cachedData
  } catch (error) {
    console.error('内容数据获取失败:', error)
    return cachedData || []
  }
}

async function findSimilarIssue(issueBody: string, currentIssueId?: string): Promise<IssueNode | null> {
  const issues = await fetchContentData()

  const newIssueImages = extractImageUrls(issueBody)
  const hasNewImage = newIssueImages.length > 0
  const newIssueText = extractText(issueBody)

  let newImageHashes: string[] = []
  if (hasNewImage) {
    newImageHashes = await calculateImageHashes(newIssueImages)
  }

  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i]

    if (currentIssueId && issue.id === currentIssueId) {
      continue
    }

    if (hasNewImage && issue.imageHashes && issue.imageHashes.length > 0) {
      for (const newHash of newImageHashes) {
        for (const existingHash of issue.imageHashes) {
          if (isImageSimilar(newHash, existingHash)) {
            return issue
          }
        }
      }
    }

    if (hasNewImage) {
      const existingImages = extractImageUrls(issue.body)
      for (const newUrl of newIssueImages) {
        if (existingImages.includes(newUrl)) {
          return issue
        }
      }
    }

    const existingText = extractText(issue.body)
    if (newIssueText && existingText) {
      const similarity = isSimilar(existingText, newIssueText)
      if (similarity) {
        return issue
      }
    }
  }

  return null
}

async function callModerationApi(inputs: ModerationInput[]): Promise<{
  flagged: boolean
  categories: Record<string, boolean>
}> {
  const apiBaseUrl = process.env.AI_API_BASE_URL || 'https://api.openai.com'
  const apiUrl = `${apiBaseUrl.replace(/\/$/, '')}/v1/moderations`
  const maxRetries = 3
  const initialBackoff = 1000
  const timeoutMs = 30000

  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      const backoffTime = initialBackoff * Math.pow(2, attempt - 1)
      await new Promise((resolve) => setTimeout(resolve, backoffTime))
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'omni-moderation-latest',
          input: inputs,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error.message || 'Moderation API 返回错误')
      }

      const results = data.results || []
      const mergedCategories: Record<string, boolean> = {}
      let flagged = false

      for (const result of results) {
        if (result.flagged) flagged = true
        for (const [category, value] of Object.entries(result.categories || {})) {
          if (value) mergedCategories[category] = true
        }
      }

      return { flagged, categories: mergedCategories }
    } catch (error) {
      clearTimeout(timeout)
      lastError = error as Error
      if (attempt < maxRetries - 1) {
        continue
      }
    }
  }

  throw lastError || new Error('Moderation API 调用失败')
}

async function addLabels(
  owner: string,
  repo: string,
  issueNumber: number,
  labels: string[]
) {
  const octokit = getOctokit()
  await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/labels', {
    owner,
    repo,
    issue_number: issueNumber,
    labels,
  })
}

async function addComment(
  owner: string,
  repo: string,
  issueNumber: number,
  comment: string
) {
  const octokit = getOctokit()
  await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
    owner,
    repo,
    issue_number: issueNumber,
    body: comment,
  })
}

async function closeIssue(
  owner: string,
  repo: string,
  issueNumber: number
) {
  const octokit = getOctokit()
  await octokit.request('PATCH /repos/{owner}/{repo}/issues/{issue_number}', {
    owner,
    repo,
    issue_number: issueNumber,
    state: 'closed',
  })
}

export function hasModerationLabel(labels: string[]): boolean {
  return labels.some((label) => MODERATION_LABELS.includes(label))
}

export async function moderateIssue(params: {
  owner: string
  repo: string
  issueNumber: number
  issueBody: string
  currentIssueId?: string
}): Promise<ModerationResult> {
  const { owner, repo, issueNumber, issueBody, currentIssueId } = params

  const similarIssue = await findSimilarIssue(issueBody, currentIssueId)
  if (similarIssue) {
    await addLabels(owner, repo, issueNumber, ['重复'])
    await addComment(owner, repo, issueNumber, `🔍查找到相似文案：${similarIssue.url}`)
    await closeIssue(owner, repo, issueNumber)
    return { type: 'similar', message: `查找到相似文案：${similarIssue.url}` }
  }

  const inputs: ModerationInput[] = []
  const text = extractText(issueBody)
  if (text) {
    inputs.push({ type: 'text', text })
  }

  const imageUrls = extractImageUrls(issueBody)
  for (const url of imageUrls) {
    inputs.push({ type: 'image_url', image_url: { url } })
  }

  if (inputs.length === 0) {
    await addLabels(owner, repo, issueNumber, ['待审'])
    await addComment(owner, repo, issueNumber, '⚠️内容为空，需要人工审核确认。')
    return { type: 'pending', message: '内容为空，需要人工审核' }
  }

  try {
    const moderationResult = await callModerationApi(inputs)

    if (moderationResult.flagged) {
      const flaggedCategories = Object.keys(moderationResult.categories).filter(
        (category) => moderationResult.categories[category]
      )
      const flaggedCategoriesText = flaggedCategories
        .map((category) => categoriesTextMap[category] || category)
        .filter(Boolean)

      if (flaggedCategoriesText.length > 0) {
        await addLabels(owner, repo, issueNumber, ['违规'])
        await addComment(
          owner,
          repo,
          issueNumber,
          `⛔️此内容因包含以下违规类别被标记：${flaggedCategoriesText.join('、')}。不予收录。`
        )
        await closeIssue(owner, repo, issueNumber)
        return { type: 'violation', categories: flaggedCategoriesText }
      }

      await addLabels(owner, repo, issueNumber, ['待审'])
      await addComment(
        owner,
        repo,
        issueNumber,
        '⚠️内容可能违规，正等待进一步人工审核确认。'
      )
      return { type: 'pending', message: '内容可能违规，需要人工审核' }
    }

    await addLabels(owner, repo, issueNumber, ['收录'])
    await addComment(owner, repo, issueNumber, '🤝您的内容已成功收录，感谢您的贡献！')
    await closeIssue(owner, repo, issueNumber)
    return { type: 'approved', message: '内容审核通过' }
  } catch (error) {
    console.error('Moderation API 调用失败，标记为待审:', error)
    await addLabels(owner, repo, issueNumber, ['待审'])
    await addComment(
      owner,
      repo,
      issueNumber,
      '⚠️自动审核暂时不可用，内容已提交人工审核。'
    )
    return {
      type: 'pending',
      message: `自动审核失败: ${(error as Error).message}`,
    }
  }
}
