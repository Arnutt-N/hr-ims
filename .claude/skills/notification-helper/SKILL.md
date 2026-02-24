---
name: notification-helper
description: In-app notification system with real-time updates and email integration
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["notification", "notify", "alert", "email", "message"]
  file_patterns: ["*notification*", "lib/actions/notifications.ts"]
  context: communication, alerts, email
mcp_servers:
  - sequential
personas:
  - backend
  - frontend
---

# Notification Helper

## Core Role

Manage HR-IMS notification system:
- In-app notifications
- Email notifications (SMTP)
- Real-time updates
- Notification preferences

---

## Data Model

```prisma
model Notification {
  id          Int               @id @default(autoincrement())
  userId      Int
  type        NotificationType
  title       String            @db.VarChar(255)
  message     String            @db.Text
  link        String?           @db.VarChar(500)
  isRead      Boolean           @default(false)
  readAt      DateTime?

  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt   DateTime          @default(now())

  @@index([userId, isRead])
  @@index([userId, createdAt])
  @@map("notifications")
}

model NotificationPreference {
  id              Int     @id @default(autoincrement())
  userId          Int     @unique
  emailEnabled    Boolean @default(true)
  inAppEnabled    Boolean @default(true)

  // Notification type preferences
  requestPending  Boolean @default(true)
  requestApproved Boolean @default(true)
  requestRejected Boolean @default(true)
  lowStock        Boolean @default(true)
  systemAlerts    Boolean @default(true)

  user            User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notification_preferences")
}

enum NotificationType {
  REQUEST_PENDING
  REQUEST_APPROVED
  REQUEST_REJECTED
  REQUEST_COMPLETED
  LOW_STOCK
  TRANSFER_PENDING
  TRANSFER_COMPLETED
  SYSTEM_ALERT
  MAINTENANCE_DUE
}
```

---

## Server Actions

### Create Notification

```typescript
// lib/actions/notifications.ts
'use server'

import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

interface CreateNotificationInput {
  userId: number
  type: NotificationType
  title: string
  message: string
  link?: string
  sendEmail?: boolean
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    // Get user preferences
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId: input.userId }
    })

    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link
      }
    })

    // Send email if enabled
    if (input.sendEmail !== false && preferences?.emailEnabled !== false) {
      const user = await prisma.user.findUnique({
        where: { id: input.userId }
      })

      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: input.title,
          html: `
            <h2>${input.title}</h2>
            <p>${input.message}</p>
            ${input.link ? `<a href="${process.env.NEXTAUTH_URL}${input.link}">View Details</a>` : ''}
          `
        })
      }
    }

    return { success: true, data: notification }

  } catch (error) {
    console.error('Create notification error:', error)
    return { error: 'Failed to create notification', code: 'INTERNAL_ERROR' }
  }
}
```

### Batch Notifications

```typescript
export async function createBatchNotifications(
  userIds: number[],
  input: Omit<CreateNotificationInput, 'userId'>
) {
  try {
    const notifications = await prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link
      }))
    })

    // Send emails to all users
    if (input.sendEmail !== false) {
      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds },
          notificationPreference: { emailEnabled: true }
        }
      })

      await Promise.all(users.map(user =>
        sendEmail({
          to: user.email,
          subject: input.title,
          html: `
            <h2>${input.title}</h2>
            <p>${input.message}</p>
            ${input.link ? `<a href="${process.env.NEXTAUTH_URL}${input.link}">View Details</a>` : ''}
          `
        }).catch(console.error)
      ))
    }

    return { success: true, data: notifications }

  } catch (error) {
    console.error('Batch notification error:', error)
    return { error: 'Failed to create notifications', code: 'INTERNAL_ERROR' }
  }
}
```

### Get Notifications

