---
name: image-optimizer
description: Image optimization and responsive images for HR-IMS | การเพิ่มประสิทธิภาพภาพและภาพตอบสนองสำหรับ HR-IMS
version: 1.0.0
author: HR-IMS Team
tags: [image, optimization, responsive, nextjs, performance]
languages: [en, th]
---

# Image Optimizer / ตัวเพิ่มประสิทธิภาพภาพ

Image optimization and responsive images for HR-IMS applications.

## Overview / ภาพรวม

**EN**: Comprehensive image optimization system with responsive images, lazy loading, format conversion, and Next.js Image integration for optimal performance.

**TH**: ระบบเพิ่มประสิทธิภาพภาพที่ครอบคลุมพร้อมภาพตอบสนอง การโหลดแบบขี้เกียจ การแปลงรูปแบบ และการรวม Next.js Image เพื่อประสิทธิภาพที่เหมาะสมที่สุด

## Core Features / คุณสมบัติหลัก

### 1. Optimized Image Component / คอมโพเนนต์ภาพที่เพิ่มประสิทธิภาพ

```typescript
// components/ui/optimized-image.tsx
'use client'

import Image from 'next/image'
import { useState, useCallback } from 'react'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  priority?: boolean
  sizes?: string
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  className?: string
  containerClassName?: string
  fallback?: string
  onLoad?: () => void
  onError?: () => void
}

// Default blur placeholder / ตัวยึดตำแหน่งเบลอเริ่มต้น
const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#f0f0f0" offset="20%" />
      <stop stop-color="#e0e0e0" offset="50%" />
      <stop stop-color="#f0f0f0" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#f0f0f0" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`

const toBase64 = (str: string) =>
  typeof window === 'undefined'
    ? Buffer.from(str).toString('base64')
    : window.btoa(str)

