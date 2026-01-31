'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { showLoginDialog } from '@/components/shared/LoginDialog'
import UrlImageUploader from './url-image-uploader'

const FORM_STORAGE_KEY = 'submit_joke_form_draft'

type SubmitMode = 'text' | 'meme'

/**
 * 提交段子表单组件
 */
export default function SubmitForm() {
  const { data: session, status } = useSession()
  const [activeTab, setActiveTab] = useState<SubmitMode>('text')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [pendingFiles, setPendingFiles] = useState<Map<string, File>>(new Map())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

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
            setMessage({ type: 'info', text: '已恢复您之前填写的内容' })
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
    setPendingFiles(prev => new Map(prev).set(previewUrl, file))
    setUploadedImages(prev => [...prev, previewUrl])
  }

  const handleImageRemoved = (url: string) => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
      setPendingFiles(prev => {
        const newMap = new Map(prev)
        newMap.delete(url)
        return newMap
      })
    }
    setUploadedImages(prev => prev.filter(img => img !== url))
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
                  body: formData
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
            finalImages = results.sort((a, b) => a.index - b.index).map(r => r.url)
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
          const imageMarkdown = finalImages.map(url => `![](${url})`).join('\n')
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
          setMessage({ type: 'success', text: activeTab === 'meme' ? '梗图上交成功！' : '文案上交成功！正在跳转到详情页...' })
          setTitle('')
          setContent('')
          setUploadedImages([])
          setPendingFiles(new Map())
          // 清理可能存在的草稿
          localStorage.removeItem(FORM_STORAGE_KEY)

          const targetUrl = data.detailPath || (data.issueNumber ? `/jokes/${data.issueNumber}` : data.issueUrl)

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
            localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify({
              title,
              content,
              mode: activeTab,
              images: uploadedImages.filter(url => !url.startsWith('blob:'))
            }))

            setMessage({
              type: 'error',
              text: isExpired ? '登录已过期，请重新登录' : '请先登录以继续提交'
            })

            // 显示登录确认弹窗
            showLoginDialog({
              title: isExpired ? '登录已过期' : '提交内容需要登录',
              message: isExpired
                ? '您的登录已过期，请重新登录以继续提交'
                : '登录后即可上交文案或梗图，分享快乐给更多人！',
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
  }

  const handleLoginClick = () => {
    // 保存表单数据
    if (title.trim() || content.trim() || uploadedImages.length > 0) {
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify({
        title,
        content,
        mode: activeTab,
        images: uploadedImages.filter(url => !url.startsWith('blob:'))
      }))
    }

    // 显示登录确认弹窗
    showLoginDialog({
      title: '提交内容需要登录',
      message: '登录后即可上交文案或梗图，分享快乐给更多人！',
    })
  }

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl border-4 border-black bg-white p-6 shadow-neo-xl md:p-8">
        <h2 className="mb-4 text-center text-3xl font-black italic uppercase text-black md:text-4xl">
          上交我的<span className="ml-2 text-kfc-red underline decoration-4 underline-offset-4">疯四文案</span>
        </h2>
        <p className="mb-6 text-center font-bold text-gray-600">
          请先登录 GitHub 账号以提交您的创意
        </p>
        <div className="flex justify-center">
          <button
            onClick={handleLoginClick}
            className="flex min-h-[48px] items-center gap-2 border-3 border-black bg-kfc-yellow px-6 py-2 text-lg font-black uppercase text-black shadow-neo transition-all hover:-translate-y-1 hover:bg-black hover:text-white hover:shadow-neo-lg"
          >
            <svg
              className="h-6 w-6"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            GitHub 登录
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl border-4 border-black bg-white p-6 shadow-neo-xl md:p-8">
      <h2 className="mb-6 text-center text-3xl font-black italic uppercase text-black md:mb-8 md:text-4xl">
        上交我的<span className="text-kfc-red underline decoration-4">疯四文案</span>
      </h2>

      <div className="mb-6 flex space-x-4 border-b-2 border-gray-200 pb-1">
        <button
          onClick={() => setActiveTab('text')}
          className={`pb-2 text-lg font-black uppercase transition-colors ${activeTab === 'text'
            ? 'border-b-4 border-kfc-red text-black'
            : 'text-gray-400 hover:text-gray-600'
            }`}
        >
          📝 纯文本 / Text
        </button>
        <button
          onClick={() => setActiveTab('meme')}
          className={`pb-2 text-lg font-black uppercase transition-colors ${activeTab === 'meme'
            ? 'border-b-4 border-kfc-red text-black'
            : 'text-gray-400 hover:text-gray-600'
            }`}
        >
          🖼️ 梗图 / Meme
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="title" className="block text-sm font-black uppercase text-black">
              标题 / Title *
            </label>
            <p className="text-xs font-bold text-gray-500">
              {title.length}/100
            </p>
          </div>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="给你的作品起个标题..."
            className="w-full min-h-[44px] border-2 border-black bg-white px-4 py-3 font-bold text-black shadow-neo-sm transition-all placeholder:text-gray-400 focus:bg-kfc-cream focus:shadow-neo focus:outline-none"
            disabled={isSubmitting}
            maxLength={100}
          />
        </div>

        {/* 梗图上传区域 */}
        {activeTab === 'meme' && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <label className="mb-2 block text-sm font-black uppercase text-black">
              上传梗图 / Images *
            </label>
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
            <label htmlFor="content" className="block text-sm font-black uppercase text-black">
              {activeTab === 'meme' ? '补充说明 / Description (Optional)' : '文案内容 / Content *'}
            </label>
            <p className="text-xs font-bold text-gray-500">
              {content.length}/2000
            </p>
          </div>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={activeTab === 'meme' ? "可以说说这张图的梗点..." : "开始你的表演..."}
            rows={6}
            className="w-full resize-none border-2 border-black bg-white px-4 py-3 font-bold text-black shadow-neo-sm transition-all placeholder:text-gray-400 focus:bg-kfc-cream focus:shadow-neo focus:outline-none"
            disabled={isSubmitting}
            maxLength={2000}
          />
        </div>

        {message && (
          <div className={`border-2 border-black p-4 font-bold shadow-neo-sm ${message.type === 'success'
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
            }`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full border-3 border-black bg-kfc-yellow px-6 py-4 text-xl font-black uppercase text-black shadow-neo transition-all hover:translate-x-1 hover:translate-y-1 hover:bg-black hover:text-white hover:shadow-none disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <i className="fa fa-spinner fa-spin"></i>
              SUBMITTING...
            </span>
          ) : (
            '确认上交 / SUBMIT'
          )}
        </button>
      </form>

      <div className="mt-8 border-2 border-black bg-kfc-cream p-4 shadow-neo-sm">
        <h3 className="mb-2 text-sm font-black uppercase text-black">
          <i className="fa fa-info-circle mr-2"></i>提交须知：
        </h3>
        <ul className="space-y-1 text-xs font-bold text-gray-700">
          <li>• 请确保内容原创，避免重复提交</li>
          <li>• 内容应当积极健康，符合社区规范</li>
          <li>• 提交后将自动创建 GitHub Issue，经审核后显示</li>
          <li>• {activeTab === 'meme' ? '梗图将自动合成为 Markdown 格式提交' : '文案支持 Markdown 格式 (但不推荐过度使用)'}</li>
        </ul>
      </div>
    </div>
  )
}
