---
name: activity-feed
description: Activity feed and timeline for tracking user actions in HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["activity feed", "timeline", "activity log", "recent activity", "user activity"]
  file_patterns: ["*activity*", "*timeline*", "*feed*", "lib/activity*"]
  context: activity feed, timeline, recent activity, user actions, notifications
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# Activity Feed

## Core Role

Track and display user activities for HR-IMS:
- Activity timeline
- Recent actions
- User activity logs
- Activity notifications

---

## Activity Service

```typescript
// lib/activity/service.ts
import prisma from '@/lib/prisma'

export type ActivityType =
  | 'item.created'
  | 'item.updated'
  | 'item.deleted'
  | 'item.viewed'
  | 'request.created'
  | 'request.approved'
  | 'request.rejected'
  | 'request.completed'
  | 'user.login'
  | 'user.logout'
  | 'user.profile_updated'
  | 'warehouse.stock_updated'
  | 'warehouse.transfer'
  | 'comment.added'
  | 'file.uploaded'
  | 'report.generated'
  | 'settings.changed'

export interface Activity {
  id: number
  type: ActivityType
  userId: number
  userName: string
  entityType: string
  entityId: number
  description: string
  descriptionEn: string
  metadata?: Record<string, any>
  createdAt: Date
}

// Create activity
export async function createActivity(data: {
  type: ActivityType
  userId: number
  entityType: string
  entityId: number
  description: string
  descriptionEn: string
  metadata?: Record<string, any>
}): Promise<Activity> {
  const activity = await prisma.activity.create({
    data: {
      type: data.type,
      userId: data.userId,
      entityType: data.entityType,
      entityId: data.entityId,
      description: data.description,
      descriptionEn: data.descriptionEn,
      metadata: data.metadata || {}
    },
    include: {
      user: {
        select: { name: true }
      }
    }
  })

  return {
    id: activity.id,
    type: activity.type as ActivityType,
    userId: activity.userId,
    userName: activity.user.name,
    entityType: activity.entityType,
    entityId: activity.entityId,
    description: activity.description,
    descriptionEn: activity.descriptionEn,
    metadata: activity.metadata as Record<string, any>,
    createdAt: activity.createdAt
  }
}

// Get activities with filters
export async function getActivities(options: {
  userId?: number
  type?: ActivityType[]
  entityType?: string
  entityId?: number
  limit?: number
  offset?: number
}): Promise<{ activities: Activity[]; total: number }> {
  const { userId, type, entityType, entityId, limit = 20, offset = 0 } = options

  const where: any = {}

  if (userId) where.userId = userId
  if (type && type.length > 0) where.type = { in: type }
  if (entityType) where.entityType = entityType
  if (entityId) where.entityId = entityId

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    }),
    prisma.activity.count({ where })
  ])

  return {
    activities: activities.map(a => ({
      id: a.id,
      type: a.type as ActivityType,
      userId: a.userId,
      userName: a.user.name,
      entityType: a.entityType,
      entityId: a.entityId,
      description: a.description,
      descriptionEn: a.descriptionEn,
      metadata: a.metadata as Record<string, any>,
      createdAt: a.createdAt
    })),
    total
  }
}

// Get recent activities (global feed)
export async function getRecentActivities(limit: number = 20): Promise<Activity[]> {
  const result = await getActivities({ limit })
  return result.activities
}

// Get user activities
export async function getUserActivities(
  userId: number,
  limit: number = 20
): Promise<Activity[]> {
  const result = await getActivities({ userId, limit })
  return result.activities
}

// Get entity activities
export async function getEntityActivities(
  entityType: string,
  entityId: number,
  limit: number = 20
): Promise<Activity[]> {
  const result = await getActivities({ entityType, entityId, limit })
  return result.activities
}

// Get activities by type
export async function getActivitiesByType(
  type: ActivityType[],
  limit: number = 20
): Promise<Activity[]> {
  const result = await getActivities({ type, limit })
  return result.activities
}

// Delete old activities (cleanup)
export async function deleteOldActivities(olderThanDays: number = 90): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

  const result = await prisma.activity.deleteMany({
    where: {
      createdAt: { lt: cutoffDate }
    }
  })

  return result.count
}
```

---

## Activity Helpers