export function OptimizedImage({
  src,
  alt,
  width = 400,
  height = 300,
  fill = false,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  quality = 75,
  placeholder = 'blur',
  blurDataURL,
  className = '',
  containerClassName = '',
  fallback = '/images/placeholder.png',
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const handleError = useCallback(() => {
    setError(true)
    onError?.()
  }, [onError])

  const handleLoad = useCallback(() => {
    setLoaded(true)
    onLoad?.()
  }, [onLoad])

  const blurPlaceholder = blurDataURL || `data:image/svg+xml;base64,${toBase64(shimmer(width, height))}`

  if (fill) {
    return (
      <div className={`relative overflow-hidden ${containerClassName}`}>
        <Image
          src={error ? fallback : src}
          alt={alt}
          fill
          sizes={sizes}
          quality={quality}
          priority={priority}
          placeholder={placeholder}
          blurDataURL={blurPlaceholder}
          className={`object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      <Image
        src={error ? fallback : src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        quality={quality}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurPlaceholder}
        className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  )
}
```

### 2. Avatar Image Component / คอมโพเนนต์ภาพอวตาร

```typescript
// components/ui/avatar-image.tsx
'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface AvatarImageProps {
  src?: string | null
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
}

const sizePixels = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
}

// Generate color from name / สร้างสีจากชื่อ
function getColorFromName(name: string): string {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
  ]

  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

// Get initials from name / ดึงอักษรย่อจากชื่อ
function getInitials(name: string): string {
  const words = name.trim().split(' ')
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function AvatarImage({ src, name, size = 'md', className }: AvatarImageProps) {
  const [error, setError] = useState(false)

  const handleError = useCallback(() => {
    setError(true)
  }, [])

  const initials = getInitials(name)
  const bgColor = getColorFromName(name)

  if (!src || error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full font-medium text-white',
          sizeClasses[size],
          bgColor,
          className
        )}
        title={name}
      >
        {initials}
      </div>
    )
  }

  return (
    <div className={cn('relative rounded-full overflow-hidden', sizeClasses[size], className)}>
      <Image
        src={src}
        alt={name}
        width={sizePixels[size]}
        height={sizePixels[size]}
        className="object-cover"
        onError={handleError}
      />
    </div>
  )
}
```

### 3. Responsive Image Gallery / แกลเลอรีภาพตอบสนอง

```typescript
// components/ui/image-gallery.tsx
'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface GalleryImage {
  id: string
  src: string
  alt: string
  thumbnail?: string
  width?: number
  height?: number
}

interface ImageGalleryProps {
  images: GalleryImage[]
  columns?: 2 | 3 | 4 | 5
  gap?: number
}

export function ImageGallery({ images, columns = 3, gap = 4 }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const openLightbox = useCallback((index: number) => {
    setSelectedIndex(index)
  }, [])

  const closeLightbox = useCallback(() => {
    setSelectedIndex(null)
  }, [])

  const goToPrevious = useCallback(() => {
    if (selectedIndex === null) return
    setSelectedIndex(selectedIndex === 0 ? images.length - 1 : selectedIndex - 1)
  }, [selectedIndex, images.length])

  const goToNext = useCallback(() => {
    if (selectedIndex === null) return
    setSelectedIndex(selectedIndex === images.length - 1 ? 0 : selectedIndex + 1)
  }, [selectedIndex, images.length])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious()
      if (e.key === 'ArrowRight') goToNext()
      if (e.key === 'Escape') closeLightbox()
    },
    [goToPrevious, goToNext, closeLightbox]
  )

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  }

  return (
    <>
      <div className={`grid ${gridCols[columns]} gap-${gap}`}>
        {images.map((image, index) => (
          <button
            key={image.id}
            onClick={() => openLightbox(index)}
            className="relative aspect-square overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <Image
              src={image.thumbnail || image.src}
              alt={image.alt}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover transition-transform hover:scale-105"
            />
          </button>
        ))}
      </div>

      {/* Lightbox / ไลท์บ็อกซ์ */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => closeLightbox()}>
        <DialogContent
          className="max-w-screen-lg w-full h-[90vh] p-0 bg-black/90"
          onKeyDown={handleKeyDown}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close button / ปุ่มปิด */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white z-10"
              onClick={closeLightbox}
            >
              <X className="w-6 h-6" />
            </Button>

            {/* Navigation / การนำทาง */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 text-white z-10"
              onClick={goToPrevious}
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 text-white z-10"
              onClick={goToNext}
            >
              <ChevronRight className="w-8 h-8" />
            </Button>

            {/* Image / ภาพ */}
            {selectedIndex !== null && (
              <div className="relative w-full h-full flex items-center justify-center p-16">
                <Image
                  src={images[selectedIndex].src}
                  alt={images[selectedIndex].alt}
                  fill
                  sizes="100vw"
                  className="object-contain"
                  priority
                />
              </div>
            )}

            {/* Counter / ตัวนับ */}
            {selectedIndex !== null && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
                {selectedIndex + 1} / {images.length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

### 4. Image Upload with Preview / อัปโหลดภาพพร้อมตัวอย่าง

```typescript
// components/ui/image-upload.tsx
'use client'

import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Upload, X, Camera } from 'lucide-react'

interface ImageUploadProps {
  value?: string
  onChange: (file: File | null, preview: string | null) => void
  accept?: string
  maxSize?: number // in bytes
  className?: string
  disabled?: boolean
}

export function ImageUpload({
  value,
  onChange,
  accept = 'image/jpeg,image/png,image/webp',
  maxSize = 5 * 1024 * 1024, // 5MB
  className,
  disabled = false,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!accept.includes(file.type)) {
        return 'Invalid file type. Please upload JPEG, PNG, or WebP.'
      }
      if (file.size > maxSize) {
        return `File too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(0)}MB.`
      }
      return null
    },
    [accept, maxSize]
  )

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }

      setError(null)
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setPreview(result)
        onChange(file, result)
      }
      reader.readAsDataURL(file)
    },
    [validateFile, onChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)

      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleRemove = useCallback(() => {
    setPreview(null)
    setError(null)
    onChange(null, null)
    if (inputRef.current) inputRef.current.value = ''
  }, [onChange])

  return (
    <div className={cn('space-y-2', className)}>
      {preview ? (
        <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
          <Image src={preview} alt="Preview" fill className="object-cover" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 w-6 h-6"
            onClick={handleRemove}
            disabled={disabled}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'w-32 h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors',
            dragOver ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Camera className="w-8 h-8 text-muted-foreground mb-2" />
          <span className="text-xs text-muted-foreground text-center px-2">
            Click or drag image
            <br />
            คลิกหรือลากภาพ
          </span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
```

### 5. Next.js Image Configuration / การกำหนดค่าภาพ Next.js

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const config: NextConfig = {
  images: {
    // Remote image domains / โดเมนภาพระยะไกล
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
    ],

    // Image formats / รูปแบบภาพ
    formats: ['image/avif', 'image/webp'],

    // Device sizes for responsive images / ขนาดอุปกรณ์สำหรับภาพตอบสนอง
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],

    // Image sizes for srcset / ขนาดภาพสำหรับ srcset
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // Minimum cache TTL / TTL แคชขั้นต่ำ
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days

    // Disable static imports / ปิดการนำเข้าแบบคงที่
    unoptimized: process.env.NODE_ENV === 'development',
  },
}

export default config
```

### 6. Image Utility Functions / ฟังก์ชันยูทิลิตี้ภาพ

```typescript
// lib/utils/image-utils.ts

// Generate blur data URL / สร้าง blur data URL
export function generateBlurDataURL(width: number = 10, height: number = 10): string {
  const shimmer = `
    <svg width="${width}" height="${height}" version="1.1" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#f0f0f0"/>
    </svg>
  `
  return `data:image/svg+xml;base64,${
    typeof window === 'undefined'
      ? Buffer.from(shimmer).toString('base64')
      : window.btoa(shimmer)
  }`
}

// Validate image file / ตรวจสอบไฟล์ภาพ
export function validateImageFile(
  file: File,
  options: {
    maxSize?: number
    allowedTypes?: string[]
  } = {}
): { valid: boolean; error?: string } {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  } = options

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum: ${(maxSize / 1024 / 1024).toFixed(0)}MB`,
    }
  }

  return { valid: true }
}

