---
name: notification-scheduler
description: Scheduled notifications and reminders for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["notification scheduler", "reminder", "scheduled notification", "notification queue", "notification timing"]
  file_patterns: ["*notification-schedul*", "*reminder*", "lib/notifications/*"]
  context: scheduled notifications, reminders, notification queue, delayed notifications
mcp_servers:
  - sequential
personas:
  - backend
  - frontend
---

# Notification Scheduler

## Core Role

Manage scheduled notifications for HR-IMS:
- Reminder notifications
- Scheduled announcements
- Delayed notifications
- Recurring alerts

---

## Notification Schedule Service

```typescript
// lib/notifications/scheduler.ts
import prisma from '@/lib/prisma'
import { addDays, addHours, addMinutes, format } from 'date-fns'

export type NotificationScheduleType = 'once' | 'recurring'
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'cancelled'

interface ScheduleNotificationInput {
  userId: number | number[]  // Single user or multiple users
  type: string
  title: string
  message: string
  scheduledAt: Date
  data?: Record<string, any>
  channels?: ('in_app' | 'email' | 'sms')[]
  recurring?: {
    interval: 'daily' | 'weekly' | 'monthly'
    endDate?: Date
    maxOccurrences?: number
  }
}

interface ScheduledNotification {
  id: number
  userId: number
  type: string
  title: string
  message: string
  scheduledAt: Date
  status: NotificationStatus
  channels: string[]
  data: any
  recurring?: any
  occurrences: number
  lastSentAt?: Date
  createdAt: Date
}

// Create scheduled notification
export async function scheduleNotification(
  input: ScheduleNotificationInput
): Promise<ScheduledNotification[]> {
  const userIds = Array.isArray(input.userId) ? input.userId : [input.userId]
  const channels = input.channels || ['in_app']
  const results: ScheduledNotification[] = []

  for (const userId of userIds) {
    const notification = await prisma.scheduledNotification.create({
      data: {
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        scheduledAt: input.scheduledAt,
        status: 'pending',
        channels,
        data: input.data || {},
        recurring: input.recurring || null,
        occurrences: 0
      }
    })
    results.push(notification)
  }

  return results
}

// Cancel scheduled notification
export async function cancelScheduledNotification(notificationId: number): Promise<boolean> {
  const notification = await prisma.scheduledNotification.findUnique({
    where: { id: notificationId }
  })

  if (!notification || notification.status !== 'pending') {
    return false
  }

  await prisma.scheduledNotification.update({
    where: { id: notificationId },
    data: { status: 'cancelled' }
  })

  return true
}

// Reschedule notification
export async function rescheduleNotification(
  notificationId: number,
  newScheduledAt: Date
): Promise<ScheduledNotification | null> {
  const notification = await prisma.scheduledNotification.findUnique({
    where: { id: notificationId }
  })

  if (!notification || notification.status !== 'pending') {
    return null
  }

  return prisma.scheduledNotification.update({
    where: { id: notificationId },
    data: { scheduledAt: newScheduledAt }
  })
}

// Get pending notifications for user
export async function getPendingNotifications(userId: number): Promise<ScheduledNotification[]> {
  return prisma.scheduledNotification.findMany({
    where: {
      userId,
      status: 'pending',
      scheduledAt: { gte: new Date() }
    },
    orderBy: { scheduledAt: 'asc' }
  })
}

// Get due notifications (for cron job)
export async function getDueNotifications(): Promise<ScheduledNotification[]> {
  return prisma.scheduledNotification.findMany({
    where: {
      status: 'pending',
      scheduledAt: { lte: new Date() }
    },
    include: {
      user: {
        select: { email: true, name: true }
      }
    }
  })
}

// Mark notification as sent
export async function markNotificationSent(
  notificationId: number,
  recurring?: { nextScheduledAt?: Date }
): Promise<void> {
  if (recurring?.nextScheduledAt) {
    // Update for next occurrence
    await prisma.scheduledNotification.update({
      where: { id: notificationId },
      data: {
        occurrences: { increment: 1 },
        lastSentAt: new Date(),
        scheduledAt: recurring.nextScheduledAt
      }
    })
  } else {
    await prisma.scheduledNotification.update({
      where: { id: notificationId },
      data: {
        status: 'sent',
        lastSentAt: new Date()
      }
    })
  }
}

// Mark notification as failed
export async function markNotificationFailed(notificationId: number): Promise<void> {
  await prisma.scheduledNotification.update({
    where: { id: notificationId },
    data: { status: 'failed' }
  })
}

// Calculate next occurrence for recurring notifications
export function calculateNextOccurrence(
  currentScheduledAt: Date,
  interval: 'daily' | 'weekly' | 'monthly'
): Date {
  switch (interval) {
    case 'daily':
      return addDays(currentScheduledAt, 1)
    case 'weekly':
      return addDays(currentScheduledAt, 7)
    case 'monthly':
      return addDays(currentScheduledAt, 30) // Simplified
    default:
      return addDays(currentScheduledAt, 1)
  }
}
```