```typescript
export async function getNotifications(options?: {
  unreadOnly?: boolean
  limit?: number
  offset?: number
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const limit = options?.limit ?? 20
  const offset = options?.offset ?? 0

  const notifications = await prisma.notification.findMany({
    where: {
      userId: parseInt(session.user.id),
      ...(options?.unreadOnly && { isRead: false })
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset
  })

  const unreadCount = await prisma.notification.count({
    where: {
      userId: parseInt(session.user.id),
      isRead: false
    }
  })

  return {
    success: true,
    data: {
      notifications,
      unreadCount,
      hasMore: notifications.length === limit
    }
  }
}
```

### Mark as Read

```typescript
export async function markNotificationRead(notificationId: number) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  try {
    const notification = await prisma.notification.update({
      where: {
        id: notificationId,
        userId: parseInt(session.user.id)
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    return { success: true, data: notification }

  } catch (error) {
    return { error: 'Notification not found', code: 'NOT_FOUND' }
  }
}

export async function markAllAsRead() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  await prisma.notification.updateMany({
    where: {
      userId: parseInt(session.user.id),
      isRead: false
    },
    data: {
      isRead: true,
      readAt: new Date()
    }
  })

  revalidatePath('/dashboard')
  return { success: true }
}
```

---

## Email Integration

```typescript
// lib/email.ts
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

interface SendEmailInput {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(input: SendEmailInput) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text
    })
    return { success: true }
  } catch (error) {
    console.error('Send email error:', error)
    return { error: 'Failed to send email' }
  }
}

// Email templates
export const emailTemplates = {
  requestPending: (requestId: number, requesterName: string) => ({
    subject: 'New Request Pending Approval',
    html: `
      <h2>New Request Pending</h2>
      <p>${requesterName} has submitted a new request.</p>
      <a href="${process.env.NEXTAUTH_URL}/requests/${requestId}">Review Request</a>
    `
  }),

  requestApproved: (requestId: number) => ({
    subject: 'Your Request Has Been Approved',
    html: `
      <h2>Request Approved</h2>
      <p>Your request #${requestId} has been approved.</p>
      <a href="${process.env.NEXTAUTH_URL}/requests/${requestId}">View Request</a>
    `
  }),

  lowStock: (itemName: string, quantity: number, warehouse: string) => ({
    subject: `Low Stock Alert: ${itemName}`,
    html: `
      <h2>Low Stock Alert</h2>
      <p><strong>${itemName}</strong> is running low in ${warehouse}.</p>
      <p>Current quantity: ${quantity}</p>
      <a href="${process.env.NEXTAUTH_URL}/inventory">View Inventory</a>
    `
  })
}
```

---

## Notification Triggers

```typescript
// Automatic notifications for common events

// When request is created
await createBatchNotifications(
  approverUserIds,
  {
    type: 'REQUEST_PENDING',
    title: 'New Request Pending',
    message: `New ${request.type.toLowerCase()} request from ${requester.name}`,
    link: `/requests/${request.id}`
  }
)

// When request is approved
await createNotification({
  userId: request.requesterId,
  type: 'REQUEST_APPROVED',
  title: 'Request Approved',
  message: `Your request #${request.id} has been approved`,
  link: `/requests/${request.id}`
})

// When stock is low
if (stockLevel.quantity <= stockLevel.minQuantity) {
  const admins = await prisma.user.findMany({
    where: {
      userRoles: {
        some: { role: { slug: { in: ['admin', 'superadmin'] } } }
      }
    }
  })

  await createBatchNotifications(
    admins.map(a => a.id),
    {
      type: 'LOW_STOCK',
      title: 'Low Stock Alert',
      message: `${item.name} is running low (${stockLevel.quantity} remaining)`,
      link: `/inventory/${item.id}`
    }
  )
}
```

---

## Frontend Integration

```typescript
// hooks/use-notifications.ts
'use client'

import { useEffect, useState } from 'react'

interface Notification {
  id: number
  type: string
  title: string
  message: string
  link?: string
  isRead: boolean
  createdAt: string
}

export function useNotifications(pollInterval: number = 30000) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = async () => {
    const res = await fetch('/api/notifications')
    if (res.ok) {
      const data = await res.json()
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, pollInterval)
    return () => clearInterval(interval)
  }, [pollInterval])

  return { notifications, unreadCount, refresh: fetchNotifications }
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
