import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getCurrentUser, requireUserAuth } from '@/lib/github-service'
import { UploadImageResponse } from '@/types'

const MAX_IMAGE_SIZE = 6 * 1024 * 1024 // 6MB
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

// R2 配置
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'vme-images'
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL // 例如: https://img.example.com

function getS3Client() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 配置不完整')
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  })
}

function getFileExtension(file: File): string | null {
  if (file.type && ALLOWED_TYPES[file.type]) {
    return ALLOWED_TYPES[file.type]
  }

  const name = file.name || ''
  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() : ''
  if (!ext) return null

  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    return ext === 'jpeg' ? 'jpg' : ext
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户登录（防滥用）
    const user = await getCurrentUser(request)
    requireUserAuth(user)

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json<UploadImageResponse>({
        success: false,
        message: '请提供有效的图片文件',
      }, { status: 400 })
    }

    if (file.size <= 0) {
      return NextResponse.json<UploadImageResponse>({
        success: false,
        message: '图片文件为空',
      }, { status: 400 })
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json<UploadImageResponse>({
        success: false,
        message: `图片大小不能超过 ${Math.floor(MAX_IMAGE_SIZE / (1024 * 1024))}MB`,
      }, { status: 413 })
    }

    const extension = getFileExtension(file)
    if (!extension) {
      return NextResponse.json<UploadImageResponse>({
        success: false,
        message: '仅支持 jpg/png/webp/gif 格式',
      }, { status: 415 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const hash = crypto.createHash('sha256').update(new Uint8Array(arrayBuffer)).digest('hex').slice(0, 12)
    const timestamp = Date.now()
    const key = `memes/${timestamp}-${hash}.${extension}`

    // 上传到 R2
    const s3Client = getS3Client()
    await s3Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type || `image/${extension}`,
    }))

    // 构建公开访问 URL
    const url = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`
      : `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.dev/${key}`

    return NextResponse.json<UploadImageResponse>({
      success: true,
      message: '梗图上传成功',
      url,
      path: key,
      size: file.size,
      contentType: file.type || `image/${extension}`,
    })
  } catch (error: any) {
    console.error('上传梗图失败:', {
      error: error.message,
      stack: error.stack
    })

    if (error.message === 'R2 配置不完整') {
      return NextResponse.json<UploadImageResponse>({
        success: false,
        message: '图片服务未配置',
      }, { status: 503 })
    }

    if (error.name === 'CredentialsProviderError' || error.code === 'AUTHENTICATION_REQUIRED' || error.code === 'NOT_AUTHENTICATED') {
      return NextResponse.json<UploadImageResponse>({
        success: false,
        message: '请先登录GitHub账号',
      }, { status: 401 })
    }

    return NextResponse.json<UploadImageResponse>({
      success: false,
      message: '服务器错误，请稍后重试',
    }, { status: 500 })
  }
}