---

## Notification Reminder Helpers

```typescript
// lib/notifications/reminders.ts
import { scheduleNotification } from './scheduler'
import { addDays, addHours } from 'date-fns'

// Request approval reminder
export async function scheduleApprovalReminder(
  requestId: number,
  requesterId: number,
  approverIds: number[],
  requestTitle: string
) {
  // First reminder: 24 hours
  await scheduleNotification({
    userId: approverIds,
    type: 'approval_reminder',
    title: 'เตือนคำขอรออนุมัติ / Approval Reminder',
    message: `คำขอ "${requestTitle}" รอการอนุมัติมาแล้ว 24 ชั่วโมง`,
    scheduledAt: addHours(new Date(), 24),
    data: { requestId, requesterId },
    channels: ['in_app', 'email']
  })

  // Second reminder: 48 hours (escalation)
  await scheduleNotification({
    userId: approverIds,
    type: 'approval_escalation',
    title: 'เตือนคำขอเร่งด่วน / Urgent Approval Reminder',
    message: `คำขอ "${requestTitle}" รอการอนุมัติมาแล้ว 48 ชั่วโมง กรุณาพิจารณา`,
    scheduledAt: addHours(new Date(), 48),
    data: { requestId, requesterId, escalated: true },
    channels: ['in_app', 'email']
  })
}

// Low stock reminder
export async function scheduleLowStockReminder(
  itemId: number,
  itemName: string,
  currentStock: number,
  minStock: number,
  adminIds: number[]
) {
  await scheduleNotification({
    userId: adminIds,
    type: 'low_stock_reminder',
    title: 'เตือนสต็อกต่ำ / Low Stock Alert',
    message: `สินค้า "${itemName}" เหลือ ${currentStock} หน่วย (ต่ำกว่า ${minStock})`,
    scheduledAt: new Date(), // Immediate
    data: { itemId, currentStock, minStock },
    channels: ['in_app', 'email']
  })

  // Daily reminder if still low
  await scheduleNotification({
    userId: adminIds,
    type: 'low_stock_recurring',
    title: 'เตือนสต็อกต่ำ (ทวน) / Low Stock Reminder',
    message: `สินค้า "${itemName}" ยังคงมีสต็อกต่ำ`,
    scheduledAt: addDays(new Date(), 1),
    data: { itemId },
    channels: ['in_app'],
    recurring: {
      interval: 'daily',
      maxOccurrences: 7
    }
  })
}

// Return due reminder
export async function scheduleReturnDueReminder(
  requestId: number,
  userId: number,
  itemName: string,
  dueDate: Date
) {
  // 3 days before
  const threeDaysBefore = addDays(dueDate, -3)
  if (threeDaysBefore > new Date()) {
    await scheduleNotification({
      userId,
      type: 'return_due_soon',
      title: 'แจ้งเตือนครบกำหนดคืน / Return Due Soon',
      message: `ครบกำหนดคืน "${itemName}" ในอีก 3 วัน (${format(dueDate, 'dd/MM/yyyy')})`,
      scheduledAt: threeDaysBefore,
      data: { requestId, dueDate },
      channels: ['in_app', 'email']
    })
  }

  // 1 day before
  const oneDayBefore = addDays(dueDate, -1)
  if (oneDayBefore > new Date()) {
    await scheduleNotification({
      userId,
      type: 'return_due_tomorrow',
      title: 'แจ้งเตือนครบกำหนดคืนพรุ่งนี้ / Return Due Tomorrow',
      message: `ครบกำหนดคืน "${itemName}" พรุ่งนี้ (${format(dueDate, 'dd/MM/yyyy')})`,
      scheduledAt: oneDayBefore,
      data: { requestId, dueDate },
      channels: ['in_app', 'email']
    })
  }

  // On due date
  await scheduleNotification({
    userId,
    type: 'return_due_today',
    title: 'ครบกำหนดคืนวันนี้ / Return Due Today',
    message: `ครบกำหนดคืน "${itemName}" วันนี้ (${format(dueDate, 'dd/MM/yyyy')})`,
    scheduledAt: dueDate,
    data: { requestId, dueDate },
    channels: ['in_app', 'email']
  })
}

// Maintenance reminder
export async function scheduleMaintenanceReminder(
  ticketId: number,
  technicianId: number,
  equipmentName: string,
  scheduledDate: Date
) {
  // 1 day before
  const oneDayBefore = addDays(scheduledDate, -1)
  if (oneDayBefore > new Date()) {
    await scheduleNotification({
      userId: technicianId,
      type: 'maintenance_reminder',
      title: 'เตือนนัดบำรุง / Maintenance Reminder',
      message: `มีนัดบำรุง "${equipmentName}" พรุ่งนี้`,
      scheduledAt: oneDayBefore,
      data: { ticketId, scheduledDate },
      channels: ['in_app']
    })
  }

  // On the day
  await scheduleNotification({
    userId: technicianId,
    type: 'maintenance_today',
    title: 'นัดบำรุงวันนี้ / Maintenance Today',
    message: `มีนัดบำรุง "${equipmentName}" วันนี้`,
    scheduledAt: scheduledDate,
    data: { ticketId },
    channels: ['in_app']
  })
}

// Password expiry reminder
export async function schedulePasswordExpiryReminder(
  userId: number,
  daysUntilExpiry: number
) {
  await scheduleNotification({
    userId,
    type: 'password_expiry',
    title: 'รหัสผ่านใกล้หมดอายุ / Password Expiring Soon',
    message: `รหัสผ่านของคุณจะหมดอายุในอีก ${daysUntilExpiry} วัน`,
    scheduledAt: new Date(),
    data: { daysUntilExpiry },
    channels: ['in_app', 'email']
  })
}
```

