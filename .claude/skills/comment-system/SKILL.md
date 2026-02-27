---
name: comment-system
description: Comments and notes system for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["comment", "note", "discussion", "reply", "mention"]
  file_patterns: ["*comment*", "*note*", "lib/comment*"]
  context: comments, notes, discussions, mentions, replies
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# Comment System

## Core Role

Implement comments and notes for HR-IMS:
- Comments on items and requests
- @mentions
- Replies and threads
- Comment notifications

---

## Comment Service

```typescript
// lib/comment/service.ts
import prisma from '@/lib/prisma'

export type CommentEntityType = 'item' | 'request' | 'warehouse' | 'user'

export interface Comment {
  id: number
  content: string
  userId: number
  userName: string
  userAvatar?: string
  entityType: CommentEntityType
  entityId: number
  parentId: number | null
  mentions: number[]
  createdAt: Date
  updatedAt: Date
  replies?: Comment[]
}

// Create comment
export async function createComment(data: {
  content: string
  userId: number
  entityType: CommentEntityType
  entityId: number
  parentId?: number
  mentions?: number[]
}): Promise<Comment> {
  // Extract mentions from content (@username)
  const mentionRegex = /@(\w+)/g
  const mentions = data.mentions || []

  const comment = await prisma.comment.create({
    data: {
      content: data.content,
      userId: data.userId,
      entityType: data.entityType,
      entityId: data.entityId,
      parentId: data.parentId || null,
      mentions
    },
    include: {
      user: {
        select: { id: true, name: true, avatar: true }
      }
    }
  })

  return {
    id: comment.id,
    content: comment.content,
    userId: comment.userId,
    userName: comment.user.name,
    userAvatar: comment.user.avatar || undefined,
    entityType: comment.entityType as CommentEntityType,
    entityId: comment.entityId,
    parentId: comment.parentId,
    mentions: comment.mentions as number[],
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt
  }
}

// Update comment
export async function updateComment(
  id: number,
  userId: number,
  content: string
): Promise<Comment | null> {
  const comment = await prisma.comment.findUnique({
    where: { id }
  })

  if (!comment || comment.userId !== userId) {
    return null
  }

  const updated = await prisma.comment.update({
    where: { id },
    data: {
      content,
      updatedAt: new Date()
    },
    include: {
      user: {
        select: { id: true, name: true, avatar: true }
      }
    }
  })

  return {
    id: updated.id,
    content: updated.content,
    userId: updated.userId,
    userName: updated.user.name,
    userAvatar: updated.user.avatar || undefined,
    entityType: updated.entityType as CommentEntityType,
    entityId: updated.entityId,
    parentId: updated.parentId,
    mentions: updated.mentions as number[],
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt
  }
}

// Delete comment
export async function deleteComment(id: number, userId: number): Promise<boolean> {
  const comment = await prisma.comment.findUnique({
    where: { id }
  })

  if (!comment || comment.userId !== userId) {
    return false
  }

  // Delete replies first
  await prisma.comment.deleteMany({
    where: { parentId: id }
  })

  await prisma.comment.delete({
    where: { id }
  })

  return true
}

// Get comments for entity
export async function getComments(
  entityType: CommentEntityType,
  entityId: number,
  options: { includeReplies?: boolean; limit?: number } = {}
): Promise<Comment[]> {
  const comments = await prisma.comment.findMany({
    where: {
      entityType,
      entityId,
      parentId: null // Only top-level comments
    },
    include: {
      user: {
        select: { id: true, name: true, avatar: true }
      },
      replies: options.includeReplies ? {
        include: {
          user: {
            select: { id: true, name: true, avatar: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      } : false
    },
    orderBy: { createdAt: 'desc' },
    take: options.limit
  })

  return comments.map(c => ({
    id: c.id,
    content: c.content,
    userId: c.userId,
    userName: c.user.name,
    userAvatar: c.user.avatar || undefined,
    entityType: c.entityType as CommentEntityType,
    entityId: c.entityId,
    parentId: c.parentId,
    mentions: c.mentions as number[],
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    replies: c.replies ? (c.replies as any[]).map(r => ({
      id: r.id,
      content: r.content,
      userId: r.userId,
      userName: r.user.name,
      userAvatar: r.user.avatar || undefined,
      entityType: r.entityType as CommentEntityType,
      entityId: r.entityId,
      parentId: r.parentId,
      mentions: r.mentions as number[],
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    })) : undefined
  }))
}

// Get comment count
export async function getCommentCount(
  entityType: CommentEntityType,
  entityId: number
): Promise<number> {
  return prisma.comment.count({
    where: { entityType, entityId }
  })
}

// Search users for mentions
export async function searchUsersForMention(
  query: string,
  limit: number = 5
): Promise<Array<{ id: number; name: string; email: string }>> {
  return prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: query } },
        { email: { contains: query } }
      ],
      status: 'ACTIVE'
    },
    select: {
      id: true,
      name: true,
      email: true
    },
    take: limit
  })
}
```

