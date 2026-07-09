'use client'

import { useState, useRef, ChangeEvent } from 'react'
import Icon from '@/components/shared/Icon'

interface UrlImageUploaderProps {
  onFileSelect: (file: File) => void
  onImageRemoved: (url: string) => void
  uploadedImages: string[]
  maxImages?: number
  disabled?: boolean
}

export default function UrlImageUploader({
  onFileSelect,
  onImageRemoved,
  uploadedImages = [],
  maxImages = 6,
  disabled = false,
}: UrlImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileValidation(files[0])
    }
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileValidation(e.target.files[0])
    }
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileValidation = (file: File) => {
    if (uploadedImages.length >= maxImages) {
      setUploadError(`最多只能上传 ${maxImages} 张图片`)
      return
    }

    // Basic validation
    if (!file.type.startsWith('image/')) {
      setUploadError('请上传图片文件')
      return
    }

    if (file.size > 6 * 1024 * 1024) {
      setUploadError('图片大小不能超过 6MB')
      return
    }

    setUploadError(null)
    onFileSelect(file)
  }

  return (
    <div className="space-y-4">
      {/* Image Grid */}
      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {uploadedImages.map((url, index) => (
            <div
              key={url}
              className="group shadow-neo-sm relative aspect-square overflow-hidden border-2 border-black transition-all duration-300 animate-in fade-in zoom-in-95"
            >
              <img src={url} alt={`Uploaded ${index + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onImageRemoved(url)}
                disabled={disabled}
                className="bg-kfc-black hover:bg-kfc-red absolute right-2 top-2 flex h-8 w-8 items-center justify-center border-2 border-black text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-not-allowed"
              >
                <Icon name="x" className="text-base" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Zone */}
      {uploadedImages.length < maxImages && (
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative flex cursor-pointer flex-col items-center justify-center border-3 border-dashed p-8 text-center transition-all
            ${
              isDragging
                ? 'border-kfc-red bg-kfc-cream'
                : 'border-news-rule hover:border-black hover:bg-kfc-cream'
            }
            ${disabled ? 'cursor-not-allowed opacity-60' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />

          <Icon name="upload" className="text-news-gray mb-4 text-4xl" />
          <p className="mb-1 text-lg font-black text-black">点击或拖拽上传梗图</p>
          <p className="text-news-gray text-sm font-medium">
            支持 JPG / PNG / GIF / WEBP，单张不超过 6MB
          </p>
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div className="bg-kfc-red shadow-neo-sm flex items-center gap-2 border-2 border-black p-3 text-sm font-black text-white animate-in fade-in slide-in-from-top-2">
          <Icon name="alert-triangle" className="shrink-0" />
          {uploadError}
        </div>
      )}
    </div>
  )
}