---

## Notification Processor (Cron Job)

```typescript
// lib/cron/process-scheduled-notifications.ts
import { NextRequest } from 'next/server'
import { getDueNotifications, markNotificationSent, markNotificationFailed, calculateNextOccurrence } from '@/lib/notifications/scheduler'
import { sendEmail } from '@/lib/email/mailer'
import prisma from '@/lib/prisma'

export async function processScheduledNotifications() {
  console.log('Processing scheduled notifications...')

  const dueNotifications = await getDueNotifications()
  console.log(`Found ${dueNotifications.length} due notifications`)

  for (const notification of dueNotifications) {
    try {
      const channels = notification.channels as string[]

      // Send in-app notification
      if (channels.includes('in_app')) {
        await prisma.notification.create({
          data: {
            userId: notification.userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            read: false
          }
        })
      }

      // Send email
      if (channels.includes('email') && notification.user?.email) {
        await sendEmail({
          to: notification.user.email,
          subject: notification.title,
          html: `
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
          `
        })
      }

      // Handle recurring notifications
      if (notification.recurring) {
        const recurring = notification.recurring as any
        const shouldContinue = !recurring.maxOccurrences ||
          notification.occurrences < recurring.maxOccurrences
        const endDateReached = recurring.endDate &&
          new Date() >= new Date(recurring.endDate)

        if (shouldContinue && !endDateReached) {
          const nextScheduledAt = calculateNextOccurrence(
            notification.scheduledAt,
            recurring.interval
          )
          await markNotificationSent(notification.id, { nextScheduledAt })
        } else {
          await markNotificationSent(notification.id)
        }
      } else {
        await markNotificationSent(notification.id)
      }

      console.log(`Sent notification ${notification.id}`)
    } catch (error) {
      console.error(`Failed to send notification ${notification.id}:`, error)
      await markNotificationFailed(notification.id)
    }
  }

  return { processed: dueNotifications.length }
}

// API Route for cron job
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await processScheduledNotifications()
  return Response.json(result)
}
```

---

## Notification Schedule Manager Component