---

## Comment Component

```typescript
// components/comment/comment-section.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { formatRelativeTime } from '@/lib/i18n/format'
import { useI18n } from '@/hooks/use-i18n'
import { Comment, getComments, createComment, deleteComment } from '@/lib/comment/service'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Send, Trash2, Edit, Reply, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface CommentSectionProps {
  entityType: 'item' | 'request' | 'warehouse' | 'user'
  entityId: number
  currentUserId: number
}

export function CommentSection({
  entityType,
  entityId,
  currentUserId
}: CommentSectionProps) {
  const { locale } = useI18n()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const fetchComments = async () => {
    setLoading(true)
    const data = await getComments(entityType, entityId, { includeReplies: true })
    setComments(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchComments()
  }, [entityType, entityId])

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return

    setSubmitting(true)
    try {
      await createComment({
        content: newComment,
        userId: currentUserId,
        entityType,
        entityId,
        parentId: replyTo || undefined
      })

      setNewComment('')
      setReplyTo(null)
      await fetchComments()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(locale === 'th' ? 'ยืนยันการลบความคิดเห็น?' : 'Delete this comment?')) return

    await deleteComment(id, currentUserId)
    await fetchComments()
  }

  const handleReply = (commentId: number, userName: string) => {
    setReplyTo(commentId)
    setNewComment(`@${userName} `)
    textareaRef.current?.focus()
  }

  const renderComment = (comment: Comment, isReply = false) => (
    <div
      key={comment.id}
      className={`flex gap-3 ${isReply ? 'ml-10 mt-3' : 'mb-4'}`}
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={comment.userAvatar} />
        <AvatarFallback>
          {comment.userName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{comment.userName}</span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(comment.createdAt, locale)}
          </span>
          {comment.updatedAt > comment.createdAt && (
            <span className="text-xs text-muted-foreground">
              ({locale === 'th' ? 'แก้ไขแล้ว' : 'edited'})
            </span>
          )}
        </div>

        <p className="text-sm whitespace-pre-wrap">{comment.content}</p>

        <div className="flex items-center gap-2 mt-2">
          {!isReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => handleReply(comment.id, comment.userName)}
            >
              <Reply className="h-3 w-3 mr-1" />
              {locale === 'th' ? 'ตอบ' : 'Reply'}
            </Button>
          )}

          {comment.userId === currentUserId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleDelete(comment.id)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {locale === 'th' ? 'ลบ' : 'Delete'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3">
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {locale === 'th' ? 'ความคิดเห็น' : 'Comments'}
          <span className="text-muted-foreground text-sm">
            ({comments.length})
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* New comment form */}
        <div className="flex gap-3">
          <Textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={
              replyTo
                ? locale === 'th' ? 'เขียนการตอบกลับ...' : 'Write a reply...'
                : locale === 'th' ? 'เขียนความคิดเห็น...' : 'Write a comment...'
            }
            className="min-h-[80px]"
          />
        </div>

        <div className="flex justify-between items-center">
          {replyTo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setReplyTo(null)
                setNewComment('')
              }}
            >
              {locale === 'th' ? 'ยกเลิกการตอบ' : 'Cancel reply'}
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || submitting}
            className="ml-auto"
          >
            <Send className="h-4 w-4 mr-2" />
            {submitting
              ? locale === 'th' ? 'กำลังส่ง...' : 'Sending...'
              : locale === 'th' ? 'ส่ง' : 'Send'}
          </Button>
        </div>

        {/* Comments list */}
        <div className="divide-y">
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">
              {locale === 'th' ? 'กำลังโหลด...' : 'Loading...'}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {locale === 'th' ? 'ยังไม่มีความคิดเห็น' : 'No comments yet'}
            </div>
          ) : (
            comments.map(comment => renderComment(comment))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Mention Input Component

```typescript
// components/comment/mention-input.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { searchUsersForMention } from '@/lib/comment/service'

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function MentionInput({
  value,
  onChange,
  placeholder,
  className
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<Array<{
    id: number
    name: string
    email: string
  }>>([])
  const [mentionStart, setMentionStart] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const handleInput = async () => {
      const cursorPos = textareaRef.current?.selectionStart || 0
      const textBeforeCursor = value.substring(0, cursorPos)
      const lastAtIndex = textBeforeCursor.lastIndexOf('@')

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)

        // Check if there's a space after @ (meaning mention is complete)
        if (!textAfterAt.includes(' ')) {
          setMentionStart(lastAtIndex)
          const users = await searchUsersForMention(textAfterAt)
          setSuggestions(users)
          setShowSuggestions(users.length > 0)
          return
        }
      }

      setShowSuggestions(false)
      setMentionStart(null)
    }

    handleInput()
  }, [value])

  const selectMention = (user: { id: number; name: string }) => {
    if (mentionStart === null) return

    const cursorPos = textareaRef.current?.selectionStart || 0
    const beforeMention = value.substring(0, mentionStart)
    const afterCursor = value.substring(cursorPos)

    const newValue = `${beforeMention}@${user.name} ${afterCursor}`
    onChange(newValue)
    setShowSuggestions(false)

    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus()
      const newCursorPos = beforeMention.length + user.name.length + 2
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
      />

      {showSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-40 overflow-auto">
          {suggestions.map((user) => (
            <button
              key={user.id}
              className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2"
              onClick={() => selectMention(user)}
            >
              <span className="font-medium">{user.name}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## Comment API Routes

```typescript
// app/api/comments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getComments, createComment } from '@/lib/comment/service'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const entityType = searchParams.get('entityType') as any
  const entityId = parseInt(searchParams.get('entityId')!)

  const comments = await getComments(entityType, entityId, { includeReplies: true })
  return NextResponse.json({ comments })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const comment = await createComment({
    content: body.content,
    userId: parseInt(session.user.id),
    entityType: body.entityType,
    entityId: body.entityId,
    parentId: body.parentId,
    mentions: body.mentions
  })

  return NextResponse.json({ comment })
}

// app/api/comments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { updateComment, deleteComment } from '@/lib/comment/service'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const comment = await updateComment(
    parseInt(params.id),
    parseInt(session.user.id),
    body.content
  )

  if (!comment) {
    return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
  }

  return NextResponse.json({ comment })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const success = await deleteComment(
    parseInt(params.id),
    parseInt(session.user.id)
  )

  if (!success) {
    return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
```

---

## Usage Examples

```tsx
// Example 1: Comment section on item detail
import { CommentSection } from '@/components/comment/comment-section'

function ItemDetail({ item, session }) {
  return (
    <div>
      <h1>{item.name}</h1>
      {/* Item details... */}

      <CommentSection
        entityType="item"
        entityId={item.id}
        currentUserId={parseInt(session.user.id)}
      />
    </div>
  )
}

// Example 2: Comment section on request
import { CommentSection } from '@/components/comment/comment-section'

function RequestDetail({ request, session }) {
  return (
    <div>
      <h1>Request #{request.id}</h1>

      <CommentSection
        entityType="request"
        entityId={request.id}
        currentUserId={parseInt(session.user.id)}
      />
    </div>
  )
}

// Example 3: Using mention input
import { MentionInput } from '@/components/comment/mention-input'

function CommentForm() {
  const [content, setContent] = useState('')

  return (
    <MentionInput
      value={content}
      onChange={setContent}
      placeholder="Type @ to mention someone..."
    />
  )
}

// Example 4: Get comment count
import { getCommentCount } from '@/lib/comment/service'

async function ItemCard({ item }) {
  const commentCount = await getCommentCount('item', item.id)

  return (
    <div>
      <h3>{item.name}</h3>
      <span>{commentCount} comments</span>
    </div>
  )
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
