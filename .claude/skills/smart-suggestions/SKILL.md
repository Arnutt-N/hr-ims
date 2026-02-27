---
name: smart-suggestions
description: AI-powered smart suggestions and recommendations for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["suggestion", "recommendation", "smart", "ai suggest", "predict"]
  file_patterns: ["*suggestion*", "*recommendation*"]
  context: smart suggestions, AI recommendations, predictive suggestions
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# Smart Suggestions

## Core Role

Implement AI-powered smart suggestions:
- Item recommendations
- Search suggestions
- Action predictions
- Smart notifications

---

## Suggestion Service

```typescript
// lib/suggestions/service.ts
import prisma from '@/lib/prisma'
import { cache } from '@/lib/cache'

export interface Suggestion {
  id: string
  type: 'ITEM' | 'ACTION' | 'USER' | 'SEARCH'
  title: string
  subtitle?: string
  confidence: number
  metadata?: Record<string, any>
}

export interface UserBehavior {
  userId: number
  viewedItems: number[]
  requestedItems: number[]
  searchQueries: string[]
  frequentActions: Record<string, number>
}

// Get personalized item suggestions
export async function getItemSuggestions(
  userId: number,
  limit: number = 5
): Promise<Suggestion[]> {
  const cacheKey = `suggestions:items:${userId}`
  const cached = await cache.get(cacheKey)
  if (cached) return JSON.parse(cached)

  // Get user behavior data
  const behavior = await getUserBehavior(userId)

  // Get similar users' preferences
  const similarUsers = await findSimilarUsers(userId, behavior)

  // Get frequently requested items by similar users
  const suggestions: Suggestion[] = []

  // 1. Items frequently requested by similar users
  if (similarUsers.length > 0) {
    const popularItems = await prisma.requestItem.groupBy({
      by: ['itemId'],
      where: {
        request: {
          userId: { in: similarUsers.map(u => u.userId) },
          status: 'APPROVED'
        }
      },
      _count: { itemId: true },
      orderBy: { _count: { itemId: 'desc' } },
      take: limit
    })

    for (const item of popularItems) {
      const itemData = await prisma.inventoryItem.findUnique({
        where: { id: item.itemId },
        select: { id: true, name: true, category: { select: { name: true } } }
      })

      if (itemData && !behavior.requestedItems.includes(item.itemId)) {
        suggestions.push({
          id: `item-${item.itemId}`,
          type: 'ITEM',
          title: itemData.name,
          subtitle: itemData.category?.name,
          confidence: Math.min(0.95, item._count.itemId / 10),
          metadata: { itemId: item.itemId }
        })
      }
    }
  }

  // 2. Items from same categories as user's history
  const userCategories = await prisma.requestItem.findMany({
    where: {
      request: { userId }
    },
    include: {
      item: {
        select: { categoryId: true }
      }
    },
    distinct: ['itemId']
  })

  const categoryIds = [...new Set(
    userCategories
      .map(ri => ri.item?.categoryId)
      .filter(Boolean)
  )] as number[]

  if (categoryIds.length > 0) {
    const categoryItems = await prisma.inventoryItem.findMany({
      where: {
        categoryId: { in: categoryIds },
        id: { notIn: behavior.requestedItems }
      },
      include: { category: { select: { name: true } } },
      take: limit
    })

    for (const item of categoryItems) {
      if (!suggestions.some(s => s.metadata?.itemId === item.id)) {
        suggestions.push({
          id: `item-${item.id}`,
          type: 'ITEM',
          title: item.name,
          subtitle: item.category?.name,
          confidence: 0.7,
          metadata: { itemId: item.id }
        })
      }
    }
  }

  // 3. Low stock items user might need
  const lowStockItems = await prisma.inventoryItem.findMany({
    where: {
      stockLevels: {
        some: {
          quantity: { lte: prisma.stockLevel.fields.minQuantity }
        }
      }
    },
    include: {
      category: { select: { name: true } },
      stockLevels: { select: { quantity: true, minQuantity: true } }
    },
    take: 3
  })

  for (const item of lowStockItems) {
    if (!suggestions.some(s => s.metadata?.itemId === item.id)) {
      const stock = item.stockLevels[0]
      suggestions.push({
        id: `low-stock-${item.id}`,
        type: 'ITEM',
        title: item.name,
        subtitle: `Low stock: ${stock?.quantity || 0} remaining`,
        confidence: 0.6,
        metadata: { itemId: item.id, isLowStock: true }
      })
    }
  }

  // Sort by confidence and limit
  const result = suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit)

  await cache.set(cacheKey, JSON.stringify(result), 300) // 5 min cache

  return result
}

// Get action suggestions
export async function getActionSuggestions(
  userId: number
): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = []

  // Get pending tasks
  const pendingRequests = await prisma.request.count({
    where: {
      userId,
      status: 'PENDING'
    }
  })

  if (pendingRequests > 0) {
    suggestions.push({
      id: 'action-pending-requests',
      type: 'ACTION',
      title: 'View Pending Requests',
      subtitle: `${pendingRequests} requests waiting`,
      confidence: 0.9,
      metadata: { action: 'navigate', path: '/requests?status=PENDING' }
    })
  }

  // Get pending approvals (if user is approver)
  const pendingApprovals = await prisma.request.count({
    where: {
      status: 'PENDING',
      // Check if user can approve
      OR: [
        { approvedById: null }
      ]
    }
  })

  if (pendingApprovals > 0) {
    const isApprover = await checkUserApproverStatus(userId)
    if (isApprover) {
      suggestions.push({
        id: 'action-pending-approvals',
        type: 'ACTION',
        title: 'Review Approvals',
        subtitle: `${pendingApprovals} requests to approve`,
        confidence: 0.95,
        metadata: { action: 'navigate', path: '/requests?tab=approvals' }
      })
    }
  }

  // Get unread notifications
  const unreadNotifications = await prisma.notification.count({
    where: { userId, read: false }
  })

  if (unreadNotifications > 0) {
    suggestions.push({
      id: 'action-notifications',
      type: 'ACTION',
      title: 'Check Notifications',
      subtitle: `${unreadNotifications} unread`,
      confidence: 0.8,
      metadata: { action: 'navigate', path: '/notifications' }
    })
  }

  // Suggest recurring requests
  const recurringDue = await prisma.recurringRequestTemplate.findFirst({
    where: {
      createdById: userId,
      isActive: true,
      nextOccurrenceAt: {
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
      }
    }
  })

  if (recurringDue) {
    suggestions.push({
      id: 'action-recurring',
      type: 'ACTION',
      title: 'Create Recurring Request',
      subtitle: `"${recurringDue.name}" is due`,
      confidence: 0.85,
      metadata: { action: 'create-recurring', templateId: recurringDue.id }
    })
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence)
}

// Get search suggestions
export async function getSearchSuggestions(
  userId: number,
  query: string,
  limit: number = 10
): Promise<Suggestion[]> {
  if (!query || query.length < 2) {
    return getRecentSearches(userId, limit)
  }

  const suggestions: Suggestion[] = []
  const searchQuery = query.toLowerCase()

  // Search items
  const items = await prisma.inventoryItem.findMany({
    where: {
      OR: [
        { name: { contains: searchQuery } },
        { serialNumber: { contains: searchQuery } },
        { description: { contains: searchQuery } }
      ]
    },
    include: { category: { select: { name: true } } },
    take: 5
  })

  for (const item of items) {
    suggestions.push({
      id: `search-item-${item.id}`,
      type: 'ITEM',
      title: item.name,
      subtitle: item.category?.name || item.serialNumber,
      confidence: 0.9,
      metadata: { type: 'item', id: item.id }
    })
  }

  // Search users
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: searchQuery } },
        { email: { contains: searchQuery } }
      ],
      status: 'ACTIVE'
    },
    take: 3
  })

  for (const user of users) {
    suggestions.push({
      id: `search-user-${user.id}`,
      type: 'USER',
      title: user.name,
      subtitle: user.email,
      confidence: 0.85,
      metadata: { type: 'user', id: user.id }
    })
  }

  // Search history suggestions
  const recentSearches = await getRecentSearches(userId, 3)
  const matchingSearches = recentSearches.filter(s =>
    s.title.toLowerCase().includes(searchQuery)
  )

  suggestions.push(...matchingSearches)

  // Save search query
  await saveSearchQuery(userId, query)

  return suggestions.slice(0, limit)
}

// Get recent searches
async function getRecentSearches(
  userId: number,
  limit: number
): Promise<Suggestion[]> {
  const searches = await prisma.searchHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit
  })

  return searches.map(s => ({
    id: `search-history-${s.id}`,
    type: 'SEARCH' as const,
    title: s.query,
    confidence: 0.5,
    metadata: { type: 'history' }
  }))
}

// Save search query
async function saveSearchQuery(userId: number, query: string): Promise<void> {
  // Check if query exists
  const existing = await prisma.searchHistory.findFirst({
    where: { userId, query }
  })

  if (existing) {
    await prisma.searchHistory.update({
      where: { id: existing.id },
      data: { createdAt: new Date() }
    })
  } else {
    await prisma.searchHistory.create({
      data: { userId, query }
    })
  }

  // Limit history to 50 entries
  const count = await prisma.searchHistory.count({
    where: { userId }
  })

  if (count > 50) {
    const oldest = await prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: count - 50,
      select: { id: true }
    })

    await prisma.searchHistory.deleteMany({
      where: { id: { in: oldest.map(s => s.id) } }
    })
  }
}

// Get user behavior data
async function getUserBehavior(userId: number): Promise<UserBehavior> {
  // Get viewed items (from audit log)
  const viewedItems = await prisma.auditLog.findMany({
    where: {
      userId,
      action: 'READ',
      tableName: 'InventoryItem'
    },
    select: { recordId: true },
    take: 100
  })

  // Get requested items
  const requestedItems = await prisma.requestItem.findMany({
    where: { request: { userId } },
    select: { itemId: true }
  })

  // Get search queries
  const searchQueries = await prisma.searchHistory.findMany({
    where: { userId },
    select: { query: true },
    take: 20
  })

  // Get frequent actions
  const actions = await prisma.auditLog.groupBy({
    by: ['action', 'tableName'],
    where: { userId },
    _count: true,
    take: 10
  })

  const frequentActions: Record<string, number> = {}
  for (const action of actions) {
    const key = `${action.action}_${action.tableName}`
    frequentActions[key] = action._count
  }

  return {
    userId,
    viewedItems: viewedItems.map(v => v.recordId).filter(Boolean) as number[],
    requestedItems: requestedItems.map(r => r.itemId),
    searchQueries: searchQueries.map(s => s.query),
    frequentActions
  }
}

// Find similar users
async function findSimilarUsers(
  userId: number,
  behavior: UserBehavior
): Promise<Array<{ userId: number; similarity: number }>> {
  // Get all users with similar department
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { departmentId: true }
  })

  if (!user?.departmentId) return []

  const similarUsers = await prisma.user.findMany({
    where: {
      departmentId: user.departmentId,
      id: { not: userId },
      status: 'ACTIVE'
    },
    select: { id: true }
  })

  // Calculate similarity scores
  const results: Array<{ userId: number; similarity: number }> = []

  for (const similar of similarUsers.slice(0, 10)) {
    const otherBehavior = await getUserBehavior(similar.id)

    // Simple Jaccard similarity on requested items
    const set1 = new Set(behavior.requestedItems)
    const set2 = new Set(otherBehavior.requestedItems)

    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])

    const similarity = union.size > 0 ? intersection.size / union.size : 0

    if (similarity > 0.1) {
      results.push({ userId: similar.id, similarity })
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity).slice(0, 5)
}

// Check if user is approver
async function checkUserApproverStatus(userId: number): Promise<boolean> {
  const userRoles = await prisma.userRole.findFirst({
    where: {
      userId,
      role: { slug: { in: ['admin', 'approver', 'superadmin'] } }
    }
  })

  return !!userRoles
}

// Get smart notifications
export async function getSmartNotifications(
  userId: number
): Promise<Array<{
  id: string
  type: 'INFO' | 'WARNING' | 'OPPORTUNITY'
  title: string
  message: string
  action?: { label: string; path: string }
}>> {
  const notifications = []

  // Check for items expiring soon
  const expiringItems = await prisma.inventoryItem.findMany({
    where: {
      // Assuming expiryDate field exists
      // expiryDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
    },
    take: 5
  })

  if (expiringItems.length > 0) {
    notifications.push({
      id: 'expiring-items',
      type: 'WARNING' as const,
      title: 'Items Expiring Soon',
      message: `${expiringItems.length} items will expire within 30 days`,
      action: { label: 'View Items', path: '/inventory?filter=expiring' }
    })
  }

  // Check for request patterns
  const lastMonthRequests = await prisma.request.count({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }
  })

  const previousMonthRequests = await prisma.request.count({
    where: {
      userId,
      createdAt: {
        gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    }
  })

  if (lastMonthRequests > previousMonthRequests * 1.5) {
    notifications.push({
      id: 'usage-insight',
      type: 'INFO' as const,
      title: 'Usage Insight',
      message: 'Your requests increased by ' +
        `${Math.round(((lastMonthRequests - previousMonthRequests) / previousMonthRequests) * 100)}% this month`
    })
  }

  return notifications
}
```

