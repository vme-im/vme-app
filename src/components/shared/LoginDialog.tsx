'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { modal } from '@/lib/modalManager'
import Icon from '@/components/shared/Icon'

interface LoginConfirmDialogProps {
  onClose: () => void
  title?: string
  message?: string
}

/**
 * 登录确认对话框内容
 */
function LoginConfirmDialogContent({
  onClose,
  title = '需要登录',
  message = '要登录 GitHub 才能继续，现在登一个？',
}: LoginConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await signIn('github', {
        callbackUrl: window.location.href,
      })
    } catch (error) {
      console.error('登录失败:', error)
      setIsLoading(false)
    }
  }

  return (
    <div
      className="relative w-full max-w-md border-4 border-black bg-white p-6 shadow-neo-xl animate-in zoom-in duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 font-black text-black transition-colors hover:text-kfc-red"
        disabled={isLoading}
      >
        <Icon name="x" className="text-2xl" strokeWidth={3} />
      </button>

      <div className="mb-6 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center border-3 border-black bg-kfc-red shadow-neo">
          <Icon name="github" className="text-3xl text-white" />
        </div>
      </div>

      <h3 className="mb-4 text-center text-2xl font-black text-black">{title}</h3>
      <p className="text-news-gray mb-6 text-center font-bold">{message}</p>

      <div className="mb-6 border-2 border-dashed border-black bg-kfc-cream p-4">
        <div className="flex items-start gap-2">
          <Icon name="info" className="mt-0.5 shrink-0 text-lg text-black" />
          <div className="text-sm text-black">
            <p className="mb-1 font-black">登录后你就能：</p>
            <ul className="space-y-1 font-bold">
              <li>· 给喜欢的文案点表情</li>
              <li>· 上交自己写的好活</li>
              <li>· 和一群文案鬼才一起玩</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="hover:bg-kfc-cream flex-1 border-2 border-black bg-white px-4 py-3 font-black text-black transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          取消
        </button>
        <button
          onClick={handleConfirm}
          disabled={isLoading}
          className="bg-kfc-black flex-1 border-2 border-black px-4 py-3 font-black text-white shadow-neo transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-neo"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Icon name="spinner" className="animate-spin" />
              登录中...
            </span>
          ) : (
            'GitHub 登录'
          )}
        </button>
      </div>
    </div>
  )
}

/**
 * 命令式 API - 显示登录对话框
 */
interface ShowLoginDialogOptions {
  title?: string
  message?: string
  onClose?: () => void
}

export function showLoginDialog(options: ShowLoginDialogOptions = {}) {
  const instance = modal.open({
    content: (
      <LoginConfirmDialogContent
        onClose={() => {
          instance.close()
          options.onClose?.()
        }}
        title={options.title}
        message={options.message}
      />
    ),
    closeOnBackdrop: true,
    closeOnEsc: true,
  })

  return instance
}
