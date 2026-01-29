'use client'

import { useState, useRef, ChangeEvent } from 'react'

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
    disabled = false
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
                            className="group relative aspect-square overflow-hidden rounded-lg border-2 border-black shadow-neo-sm transition-all duration-300 animate-in fade-in zoom-in-95"
                        >
                            <img
                                src={url}
                                alt={`Uploaded ${index + 1}`}
                                className="h-full w-full object-cover"
                            />
                            <button
                                type="button"
                                onClick={() => onImageRemoved(url)}
                                disabled={disabled}
                                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100 disabled:cursor-not-allowed"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                                </svg>
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
            relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-3 border-dashed p-8 text-center transition-all
            ${isDragging
                            ? 'border-kfc-red bg-red-50'
                            : 'border-gray-300 hover:border-black hover:bg-gray-50'
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

                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                    </div>
                    <p className="mb-1 text-lg font-black text-black">
                        点击或拖拽上传梗图
                    </p>
                    <p className="text-sm font-medium text-gray-500">
                        支持 JPG, PNG, GIF, WEBP (Max 6MB)
                    </p>
                </div>
            )}

            {/* Error Message */}
            {uploadError && (
                <div
                    className="rounded-md bg-red-50 p-3 text-sm font-bold text-red-600 animate-in fade-in slide-in-from-top-2"
                >
                    <span className="mr-2">⚠️</span>
                    {uploadError}
                </div>
            )}
        </div>
    )
}
