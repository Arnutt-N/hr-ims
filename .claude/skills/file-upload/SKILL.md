---
name: file-upload
description: File upload handling for avatars, documents, and images in HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["upload", "file", "image", "avatar", "document", "attachment"]
  file_patterns: ["*upload*", "lib/upload/**", "components/upload/**"]
  context: file handling, image processing, document management
mcp_servers:
  - sequential
personas:
  - backend
  - frontend
---

# File Upload

## Core Role

Handle file uploads for HR-IMS:
- Avatar image uploads
- Document attachments
- Image processing and optimization
- Secure file storage

---

## Upload Configuration

```yaml
storage:
  local:
    path: "uploads/"
    max_size: 10MB

  allowed_types:
    images: ["image/jpeg", "image/png", "image/webp", "image/gif"]
    documents: ["application/pdf", "application/msword", "text/csv"]

  restrictions:
    max_file_size: 10MB
    max_avatar_size: 2MB
    max_document_size: 10MB
```

---

## Server Actions

### Avatar Upload

```typescript
// lib/actions/upload.ts
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_AVATAR_SIZE = 2 * 1024 * 1024 // 2MB

const avatarUploadSchema = z.object({
  file: z.custom<File>((file) => file instanceof File, 'Invalid file'),
  userId: z.number().int().positive()
})

export async function uploadAvatar(input: { file: File; userId: number }) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // Only allow uploading own avatar or admin
  const targetUserId = input.userId
  const isOwn = parseInt(session.user.id) === targetUserId
  const isAdmin = await hasAnyRole(parseInt(session.user.id), ['admin', 'superadmin'])

  if (!isOwn && !isAdmin) {
    return { error: 'Forbidden', code: 'FORBIDDEN' }
  }

  const file = input.file

  // Validate file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.',
      code: 'INVALID_FILE_TYPE'
    }
  }

  // Validate file size
  if (file.size > MAX_AVATAR_SIZE) {
    return {
      error: 'File too large. Maximum size is 2MB.',
      code: 'FILE_TOO_LARGE'
    }
  }

  try {
    // Ensure upload directory exists
    await mkdir(path.join(UPLOAD_DIR, 'avatars'), { recursive: true })

    // Read file buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Process image with sharp
    const processedImage = await sharp(buffer)
      .resize(200, 200, { fit: 'cover', position: 'center' })
      .webp({ quality: 80 })
      .toBuffer()

    // Generate filename
    const filename = `avatar_${targetUserId}_${Date.now()}.webp`
    const filepath = path.join(UPLOAD_DIR, 'avatars', filename)

    // Get old avatar to delete
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { avatar: true }
    })

    // Save new file
    await writeFile(filepath, processedImage)

    // Update database
    const avatarUrl = `/uploads/avatars/${filename}`
    await prisma.user.update({
      where: { id: targetUserId },
      data: { avatar: avatarUrl }
    })

    // Delete old avatar if exists
    if (user?.avatar) {
      const oldPath = path.join(process.cwd(), 'public', user.avatar)
      try {
        await unlink(oldPath)
      } catch {
        // Ignore if file doesn't exist
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        tableName: 'User',
        recordId: targetUserId.toString(),
        userId: parseInt(session.user.id),
        newData: { avatar: avatarUrl }
      }
    })

    revalidatePath('/profile')
    return { success: true, url: avatarUrl }

  } catch (error) {
    console.error('Upload avatar error:', error)
    return { error: 'Failed to upload avatar', code: 'INTERNAL_ERROR' }
  }
}

export async function deleteAvatar(userId: number) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const isOwn = parseInt(session.user.id) === userId
  const isAdmin = await hasAnyRole(parseInt(session.user.id), ['admin', 'superadmin'])

  if (!isOwn && !isAdmin) {
    return { error: 'Forbidden', code: 'FORBIDDEN' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true }
    })

    if (!user?.avatar) {
      return { error: 'No avatar to delete', code: 'NOT_FOUND' }
    }

    // Delete file
    const filepath = path.join(process.cwd(), 'public', user.avatar)
    try {
      await unlink(filepath)
    } catch {
      // Ignore if file doesn't exist
    }

    // Update database
    await prisma.user.update({
      where: { id: userId },
      data: { avatar: null }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        tableName: 'User',
        recordId: userId.toString(),
        userId: parseInt(session.user.id),
        oldData: { avatar: user.avatar },
        newData: { avatar: null }
      }
    })

    revalidatePath('/profile')
    return { success: true }

  } catch (error) {
    console.error('Delete avatar error:', error)
    return { error: 'Failed to delete avatar', code: 'INTERNAL_ERROR' }
  }
}
```

### Document Upload