// Get image dimensions / ดึงขนาดภาพ
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
    }
    img.onerror = () => resolve(null)
    img.src = URL.createObjectURL(file)
  })
}

// Compress image before upload / บีบอัดภาพก่อนอัปโหลด
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number
    maxHeight?: number
    quality?: number
  } = {}
): Promise<File> {
  const { maxWidth = 1920, maxHeight = 1080, quality = 0.8 } = options

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img

        // Calculate new dimensions / คำนวณขนาดใหม่
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        // Create canvas / สร้าง canvas
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Could not create blob'))
              return
            }

            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            })

            resolve(compressedFile)
          },
          file.type,
          quality
        )
      }
      img.onerror = () => reject(new Error('Could not load image'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

// Generate responsive image sizes / สร้างขนาดภาพตอบสนอง
export function getResponsiveSizes(breakpoints: {
  mobile?: string
  tablet?: string
  desktop?: string
}): string {
  const { mobile = '100vw', tablet = '50vw', desktop = '33vw' } = breakpoints
  return `(max-width: 768px) ${mobile}, (max-width: 1200px) ${tablet}, ${desktop}`
}
```

## Usage Examples / ตัวอย่างการใช้งาน

### Basic Usage / การใช้งานพื้นฐาน

```tsx
// Avatar / อวตาร
<AvatarImage src={user.avatar} name={user.name} size="lg" />

// Optimized image / ภาพที่เพิ่มประสิทธิภาพ
<OptimizedImage
  src="/images/inventory/item-1.jpg"
  alt="Inventory item"
  width={400}
  height={300}
  priority={false}
/>

// Gallery / แกลเลอรี
<ImageGallery
  images={itemImages}
  columns={4}
/>
```

### Image Upload / อัปโหลดภาพ

```tsx
import { ImageUpload } from '@/components/ui/image-upload'
import { compressImage } from '@/lib/utils/image-utils'

function ProfileForm() {
  const [avatar, setAvatar] = useState<File | null>(null)

  const handleImageChange = async (file: File | null, preview: string | null) => {
    if (file) {
      const compressed = await compressImage(file, { maxWidth: 500, quality: 0.8 })
      setAvatar(compressed)
    } else {
      setAvatar(null)
    }
  }

  return (
    <ImageUpload
      value={currentAvatar}
      onChange={handleImageChange}
      maxSize={2 * 1024 * 1024} // 2MB
    />
  )
}
```

## Best Practices / แนวทางปฏิบัติ

1. **Use Next.js Image**: Leverage automatic optimization
   - **ใช้ Next.js Image**: ใช้ประโยชน์จากการเพิ่มประสิทธิภาพอัตโนมัติ

2. **Lazy Load Below Fold**: Defer off-screen images
   - **โหลดแบบขี้เกียจใต้พับ**: เลื่อนภาพนอกหน้าจอ

3. **Compress Before Upload**: Reduce file size client-side
   - **บีบอัดก่อนอัปโหลด**: ลดขนาดไฟล์ที่ฝั่งไคลเอนต์

4. **Use Modern Formats**: AVIF, WebP over JPEG/PNG
   - **ใช้รูปแบบทันสมัย**: AVIF, WebP แทน JPEG/PNG

5. **Provide Fallbacks**: Handle loading and error states
   - **มีตัวเลือกสำรอง**: จัดการสถานะการโหลดและข้อผิดพลาด

## Related Skills / Skills ที่เกี่ยวข้อง

- `bundle-optimizer` - Bundle optimization
- `file-upload` - File upload handling
- `performance-monitor` - Performance monitoring
