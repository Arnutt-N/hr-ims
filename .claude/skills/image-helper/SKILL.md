---
name: image-helper
description: Image processing, optimization, and manipulation for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["image", "resize", "compress", "optimize", "image upload", "thumbnail"]
  file_patterns: ["*image*", "lib/image*", "lib/resize*"]
  context: Image processing, optimization, thumbnails
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# Image Helper

## Core Role

Handle image processing for HR-IMS:
- Image compression
- Thumbnail generation
- Format conversion
- Avatar processing

---

## Install Dependencies

```bash
npm install sharp
npm install @types/sharp -D
```

---

## Image Processor

```typescript
// lib/image/processor.ts
import sharp from 'sharp'

interface ProcessOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
}

export async function processImage(
  input: Buffer | string,
  options: ProcessOptions = {}
): Promise<Buffer> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 80,
    format = 'jpeg',
    fit = 'inside'
  } = options

  let image = sharp(input)

  // Get metadata
  const metadata = await image.metadata()

  // Resize if needed
  if (metadata.width && metadata.width > maxWidth) {
    image = image.resize({
      width: maxWidth,
      height: maxHeight,
      fit,
      withoutEnlargement: true
    })
  }

  // Convert format
  switch (format) {
    case 'jpeg':
      image = image.jpeg({ quality, mozjpeg: true })
      break
    case 'png':
      image = image.png({ compressionLevel: 9 })
      break
    case 'webp':
      image = image.webp({ quality })
      break
  }

  return image.toBuffer()
}

// Create thumbnail
export async function createThumbnail(
  input: Buffer | string,
  size: number = 200
): Promise<Buffer> {
  return sharp(input)
    .resize(size, size, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 80 })
    .toBuffer()
}

// Create multiple sizes
export async function createImageSizes(
  input: Buffer | string,
  sizes: Array<{ name: string; width: number; height?: number }> = [
    { name: 'thumbnail', width: 200 },
    { name: 'medium', width: 600 },
    { name: 'large', width: 1200 }
  ]
): Promise<Record<string, Buffer>> {
  const results: Record<string, Buffer> = {}

  for (const size of sizes) {
    results[size.name] = await sharp(input)
      .resize(size.width, size.height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toBuffer()
  }

  return results
}

// Get image metadata
export async function getImageMetadata(input: Buffer | string) {
  const image = sharp(input)
  const metadata = await image.metadata()

  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    size: metadata.size,
    hasAlpha: metadata.hasAlpha,
    space: metadata.space
  }
}

// Convert to WebP (better compression)
export async function convertToWebP(
  input: Buffer | string,
  quality: number = 80
): Promise<Buffer> {
  return sharp(input)
    .webp({ quality })
    .toBuffer()
}

// Add watermark
export async function addWatermark(
  image: Buffer | string,
  watermark: Buffer | string,
  position: 'center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' = 'bottom-right',
  opacity: number = 0.5
): Promise<Buffer> {
  const imageMetadata = await sharp(image).metadata()
  const watermarkMetadata = await sharp(watermark).metadata()

  // Calculate position
  let left: number, top: number
  const padding = 20

  switch (position) {
    case 'center':
      left = Math.floor((imageMetadata.width! - watermarkMetadata.width!) / 2)
      top = Math.floor((imageMetadata.height! - watermarkMetadata.height!) / 2)
      break
    case 'bottom-right':
      left = imageMetadata.width! - watermarkMetadata.width! - padding
      top = imageMetadata.height! - watermarkMetadata.height! - padding
      break
    case 'bottom-left':
      left = padding
      top = imageMetadata.height! - watermarkMetadata.height! - padding
      break
    case 'top-right':
      left = imageMetadata.width! - watermarkMetadata.width! - padding
      top = padding
      break
    case 'top-left':
      left = padding
      top = padding
      break
  }

  // Resize watermark if too large
  const resizedWatermark = await sharp(watermark)
    .resize(Math.floor(imageMetadata.width! * 0.2)) // Max 20% of image width
    .toBuffer()

  return sharp(image)
    .composite([{
      input: resizedWatermark,
      left,
      top,
      blend: 'over'
    }])
    .toBuffer()
}
```

---

## Avatar Processing