```typescript
// components/notifications/schedule-manager.tsx
'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarIcon, Clock, Trash2, Bell } from 'lucide-react'

interface ScheduledNotification {
  id: number
  type: string
  title: string
  message: string
  scheduledAt: Date
  status: string
  recurring?: any
}

export function NotificationScheduleManager() {
  const [notifications, setNotifications] = useState<ScheduledNotification[]>([])
  const [loading, setLoading] = useState(false)

  // New notification form
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    scheduledDate: new Date(),
    scheduledTime: '09:00',
    type: 'announcement'
  })

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notifications/scheduled')
      const data = await response.json()
      setNotifications(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const handleSchedule = async () => {
    const [hours, minutes] = newNotification.scheduledTime.split(':')
    const scheduledAt = new Date(newNotification.scheduledDate)
    scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0)

    await fetch('/api/notifications/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newNotification,
        scheduledAt
      })
    })

    fetchNotifications()
    setNewNotification({
      title: '',
      message: '',
      scheduledDate: new Date(),
      scheduledTime: '09:00',
      type: 'announcement'
    })
  }

  const handleCancel = async (id: number) => {
    await fetch(`/api/notifications/scheduled/${id}`, { method: 'DELETE' })
    fetchNotifications()
  }

  const typeLabels: Record<string, string> = {
    announcement: 'ประกาศ / Announcement',
    reminder: 'เตือน / Reminder',
    alert: 'แจ้งเตือน / Alert'
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: 'รอส่ง / Pending', color: 'bg-yellow-100 text-yellow-800' },
    sent: { label: 'ส่งแล้ว / Sent', color: 'bg-green-100 text-green-800' },
    failed: { label: 'ล้มเหลว / Failed', color: 'bg-red-100 text-red-800' },
    cancelled: { label: 'ยกเลิก / Cancelled', color: 'bg-gray-100 text-gray-800' }
  }

  return (
    <div className="space-y-6">
      {/* Create New Schedule */}
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5" />
          สร้างการแจ้งเตือนตามกำหนด / Create Scheduled Notification
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">ประเภท / Type</label>
            <Select
              value={newNotification.type}
              onValueChange={(v) => setNewNotification(prev => ({ ...prev, type: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">หัวข้อ / Title</label>
            <Input
              value={newNotification.title}
              onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
              placeholder="หัวข้อการแจ้งเตือน"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">ข้อความ / Message</label>
          <Input
            value={newNotification.message}
            onChange={(e) => setNewNotification(prev => ({ ...prev, message: e.target.value }))}
            placeholder="รายละเอียดการแจ้งเตือน"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">วันที่ / Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(newNotification.scheduledDate, 'dd/MM/yyyy', { locale: th })}
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <Calendar
                  mode="single"
                  selected={newNotification.scheduledDate}
                  onSelect={(date) => date && setNewNotification(prev => ({ ...prev, scheduledDate: date }))}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-sm font-medium">เวลา / Time</label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                type="time"
                value={newNotification.scheduledTime}
                onChange={(e) => setNewNotification(prev => ({ ...prev, scheduledTime: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <Button onClick={handleSchedule} disabled={!newNotification.title || !newNotification.message}>
          กำหนดเวลาส่ง / Schedule
        </Button>
      </div>

      {/* Scheduled Notifications List */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted p-3 font-semibold">
          การแจ้งเตือนที่กำหนดเวลาไว้ / Scheduled Notifications
        </div>

        {loading ? (
          <div className="p-4 text-center text-muted-foreground">กำลังโหลด...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            ไม่มีการแจ้งเตือนที่กำหนดเวลาไว้
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div key={notification.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{notification.title}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${statusLabels[notification.status]?.color}`}>
                      {statusLabels[notification.status]?.label || notification.status}
                    </span>
                    {notification.recurring && (
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                        ซ้ำ / Recurring
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(notification.scheduledAt), 'dd/MM/yyyy HH:mm', { locale: th })}
                  </p>
                </div>

                {notification.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancel(notification.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## Usage Examples

```typescript
// Example 1: Schedule approval reminder
await scheduleApprovalReminder(
  requestId,
  requesterId,
  [approverId1, approverId2],
  'สินค้าสำนักงาน / Office Supplies'
)

// Example 2: Schedule low stock alert with recurring reminder
await scheduleLowStockReminder(
  itemId,
  'กระดาษ A4 / A4 Paper',
  5,
  20,
  [adminId1, adminId2]
)

// Example 3: Schedule return due reminder
await scheduleReturnDueReminder(
  requestId,
  userId,
  'โน้ตบุ๊ก / Notebook',
  new Date('2024-02-15')
)

// Example 4: Custom scheduled notification
await scheduleNotification({
  userId: [1, 2, 3],
  type: 'system_maintenance',
  title: 'แจ้งปิดระบบ / System Maintenance',
  message: 'ระบบจะปิดบำรุงในวันอาทิตย์ 10:00-12:00',
  scheduledAt: addDays(new Date(), 2),
  channels: ['in_app', 'email'],
  recurring: {
    interval: 'daily',
    maxOccurrences: 3
  }
})
```

---

*Version: 1.0.0 | For HR-IMS Project*