```typescript
// lib/activity/helpers.ts
import { createActivity, ActivityType } from './service'

// Item activities
export const itemActivities = {
  created: (userId: number, itemId: number, itemName: string) =>
    createActivity({
      type: 'item.created',
      userId,
      entityType: 'item',
      entityId: itemId,
      description: `สร้างสินค้า "${itemName}"`,
      descriptionEn: `Created item "${itemName}"`,
      metadata: { itemName }
    }),

  updated: (userId: number, itemId: number, itemName: string, fields: string[]) =>
    createActivity({
      type: 'item.updated',
      userId,
      entityType: 'item',
      entityId: itemId,
      description: `อัปเดตสินค้า "${itemName}" (${fields.join(', ')})`,
      descriptionEn: `Updated item "${itemName}" (${fields.join(', ')})`,
      metadata: { itemName, fields }
    }),

  deleted: (userId: number, itemId: number, itemName: string) =>
    createActivity({
      type: 'item.deleted',
      userId,
      entityType: 'item',
      entityId: itemId,
      description: `ลบสินค้า "${itemName}"`,
      descriptionEn: `Deleted item "${itemName}"`,
      metadata: { itemName }
    }),

  viewed: (userId: number, itemId: number, itemName: string) =>
    createActivity({
      type: 'item.viewed',
      userId,
      entityType: 'item',
      entityId: itemId,
      description: `ดูสินค้า "${itemName}"`,
      descriptionEn: `Viewed item "${itemName}"`,
      metadata: { itemName }
    })
}

// Request activities
export const requestActivities = {
  created: (userId: number, requestId: number, requestType: string) =>
    createActivity({
      type: 'request.created',
      userId,
      entityType: 'request',
      entityId: requestId,
      description: `สร้างคำขอ${requestType} #${requestId}`,
      descriptionEn: `Created ${requestType} request #${requestId}`,
      metadata: { requestType }
    }),

  approved: (userId: number, requestId: number) =>
    createActivity({
      type: 'request.approved',
      userId,
      entityType: 'request',
      entityId: requestId,
      description: `อนุมัติคำขอ #${requestId}`,
      descriptionEn: `Approved request #${requestId}`,
      metadata: {}
    }),

  rejected: (userId: number, requestId: number, reason?: string) =>
    createActivity({
      type: 'request.rejected',
      userId,
      entityType: 'request',
      entityId: requestId,
      description: `ปฏิเสธคำขอ #${requestId}${reason ? `: ${reason}` : ''}`,
      descriptionEn: `Rejected request #${requestId}${reason ? `: ${reason}` : ''}`,
      metadata: { reason }
    }),

  completed: (userId: number, requestId: number) =>
    createActivity({
      type: 'request.completed',
      userId,
      entityType: 'request',
      entityId: requestId,
      description: `เสร็จสิ้นคำขอ #${requestId}`,
      descriptionEn: `Completed request #${requestId}`,
      metadata: {}
    })
}

// User activities
export const userActivities = {
  login: (userId: number, userName: string, ipAddress?: string) =>
    createActivity({
      type: 'user.login',
      userId,
      entityType: 'user',
      entityId: userId,
      description: `${userName} เข้าสู่ระบบ`,
      descriptionEn: `${userName} logged in`,
      metadata: { ipAddress }
    }),

  logout: (userId: number, userName: string) =>
    createActivity({
      type: 'user.logout',
      userId,
      entityType: 'user',
      entityId: userId,
      description: `${userName} ออกจากระบบ`,
      descriptionEn: `${userName} logged out`,
      metadata: {}
    }),

  profileUpdated: (userId: number, userName: string, fields: string[]) =>
    createActivity({
      type: 'user.profile_updated',
      userId,
      entityType: 'user',
      entityId: userId,
      description: `${userName} อัปเดตโปรไฟล์`,
      descriptionEn: `${userName} updated profile`,
      metadata: { fields }
    })
}

