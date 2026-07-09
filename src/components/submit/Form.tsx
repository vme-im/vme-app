'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { showLoginDialog } from '@/components/shared/LoginDialog'
import NeoButton from '@/components/shared/NeoButton'
import Icon from '@/components/shared/Icon'
import UrlImageUploader from './url-image-uploader'

const FORM_STORAGE_KEY = 'submit_joke_form_draft'

type SubmitMode = 'text' | 'meme'

const MODE_TABS: { mode: SubmitMode; label: string }[] = [
  { mode: 'text', label: '文案' },
  { mode: 'meme', label: '梗图' },
]

/**
 * 提交文案表单组件
 */
export default function SubmitForm() {
  const { data: session, status } = useSession()
  const [activeTab, setActiveTab] = useState<SubmitMode>('text')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [pendingFiles, setPendingFiles] = useState<Map<string, File>>(new Map())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info'
    text: string
  } | null>(null)

  // 登录后恢复表单数据
  useEffect(() => {
    if (session && status === 'authenticated') {
      const savedForm = localStorage.getItem(FORM_STORAGE_KEY)
      if (savedForm) {
        try {
          const parsed = JSON.parse(savedForm)
          // 兼容旧格式和新格式
          if (parsed.title || parsed.content) {
            setTitle(parsed.title || '')
            setContent(parsed.content || '')
            if (parsed.mode) setActiveTab(parsed.mode)
            if (parsed.images) {
              const validImages = parsed.images.filter((url: string) => !url.startsWith('blob:'))
              setUploadedImages(validImages)
            }
            setMessage({ type: 'info', text: '已经帮你恢复上次写的内容' })
            localStorage.removeItem(FORM_STORAGE_KEY)
          }
        } catch (e) {
          console.error('恢复表单数据失败:', e)
        }
      }
    }
  }, [session, status])

  const handleFileSelected = (file: File) => {
    const previewUrl = URL.createObjectURL(file)
    setPendingFiles((prev) => new Map(prev).set(previewUrl, file))
    setUploadedImages((prev) => [...prev, previewUrl])
  }

  const handleImageRemoved = (url: string) => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
      setPendingFiles((prev) => {
        const newMap = new Map(prev)
        newMap.delete(url)
        return newMap
      })
    }
    setUploadedImages((prev) => prev.filter((img) => img !== url))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 验证逻辑
    if (!title.trim()) {
      setMessage({ type: 'error', text: '请填写标题' })
      return
    }

    if (activeTab === 'text') {
      if (!content.trim()) {
        setMessage({ type: 'error', text: '请填写文案内容' })
        return
      }
    } else {
      // 梗图模式下，允许内容为空，但必须有图片
      if (uploadedImages.length === 0) {
        setMessage({ type: 'error', text: '请至少上传一张梗图' })
        return
      }
    }

    setIsSubmitting(true)
    setMessage(null)

    try {
      // 处理图片上传
      let finalImages = [...uploadedImages]

      if (activeTab === 'meme' && pendingFiles.size > 0) {
        // 上传所有待上传的图片
        const uploadPromises = uploadedImages.map(async (url, index) => {
          if (pendingFiles.has(url)) {
            try {
              const file = pendingFiles.get(url)!
              const formData = new FormData()
              formData.append('file', file)

              const res = await fetch('/api/image-upload', {
                method: 'POST',
                body: formData,
              })

              const data = await res.json()
              if (data.success) {
                return { index, url: data.url }
              } else {
                throw new Error(data.message || '图片上传失败')
              }
            } catch (err) {
              throw err
            }
          }
          return { index, url }
        })

        try {
          const results = await Promise.all(uploadPromises)
          // 按原顺序重建数组
          finalImages = results.sort((a, b) => a.index - b.index).map((r) => r.url)
        } catch (error: any) {
          setMessage({ type: 'error', text: error.message || '图片上传失败，请重试' })
          setIsSubmitting(false)
          return
        }
      }

      // 构建最终提交内容
      let finalContent = content.trim()

      // 如果是梗图模式，将图片追加到内容末尾
      if (activeTab === 'meme' && finalImages.length > 0) {
        const imageMarkdown = finalImages.map((url) => `![](${url})`).join('\n')
        finalContent = finalContent ? `${finalContent}\n\n${imageMarkdown}` : imageMarkdown
      }

      const labels = activeTab === 'meme' ? ['梗图'] : ['文案']

      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          content: finalContent,
          labels, // 传递标签
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage({
          type: 'success',
          text: activeTab === 'meme' ? '梗图上交成功！' : '文案上交成功！正在跳转到详情页...',
        })
        setTitle('')
        setContent('')
        setUploadedImages([])
        setPendingFiles(new Map())
        // 清理可能存在的草稿
        localStorage.removeItem(FORM_STORAGE_KEY)

        const targetUrl =
          data.detailPath || (data.issueNumber ? `/jokes/${data.issueNumber}` : data.issueUrl)

        if (targetUrl) {
          setTimeout(() => {
            window.location.assign(targetUrl)
          }, 800)
        }
      } else {
        // 处理认证错误
        if (response.status === 401) {
          const errorMsg = data.message || ''
          const isExpired = errorMsg.includes('无效') || errorMsg.includes('过期')

          // 保存表单数据
          localStorage.setItem(
            FORM_STORAGE_KEY,
            JSON.stringify({
              title,
              content,
              mode: activeTab,
              images: uploadedImages.filter((url) => !url.startsWith('blob:')),
            }),
          )

          setMessage({
            type: 'error',
            text: isExpired ? '登录已过期，请重新登录' : '请先登录以继续提交',
          })

          // 显示登录确认弹窗
          showLoginDialog({
            title: isExpired ? '登录已过期' : '提交内容需要登录',
            message: isExpired
              ? '登录过期了，重新登录就能接着交'
              : '登录 GitHub 就能上交文案和梗图，让更多人笑出腹肌。',
          })
        } else {
          setMessage({ type: 'error', text: data.message || '提交失败，请稍后重试' })
        }
      }
    } catch (error) {
      console.error('提交失败:', error)
      setMessage({ type: 'error', text: '网络错误，请稍后重试' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLoginClick = () => {
    // 保存表单数据
    if (title.trim() || content.trim() || uploadedImages.length > 0) {
      localStorage.setItem(
        FORM_STORAGE_KEY,
        JSON.stringify({
          title,
          content,
          mode: activeTab,
          images: uploadedImages.filter((url) => !url.startsWith('blob:')),
        }),
      )
    }

    // 显示登录确认弹窗
    showLoginDialog({
      title: '提交内容需要登录',
      message: '登录 GitHub 就能上交文案和梗图，让更多人笑出腹肌。',
    })
  }

  if (status === 'loading') {
    return (
      <div className="flex h-32 items-center justify-center border-4 border-black bg-white p-8 shadow-neo">
        <div className="text-news-gray flex items-center gap-3">
          <Icon name="spinner" className="animate-spin text-2xl" />
          <span className="text-sm font-black">加载中...</span>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl border-4 border-black bg-white p-6 shadow-neo-xl md:p-8">
        <p className="text-news-gray mb-6 text-center font-bold">先登录 GitHub，才能上交你的好活</p>
        <div className="flex justify-center">
          <NeoButton onClick={handleLoginClick} variant="black" size="lg" icon="github">
            GitHub 登录
          </NeoButton>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl border-4 border-black bg-white p-6 shadow-neo-xl md:p-8">
      {/* 分类 tab：黑底，选中变黄（同栏目区分类切换语言） */}
      <div className="bg-kfc-black mb-6 inline-flex flex-wrap gap-1 p-1">
        {MODE_TABS.map((tab) => (
          <button
            key={tab.mode}
            type="button"
            onClick={() => setActiveTab(tab.mode)}
            className={`px-4 py-2 text-sm font-black tracking-wide transition-colors ${
              activeTab === tab.mode
                ? 'bg-kfc-yellow text-black'
                : 'text-white hover:text-kfc-yellow'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="title" className="block text-xs font-black text-black">
              标题 *
            </label>
            <p className="text-news-gray text-xs font-bold">{title.length}/100</p>
          </div>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="给你的作品起个标题..."
            className="focus:border-kfc-red focus:bg-kfc-cream shadow-neo-sm min-h-[44px] w-full border-2 border-black bg-white px-4 py-3 font-bold text-black transition-all placeholder:text-news-gray focus:shadow-neo focus:outline-hidden"
            disabled={isSubmitting}
            maxLength={100}
          />
        </div>

        {/* 梗图上传区域 */}
        {activeTab === 'meme' && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <label className="mb-2 block text-xs font-black text-black">上传梗图 *</label>
            <UrlImageUploader
              onFileSelect={handleFileSelected}
              onImageRemoved={handleImageRemoved}
              uploadedImages={uploadedImages}
              maxImages={6}
              disabled={isSubmitting}
            />
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="content" className="block text-xs font-black text-black">
              {activeTab === 'meme' ? '补充说明（选填）' : '文案内容 *'}
            </label>
            <p className="text-news-gray text-xs font-bold">{content.length}/2000</p>
          </div>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={activeTab === 'meme' ? '可以说说这张图的梗点...' : '开始你的表演...'}
            rows={6}
            className="focus:border-kfc-red focus:bg-kfc-cream shadow-neo-sm w-full resize-none border-2 border-black bg-white px-4 py-3 font-bold text-black transition-all placeholder:text-news-gray focus:shadow-neo focus:outline-hidden"
            disabled={isSubmitting}
            maxLength={2000}
          />
        </div>

        {message && (
          <div
            className={`shadow-neo-sm flex items-center gap-2 border-2 border-black p-4 font-black ${
              message.type === 'success'
                ? 'bg-kfc-yellow text-black'
                : message.type === 'info'
                  ? 'bg-white text-black'
                  : 'bg-kfc-red text-white'
            }`}
          >
            <Icon
              name={
                message.type === 'success'
                  ? 'check-circle'
                  : message.type === 'error'
                    ? 'x-circle'
                    : 'info'
              }
              className="shrink-0 text-lg"
            />
            {message.text}
          </div>
        )}

        <NeoButton
          type="submit"
          disabled={isSubmitting}
          variant="primary"
          size="lg"
          className="w-full"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Icon name="spinner" className="animate-spin" />
              提交中...
            </span>
          ) : (
            '确认上交'
          )}
        </NeoButton>
      </form>

      <div className="bg-kfc-cream shadow-neo-sm mt-8 border-2 border-black p-4">
        <h3 className="mb-2 flex items-center text-sm font-black text-black">
          <Icon name="info" className="mr-2" />
          提交须知
        </h3>
        <ul className="text-news-gray space-y-1 text-xs font-bold">
          <li>· 请确保内容原创，避免重复提交</li>
          <li>· 内容应当积极健康，符合社区规范</li>
          <li>· 提交后将自动创建 GitHub Issue，经审核后显示</li>
          <li>
            ·{' '}
            {activeTab === 'meme'
              ? '梗图将自动合成为 Markdown 格式提交'
              : '文案支持 Markdown 格式（但不推荐过度使用）'}
          </li>
        </ul>
      </div>
    </div>
  )
}