```typescript
// lib/image/avatar.ts
import sharp from 'sharp'
import { createHash } from 'crypto'

interface AvatarOptions {
  size?: number
  defaultAvatar?: string
}

// Generate initials avatar
export function generateInitialsAvatar(
  name: string,
  options: AvatarOptions = {}
): Buffer {
  const { size = 200 } = options

  // Get initials
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Generate color from name
  const hash = createHash('md5').update(name).digest('hex')
  const color = `#${hash.slice(0, 6)}`

  // Calculate text color (white or black based on background)
  const r = parseInt(hash.slice(0, 2), 16)
  const g = parseInt(hash.slice(2, 4), 16)
  const b = parseInt(hash.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const textColor = luminance > 0.5 ? '#000000' : '#ffffff'

  // Create SVG
  const fontSize = size * 0.4
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
      <text
        x="50%"
        y="50%"
        dominant-baseline="central"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="${textColor}"
      >${initials}</text>
    </svg>
  `

  return Buffer.from(svg)
}

// Process avatar upload
export async function processAvatar(
  input: Buffer,
  options: AvatarOptions = {}
): Promise<{ avatar: Buffer; thumbnail: Buffer }> {
  const { size = 200 } = options

  // Process to square
  const avatar = await sharp(input)
    .resize(size, size, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 85 })
    .toBuffer()

  // Create smaller thumbnail
  const thumbnail = await sharp(avatar)
    .resize(50, 50, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toBuffer()

  return { avatar, thumbnail }
}

// Get avatar URL or generate default
export function getAvatarUrl(
  avatarPath: string | null,
  userName: string,
  size: number = 200
): string {
  if (avatarPath) {
    return avatarPath
  }

  // Generate SVG initials as data URL
  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const hash = createHash('md5').update(userName).digest('hex')
  const color = `#${hash.slice(0, 6)}`

  const r = parseInt(hash.slice(0, 2), 16)
  const g = parseInt(hash.slice(2, 4), 16)
  const b = parseInt(hash.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const textColor = luminance > 0.5 ? '#000000' : '#ffffff'

  const fontSize = size * 0.4
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
      <text
        x="50%" y="50%"
        dominant-baseline="central"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="${textColor}"
      >${initials}</text>
    </svg>
  `

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
```

---

## Image Validation

```typescript
// lib/image/validation.ts
import { FileType } from 'file-type'

export interface ImageValidationResult {
  valid: boolean
  error?: string
  width?: number
  height?: number
  format?: string
  size?: number
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
export const MIN_DIMENSION = 100
export const MAX_DIMENSION = 5000

export async function validateImage(
  buffer: Buffer,
  options: {
    maxSize?: number
    minDimension?: number
    maxDimension?: number
    allowedTypes?: string[]
  } = {}
): Promise<ImageValidationResult> {
  const {
    maxSize = MAX_IMAGE_SIZE,
    minDimension = MIN_DIMENSION,
    maxDimension = MAX_DIMENSION,
    allowedTypes = ALLOWED_IMAGE_TYPES
  } = options

  // Check file size
  if (buffer.length > maxSize) {
    return {
      valid: false,
      error: `ขนาดไฟล์ต้องไม่เกิน ${maxSize / 1024 / 1024}MB`
    }
  }

  // Detect actual file type
  const fileType = await FileType.fromBuffer(buffer)

  if (!fileType || !allowedTypes.includes(fileType.mime)) {
    return {
      valid: false,
      error: `ประเภทไฟล์ไม่รองรับ (รองรับ: ${allowedTypes.join(', ')})`
    }
  }

  // Get dimensions
  const sharp = require('sharp')
  const metadata = await sharp(buffer).metadata()

  if (!metadata.width || !metadata.height) {
    return {
      valid: false,
      error: 'ไม่สามารถอ่านข้อมูลรูปภาพได้'
    }
  }

  // Check dimensions
  if (metadata.width < minDimension || metadata.height < minDimension) {
    return {
      valid: false,
      error: `ขนาดรูปต้องไม่น้อยกว่า ${minDimension}x${minDimension} พิกเซล`
    }
  }

  if (metadata.width > maxDimension || metadata.height > maxDimension) {
    return {
      valid: false,
      error: `ขนาดรูปต้องไม่เกิน ${maxDimension}x${maxDimension} พิกเซล`
    }
  }

  return {
    valid: true,
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    size: buffer.length
  }
}
```

---

## Image Upload Handler

```typescript
// lib/image/upload-handler.ts
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { processImage, createThumbnail } from './processor'
import { validateImage } from './validation'
import { randomBytes } from 'crypto'

export interface UploadResult {
  success: boolean
  path?: string
  thumbnailPath?: string
  error?: string
}

export async function handleImageUpload(
  file: File,
  options: {
    directory?: string
    prefix?: string
    sizes?: Array<{ name: string; width: number }>
    maxSize?: number
  } = {}
): Promise<UploadResult> {
  const {
    directory = 'uploads/images',
    prefix = 'img',
    sizes,
    maxSize
  } = options

  try {
    // Read file
    const buffer = Buffer.from(await file.arrayBuffer())

    // Validate
    const validation = await validateImage(buffer, { maxSize })
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // Generate filename
    const ext = validation.format === 'jpeg' ? 'jpg' : validation.format || 'jpg'
    const filename = `${prefix}-${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`

    // Ensure directory exists
    const uploadDir = join(process.cwd(), 'public', directory)
    await mkdir(uploadDir, { recursive: true })

    // Process and save
    const processed = await processImage(buffer, { format: 'jpeg' })
    const filepath = join(uploadDir, filename)
    await writeFile(filepath, processed)

    // Create thumbnail
    const thumbnail = await createThumbnail(buffer, 200)
    const thumbFilename = `thumb-${filename}`
    const thumbPath = join(uploadDir, thumbFilename)
    await writeFile(thumbPath, thumbnail)

    // Create additional sizes if requested
    if (sizes) {
      for (const size of sizes) {
        const sizedImage = await processImage(buffer, {
          maxWidth: size.width,
          format: 'jpeg'
        })
        const sizeFilename = `${size.name}-${filename}`
        await writeFile(join(uploadDir, sizeFilename), sizedImage)
      }
    }

    return {
      success: true,
      path: `/${directory}/${filename}`,
      thumbnailPath: `/${directory}/${thumbFilename}`
    }
  } catch (error) {
    console.error('Image upload failed:', error)
    return {
      success: false,
      error: 'การอัปโหลดรูปภาพล้มเหลว'
    }
  }
}
```

---

## Next.js Image Component Wrapper

```typescript
// components/ui/optimized-image.tsx
'use client'

import Image, { ImageProps } from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { getAvatarUrl } from '@/lib/image/avatar'

interface OptimizedImageProps extends Omit<ImageProps, 'onError'> {
  fallback?: string
  fallbackName?: string
}

export function OptimizedImage({
  src,
  alt,
  fallback,
  fallbackName,
  className,
  ...props
}: OptimizedImageProps) {
  const [error, setError] = useState(false)

  const handleError = () => {
    setError(true)
  }

  // Use fallback or generate initials
  const imageSrc = error || !src
    ? fallback || (fallbackName ? getAvatarUrl(null, fallbackName, props.width as number) : '/placeholder.png')
    : src

  return (
    <Image
      src={imageSrc}
      alt={alt}
      className={cn(className)}
      onError={handleError}
      {...props}
    />
  )
}

// Avatar component
interface AvatarImageProps {
  src: string | null
  name: string
  size?: number
  className?: string
}

export function AvatarImage({ src, name, size = 40, className }: AvatarImageProps) {
  return (
    <OptimizedImage
      src={src}
      alt={name}
      fallbackName={name}
      width={size}
      height={size}
      className={cn('rounded-full object-cover', className)}
    />
  )
}
```

---

## Server Action

```typescript
// lib/actions/image.ts
'use server'

import { auth } from '@/auth'
import { handleImageUpload } from '@/lib/image/upload-handler'
import { revalidatePath } from 'next/cache'

export async function uploadImageAction(formData: FormData) {
  const session = await auth()
  if (!session) return { error: 'Unauthorized' }

  const file = formData.get('file') as File
  if (!file) return { error: 'No file provided' }

  const type = formData.get('type') as string // 'avatar', 'item', etc.

  const result = await handleImageUpload(file, {
    directory: `uploads/${type}`,
    prefix: type,
    maxSize: 5 * 1024 * 1024 // 5MB
  })

  if (result.success) {
    revalidatePath(result.path!)
  }

  return result
}
```

---

## Usage Examples

```typescript
// Example 1: Process uploaded image
const processed = await processImage(uploadedBuffer, {
  maxWidth: 1200,
  quality: 85,
  format: 'webp'
})

// Example 2: Create thumbnails
const { avatar, thumbnail } = await processAvatar(avatarBuffer, { size: 200 })

// Example 3: Generate initials avatar
const initialsAvatar = generateInitialsAvatar('John Doe')

// Example 4: Display avatar with fallback
<AvatarImage src={user.avatar} name={user.name} size={48} />

// Example 5: Upload and process
const result = await handleImageUpload(file, {
  directory: 'uploads/items',
  prefix: 'item',
  sizes: [
    { name: 'thumbnail', width: 200 },
    { name: 'medium', width: 600 }
  ]
})
```

---

*Version: 1.0.0 | For HR-IMS Project*