---

## Suggestion Panel Component

```typescript
// components/suggestions/suggestion-panel.tsx
'use client'

import { useI18n } from '@/hooks/use-i18n'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Lightbulb,
  Package,
  User,
  Search,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Loader2
} from 'lucide-react'
import { getItemSuggestions, getActionSuggestions } from '@/lib/suggestions/service'
import { useRouter } from 'next/navigation'

interface SuggestionPanelProps {
  userId: number
  compact?: boolean
}

export function SuggestionPanel({ userId, compact = false }: SuggestionPanelProps) {
  const { locale } = useI18n()
  const router = useRouter()

  const { data: itemSuggestions, isLoading: itemsLoading } = useQuery({
    queryKey: ['suggestions', 'items', userId],
    queryFn: () => getItemSuggestions(userId, compact ? 3 : 5)
  })

  const { data: actionSuggestions, isLoading: actionsLoading } = useQuery({
    queryKey: ['suggestions', 'actions', userId],
    queryFn: () => getActionSuggestions(userId)
  })

  const getIcon = (type: string) => {
    switch (type) {
      case 'ITEM':
        return <Package className="h-4 w-4" />
      case 'USER':
        return <User className="h-4 w-4" />
      case 'ACTION':
        return <TrendingUp className="h-4 w-4" />
      case 'SEARCH':
        return <Search className="h-4 w-4" />
      default:
        return <Lightbulb className="h-4 w-4" />
    }
  }

  const handleSuggestionClick = (suggestion: any) => {
    if (suggestion.metadata?.action === 'navigate') {
      router.push(suggestion.metadata.path)
    } else if (suggestion.metadata?.itemId) {
      router.push(`/inventory/${suggestion.metadata.itemId}`)
    } else if (suggestion.metadata?.type === 'user') {
      router.push(`/users/${suggestion.metadata.id}`)
    }
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          {locale === 'th' ? 'แนะนำสำหรับคุณ' : 'Suggested for you'}
        </div>

        {itemsLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <div className="space-y-1">
            {itemSuggestions?.slice(0, 3).map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-left"
              >
                {getIcon(suggestion.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{suggestion.title}</p>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          {locale === 'th' ? 'คำแนะนำอัจฉริยะ' : 'Smart Suggestions'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Item Suggestions */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              {locale === 'th' ? 'พัสดุที่แนะนำ' : 'Recommended Items'}
            </h3>
            <ScrollArea className="h-[200px]">
              {itemsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : itemSuggestions && itemSuggestions.length > 0 ? (
                <div className="space-y-2">
                  {itemSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors text-left"
                    >
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {getIcon(suggestion.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{suggestion.title}</p>
                        {suggestion.subtitle && (
                          <p className="text-sm text-muted-foreground truncate">
                            {suggestion.subtitle}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(suggestion.confidence * 100)}%
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  {locale === 'th'
                    ? 'ไม่มีคำแนะนำในขณะนี้'
                    : 'No suggestions available'}
                </p>
              )}
            </ScrollArea>
          </div>

          {/* Action Suggestions */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {locale === 'th' ? 'การดำเนินการที่แนะนำ' : 'Suggested Actions'}
            </h3>
            <ScrollArea className="h-[200px]">
              {actionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : actionSuggestions && actionSuggestions.length > 0 ? (
                <div className="space-y-2">
                  {actionSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors text-left"
                    >
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {getIcon(suggestion.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{suggestion.title}</p>
                        {suggestion.subtitle && (
                          <p className="text-sm text-muted-foreground truncate">
                            {suggestion.subtitle}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  {locale === 'th'
                    ? 'ไม่มีการดำเนินการที่แนะนำ'
                    : 'No suggested actions'}
                </p>
              )}
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Smart Search Component

```typescript
// components/suggestions/smart-search.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { useDebounce } from '@/hooks/use-debounce'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { getSearchSuggestions } from '@/lib/suggestions/service'
import {
  Search,
  Package,
  User,
  Clock,
  Loader2,
  ArrowRight
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SmartSearchProps {
  userId: number
  className?: string
  placeholder?: string
  onFocus?: () => void
}

export function SmartSearch({
  userId,
  className,
  placeholder,
  onFocus
}: SmartSearchProps) {
  const { locale } = useI18n()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const debouncedQuery = useDebounce(query, 300)

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['search-suggestions', userId, debouncedQuery],
    queryFn: () => getSearchSuggestions(userId, debouncedQuery, 8),
    enabled: debouncedQuery.length >= 2 || debouncedQuery.length === 0
  })

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!suggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex])
        } else if (query.trim()) {
          router.push(`/search?q=${encodeURIComponent(query)}`)
          setIsOpen(false)
        }
        break
      case 'Escape':
        setIsOpen(false)
        inputRef.current?.blur()
        break
    }
  }

  const handleSelect = (suggestion: any) => {
    if (suggestion.metadata?.type === 'item') {
      router.push(`/inventory/${suggestion.metadata.id}`)
    } else if (suggestion.metadata?.type === 'user') {
      router.push(`/users/${suggestion.metadata.id}`)
    } else if (suggestion.metadata?.type === 'history') {
      setQuery(suggestion.title)
      router.push(`/search?q=${encodeURIComponent(suggestion.title)}`)
    }

    setIsOpen(false)
  }

  const getIcon = (type: string, metadata?: any) => {
    if (metadata?.type === 'history') return <Clock className="h-4 w-4 text-muted-foreground" />
    if (metadata?.type === 'item') return <Package className="h-4 w-4" />
    if (metadata?.type === 'user') return <User className="h-4 w-4" />
    return <Search className="h-4 w-4" />
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectedIndex(-1)
          }}
          onFocus={() => {
            setIsOpen(true)
            onFocus?.()
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || (locale === 'th' ? 'ค้นหา...' : 'Search...')}
          className={cn(
            'w-full h-10 pl-10 pr-4 rounded-lg',
            'bg-muted border border-transparent',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
            'placeholder:text-muted-foreground'
          )}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="max-h-80 overflow-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                onClick={() => handleSelect(suggestion)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left',
                  'hover:bg-muted transition-colors',
                  index === selectedIndex && 'bg-muted'
                )}
              >
                <div className="p-1.5 bg-muted rounded">
                  {getIcon(suggestion.type, suggestion.metadata)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{suggestion.title}</p>
                  {suggestion.subtitle && (
                    <p className="text-sm text-muted-foreground truncate">
                      {suggestion.subtitle}
                    </p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
              </button>
            ))}
          </div>

          {/* Search all */}
          {query.length >= 2 && (
            <div className="border-t p-2">
              <button
                onClick={() => {
                  router.push(`/search?q=${encodeURIComponent(query)}`)
                  setIsOpen(false)
                }}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-primary hover:bg-muted rounded"
              >
                <Search className="h-4 w-4" />
                {locale === 'th'
                  ? `ค้นหา "${query}" ทั้งหมด`
                  : `Search all for "${query}"`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

---

## Prisma Schema

```prisma
// Search History
model SearchHistory {
  id        Int      @id @default(autoincrement())
  userId    Int
  query     String
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}

// User Suggestion Cache
model SuggestionCache {
  id        Int      @id @default(autoincrement())
  userId    Int
  type      String   // 'items', 'actions', etc.
  data      String   // JSON
  expiresAt DateTime
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, type])
  @@index([expiresAt])
}

// Add to User model
model User {
  // ... existing fields
  searchHistories    SearchHistory[]
  suggestionCaches   SuggestionCache[]
}
```

---

## Usage Examples

```tsx
// Example 1: Add suggestion panel to dashboard
import { SuggestionPanel } from '@/components/suggestions/suggestion-panel'

function DashboardPage() {
  const session = useSession()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main content */}
      <div className="lg:col-span-2">
        {/* Dashboard widgets */}
      </div>

      {/* Sidebar with suggestions */}
      <div>
        <SuggestionPanel userId={parseInt(session.user.id)} />
      </div>
    </div>
  )
}

// Example 2: Smart search in header
import { SmartSearch } from '@/components/suggestions/smart-search'

function Header() {
  const session = useSession()

  return (
    <header className="flex items-center gap-4 p-4">
      <SmartSearch
        userId={parseInt(session.user.id)}
        className="w-64"
        placeholder="Search items, users..."
      />
    </header>
  )
}

// Example 3: Compact suggestions in sidebar
import { SuggestionPanel } from '@/components/suggestions/suggestion-panel'

function Sidebar() {
  return (
    <aside className="w-64 p-4 border-r">
      <nav>
        {/* Navigation items */}
      </nav>

      <div className="mt-8">
        <SuggestionPanel userId={1} compact />
      </div>
    </aside>
  )
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