// Warehouse activities
export const warehouseActivities = {
  stockUpdated: (
    userId: number,
    warehouseId: number,
    warehouseName: string,
    itemId: number,
    itemName: string,
    quantity: number,
    operation: 'add' | 'subtract'
  ) =>
    createActivity({
      type: 'warehouse.stock_updated',
      userId,
      entityType: 'warehouse',
      entityId: warehouseId,
      description: `${operation === 'add' ? 'เพิ่ม' : 'ลด'}สต็อก "${itemName}" ใน${warehouseName} ${Math.abs(quantity)} หน่วย`,
      descriptionEn: `${operation === 'add' ? 'Added' : 'Subtracted'} ${Math.abs(quantity)} "${itemName}" in ${warehouseName}`,
      metadata: { itemId, itemName, quantity, operation }
    }),

  transfer: (
    userId: number,
    fromWarehouseId: number,
    toWarehouseId: number,
    itemId: number,
    itemName: string,
    quantity: number
  ) =>
    createActivity({
      type: 'warehouse.transfer',
      userId,
      entityType: 'warehouse',
      entityId: toWarehouseId,
      description: `โอน "${itemName}" ${quantity} หน่วยไปยังคลังอื่น`,
      descriptionEn: `Transferred ${quantity} "${itemName}" to another warehouse`,
      metadata: { fromWarehouseId, toWarehouseId, itemId, itemName, quantity }
    })
}

// Comment activity
export const commentActivities = {
  added: (
    userId: number,
    userName: string,
    entityType: string,
    entityId: number,
    commentPreview: string
  ) =>
    createActivity({
      type: 'comment.added',
      userId,
      entityType,
      entityId,
      description: `${userName} แสดงความคิดเห็น: "${commentPreview}"`,
      descriptionEn: `${userName} commented: "${commentPreview}"`,
      metadata: { commentPreview }
    })
}
```

---

## Activity Feed Component

```typescript
// components/activity/activity-feed.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatRelativeTime } from '@/lib/i18n/format'
import { useI18n } from '@/hooks/use-i18n'
import { Activity, getRecentActivities, getActivities } from '@/lib/activity/service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  FileText,
  User,
  Warehouse,
  MessageSquare,
  Settings,
  LogIn,
  LogOut,
  RefreshCw,
  MoreHorizontal
} from 'lucide-react'

interface ActivityFeedProps {
  userId?: number
  entityType?: string
  entityId?: number
  limit?: number
  showTitle?: boolean
}