```typescript
const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv'
]
const MAX_DOC_SIZE = 10 * 1024 * 1024 // 10MB

export async function uploadDocument(input: {
  file: File
  entityType: 'request' | 'inventory' | 'maintenance'
  entityId: number
  description?: string
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const { file, entityType, entityId, description } = input

  // Validate file type
  if (!ALLOWED_DOC_TYPES.includes(file.type)) {
    return {
      error: 'Invalid file type',
      code: 'INVALID_FILE_TYPE'
    }
  }

  // Validate file size
  if (file.size > MAX_DOC_SIZE) {
    return {
      error: 'File too large. Maximum size is 10MB.',
      code: 'FILE_TOO_LARGE'
    }
  }

  try {
    await mkdir(path.join(UPLOAD_DIR, 'documents', entityType), { recursive: true })

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'bin'
    const filename = `${entityType}_${entityId}_${Date.now()}.${ext}`
    const filepath = path.join(UPLOAD_DIR, 'documents', entityType, filename)

    // Write file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Save to database
    const document = await prisma.document.create({
      data: {
        name: file.name,
        filename,
        mimeType: file.type,
        size: file.size,
        entityType,
        entityId,
        description,
        uploadedBy: parseInt(session.user.id)
      }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        tableName: 'Document',
        recordId: document.id.toString(),
        userId: parseInt(session.user.id),
        newData: { name: file.name, entityType, entityId }
      }
    })

    return { success: true, document }

  } catch (error) {
    console.error('Upload document error:', error)
    return { error: 'Failed to upload document', code: 'INTERNAL_ERROR' }
  }
}

export async function deleteDocument(documentId: number) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId }
    })

    if (!document) {
      return { error: 'Document not found', code: 'NOT_FOUND' }
    }

    // Check permission (owner or admin)
    const isOwner = document.uploadedBy === parseInt(session.user.id)
    const isAdmin = await hasAnyRole(parseInt(session.user.id), ['admin', 'superadmin'])

    if (!isOwner && !isAdmin) {
      return { error: 'Forbidden', code: 'FORBIDDEN' }
    }

    // Delete file
    const filepath = path.join(
      UPLOAD_DIR,
      'documents',
      document.entityType,
      document.filename
    )
    try {
      await unlink(filepath)
    } catch {
      // Ignore if file doesn't exist
    }

    // Delete from database
    await prisma.document.delete({
      where: { id: documentId }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        tableName: 'Document',
        recordId: documentId.toString(),
        userId: parseInt(session.user.id),
        oldData: { name: document.name }
      }
    })

    return { success: true }

  } catch (error) {
    console.error('Delete document error:', error)
    return { error: 'Failed to delete document', code: 'INTERNAL_ERROR' }
  }
}
```

---

## Frontend Components

### Avatar Upload Component

```typescript
// components/upload/avatar-upload.tsx
'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { uploadAvatar, deleteAvatar } from '@/lib/actions/upload'
import { Camera, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AvatarUploadProps {
  userId: number
  currentAvatar?: string | null
  name: string
  className?: string
}

export function AvatarUpload({
  userId,
  currentAvatar,
  name,
  className
}: AvatarUploadProps) {
  const [avatar, setAvatar] = useState(currentAvatar)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)

    // Preview
    const reader = new FileReader()
    reader.onload = (ev) => {
      setAvatar(ev.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload
    const result = await uploadAvatar({ file, userId })

    if (result.success) {
      setAvatar(result.url)
    } else {
      setError(result.error || 'Upload failed')
      setAvatar(currentAvatar) // Revert preview
    }

    setLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm('ลบรูปโปรไฟล์? / Delete avatar?')) return

    setLoading(true)
    const result = await deleteAvatar(userId)

    if (result.success) {
      setAvatar(null)
    } else {
      setError(result.error || 'Delete failed')
    }

    setLoading(false)
  }

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div className="relative">
        <Avatar className="h-24 w-24">
          <AvatarImage src={avatar || undefined} alt={name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-full">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90"
          disabled={loading}
        >
          <Camera className="h-4 w-4" />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {avatar && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={loading}
          className="text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          ลบรูป / Remove
        </Button>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <p className="text-xs text-muted-foreground text-center">
        JPEG, PNG, WebP • สูงสุด 2MB
      </p>
    </div>
  )
}
```

### File Drop Zone

```typescript
// components/upload/file-drop-zone.tsx
'use client'

import { useState, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Upload, File, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FileDropZoneProps {
  onUpload: (file: File) => Promise<void>
  accept?: string[]
  maxSize?: number // in bytes
  className?: string
}

export function FileDropZone({
  onUpload,
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  className
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File): string | null => {
    if (accept && !accept.includes(file.type)) {
      return 'Invalid file type'
    }
    if (file.size > maxSize) {
      return `File too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(0)}MB`
    }
    return null
  }, [accept, maxSize])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (!file) return

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setSelectedFile(file)
    setError(null)
  }, [validateFile])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setSelectedFile(file)
    setError(null)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setLoading(true)
    setError(null)

    try {
      await onUpload(selectedFile)
      setSelectedFile(null)
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        )}
      >
        <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Drag & drop or click to select
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept?.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {selectedFile && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <File className="h-8 w-8 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedFile(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {selectedFile && (
        <Button onClick={handleUpload} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              กำลังอัพโหลด... / Uploading...
            </>
          ) : (
            'อัพโหลด / Upload'
          )}
        </Button>
      )}
    </div>
  )
}
```

---

## Next.js API Route for Serving Files

```typescript
// app/api/uploads/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filepath = path.join(UPLOAD_DIR, ...params.path)

    // Security: Prevent directory traversal
    if (!filepath.startsWith(UPLOAD_DIR)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const file = await readFile(filepath)

    // Determine content type
    const ext = path.extname(filepath).toLowerCase()
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.csv': 'text/csv'
    }

    const contentType = contentTypes[ext] || 'application/octet-stream'

    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch (error) {
    return new NextResponse('Not Found', { status: 404 })
  }
}
```

---

## Prisma Schema for Documents

```prisma
model Document {
  id          Int      @id @default(autoincrement())
  name        String   @db.VarChar(255)
  filename    String   @db.VarChar(255)
  mimeType    String   @db.VarChar(100)
  size        Int
  entityType  String   @db.VarChar(50)
  entityId    Int
  description String?  @db.Text
  uploadedBy  Int
  uploader    User     @relation(fields: [uploadedBy], references: [id])

  createdAt   DateTime @default(now())

  @@index([entityType, entityId])
  @@map("documents")
}

// Add to User model
model User {
  // ... existing fields
  documents Document[]
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
