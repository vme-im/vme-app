import { classifyItem } from '@/lib/sync'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'
export const maxDuration = 30 // 设置最长执行时间为 30 秒

export async function POST(request: Request) {
  try {
    const { itemId } = await request.json()

    if (!itemId || typeof itemId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid itemId' },
        { status: 400 }
      )
    }

    console.log(`[Classify API] Starting classification for item: ${itemId}`)

    // 调用分类函数（可能需要几秒钟）
    const result = await classifyItem(itemId)

    if (result.success) {
      console.log(`[Classify API] Classification succeeded for item: ${itemId}`, result.tags)

      // 重新验证相关页面的缓存
      revalidatePath(`/jokes/${itemId}`)

      return NextResponse.json({
        success: true,
        tags: result.tags
      })
    } else {
      console.warn(`[Classify API] Classification failed for item: ${itemId}`)
      return NextResponse.json(
        { success: false, error: 'Classification failed' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Classify API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