export function ActivityFeed({
  userId,
  entityType,
  entityId,
  limit = 20,
  showTitle = true
}: ActivityFeedProps) {
  const { locale, t } = useI18n()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const fetchActivities = useCallback(async (newOffset = 0) => {
    setLoading(true)
    try {
      const result = await getActivities({
        userId,
        entityType,
        entityId,
        limit,
        offset: newOffset
      })

      if (newOffset === 0) {
        setActivities(result.activities)
      } else {
        setActivities(prev => [...prev, ...result.activities])
      }

      setHasMore(result.activities.length === limit)
      setOffset(newOffset)
    } finally {
      setLoading(false)
    }
  }, [userId, entityType, entityId, limit])

  useEffect(() => {
    fetchActivities(0)
  }, [fetchActivities])

  const loadMore = () => {
    fetchActivities(offset + limit)
  }

  const refresh = () => {
    fetchActivities(0)
  }

  // Get icon for activity type
  const getActivityIcon = (type: string) => {
    if (type.startsWith('item.')) return Package
    if (type.startsWith('request.')) return FileText
    if (type.startsWith('user.')) return User
    if (type.startsWith('warehouse.')) return Warehouse
    if (type.startsWith('comment.')) return MessageSquare
    if (type.startsWith('settings.')) return Settings
    if (type === 'user.login') return LogIn
    if (type === 'user.logout') return LogOut
    return Package
  }

  // Get color for activity type
  const getActivityColor = (type: string): string => {
    if (type.includes('created') || type.includes('approved')) return 'text-green-500'
    if (type.includes('deleted') || type.includes('rejected')) return 'text-red-500'
    if (type.includes('updated') || type.includes('transfer')) return 'text-blue-500'
    return 'text-gray-500'
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {t('activity.title') || 'กิจกรรมล่าสุด / Recent Activity'}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
      )}

      <CardContent className={showTitle ? 'pt-2' : 'pt-4'}>
        {loading && activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('common.loading')}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('common.noData') || 'ไม่มีกิจกรรม / No activity'}
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.type)
              const iconColor = getActivityColor(activity.type)

              return (
                <div key={activity.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={activity.metadata?.avatar} />
                    <AvatarFallback>
                      {activity.userName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${iconColor}`} />
                      <span className="text-sm">
                        {locale === 'th' ? activity.description : activity.descriptionEn}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(activity.createdAt, locale)}
                      </span>

                      {activity.entityType && (
                        <Badge variant="outline" className="text-xs">
                          {activity.entityType}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {hasMore && (
              <div className="pt-4 text-center">
                <Button variant="outline" onClick={loadMore} disabled={loading}>
                  {loading ? t('common.loading') : 'โหลดเพิ่มเติม / Load More'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## Activity Timeline Component

```typescript
// components/activity/activity-timeline.tsx
'use client'

import { useState, useEffect } from 'react'
import { format, isSameDay } from 'date-fns'
import { th } from 'date-fns/locale'
import { useI18n } from '@/hooks/use-i18n'
import { Activity, getEntityActivities } from '@/lib/activity/service'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ActivityTimelineProps {
  entityType: string
  entityId: number
  limit?: number
}

export function ActivityTimeline({
  entityType,
  entityId,
  limit = 50
}: ActivityTimelineProps) {
  const { locale } = useI18n()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const data = await getEntityActivities(entityType, entityId, limit)
      setActivities(data)
      setLoading(false)
    }

    fetch()
  }, [entityType, entityId, limit])

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(activity.createdAt).toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(activity)
    return groups
  }, {} as Record<string, Activity[]>)

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        ไม่มีประวัติ / No history
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

      {/* Date groups */}
      {Object.entries(groupedActivities).map(([date, dateActivities]) => (
        <div key={date} className="mb-8">
          {/* Date header */}
          <div className="relative flex items-center mb-4">
            <div className="absolute left-0 w-8 h-8 rounded-full bg-background border-2 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
            <span className="ml-12 text-sm font-medium text-muted-foreground">
              {format(new Date(date), 'EEEE, d MMMM yyyy', { locale: locale === 'th' ? th : undefined })}
            </span>
          </div>

          {/* Activities */}
          <div className="ml-12 space-y-4">
            {dateActivities.map((activity) => (
              <div
                key={activity.id}
                className="relative pl-6 pb-4 border-l-2 border-border last:border-0"
              >
                {/* Timeline dot */}
                <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-primary" />

                <div className="flex items-start gap-3">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={activity.metadata?.avatar} />
                    <AvatarFallback className="text-xs">
                      {activity.userName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <p className="text-sm">
                      {locale === 'th' ? activity.description : activity.descriptionEn}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(activity.createdAt), 'HH:mm')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

## Activity API Routes

```typescript
// app/api/activities/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getActivities } from '@/lib/activity/service'
import { auth } from '@/auth'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') ? parseInt(searchParams.get('userId')!) : undefined
  const entityType = searchParams.get('entityType') || undefined
  const entityId = searchParams.get('entityId') ? parseInt(searchParams.get('entityId')!) : undefined
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  const result = await getActivities({
    userId,
    entityType,
    entityId,
    limit,
    offset
  })

  return NextResponse.json(result)
}
```

---

## Usage Examples

```tsx
// Example 1: Global activity feed
import { ActivityFeed } from '@/components/activity/activity-feed'

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <ActivityFeed limit={10} />
    </div>
  )
}

// Example 2: User's activity feed
function UserProfile({ userId }) {
  return (
    <div>
      <h2>User Activity</h2>
      <ActivityFeed userId={userId} limit={20} />
    </div>
  )
}

// Example 3: Item history timeline
import { ActivityTimeline } from '@/components/activity/activity-timeline'

function ItemDetail({ item }) {
  return (
    <div>
      <h1>{item.name}</h1>
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline entityType="item" entityId={item.id} />
        </CardContent>
      </Card>
    </div>
  )
}

// Example 4: Log activity on action
import { itemActivities } from '@/lib/activity/helpers'

async function createItem(data) {
  const item = await prisma.inventoryItem.create({ data })

  // Log activity
  await itemActivities.created(
    session.user.id,
    item.id,
    item.name
  )

  return item
}

// Example 5: Log request approval
import { requestActivities } from '@/lib/activity/helpers'

async function approveRequest(requestId) {
  const request = await prisma.request.update({
    where: { id: requestId },
    data: { status: 'APPROVED' }
  })

  // Log activity
  await requestActivities.approved(
    session.user.id,
    requestId
  )

  return request
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
