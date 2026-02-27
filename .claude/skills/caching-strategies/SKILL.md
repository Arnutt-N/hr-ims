---
name: caching-strategies
description: Caching strategies and implementation for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["cache", "caching", "memoization", "cache invalidation", "redis", "lru cache"]
  file_patterns: ["*cache*", "lib/cache*", "hooks/use-cache*"]
  context: caching strategies, memoization, cache invalidation, performance optimization
mcp_servers:
  - sequential
personas:
  - backend
  - performance
---

# Caching Strategies

## Core Role

Implement caching for HR-IMS:
- In-memory caching
- Request caching
- Data caching
- Cache invalidation

---

## In-Memory Cache

```typescript
// lib/cache/memory-cache.ts
interface CacheEntry<T> {
  value: T
  expiresAt: number
  createdAt: number
  tags: string[]
}

interface CacheOptions {
  ttl?: number          // Time to live in milliseconds
  tags?: string[]       // Tags for group invalidation
  staleWhileRevalidate?: boolean
}

export class MemoryCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>()
  private maxEntries: number
  private defaultTTL: number
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(options: { maxEntries?: number; defaultTTL?: number } = {}) {
    this.maxEntries = options.maxEntries || 1000
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000 // 5 minutes default
    this.startCleanup()
  }

  // Get value from cache
  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.value
  }

  // Set value in cache
  set(key: string, value: T, options: CacheOptions = {}): void {
    const ttl = options.ttl ?? this.defaultTTL

    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest()
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
      tags: options.tags || []
    })
  }

  // Get or set (compute if missing)
  async getOrSet(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = this.get(key)
    if (cached !== null) {
      return cached
    }

    const value = await factory()
    this.set(key, value, options)
    return value
  }

  // Delete entry
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  // Check if key exists
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  // Invalidate by tag
  invalidateByTag(tag: string): number {
    let count = 0
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key)
        count++
      }
    }
    return count
  }

  // Invalidate by pattern
  invalidateByPattern(pattern: RegExp): number {
    let count = 0
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key)
        count++
      }
    }
    return count
  }

  // Clear all entries
  clear(): void {
    this.cache.clear()
  }

  // Get cache statistics
  stats(): { entries: number; maxEntries: number; hitRate?: number } {
    return {
      entries: this.cache.size,
      maxEntries: this.maxEntries
    }
  }

  // Evict oldest entries
  private evictOldest(): void {
    // Remove 10% of oldest entries
    const toRemove = Math.floor(this.maxEntries * 0.1)
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].createdAt - b[1].createdAt)
      .slice(0, toRemove)

    for (const [key] of entries) {
      this.cache.delete(key)
    }
  }

  // Start cleanup interval
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key)
        }
      }
    }, 60000) // Clean every minute
  }

  // Stop cleanup
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

// Global cache instance
export const globalCache = new MemoryCache({
  maxEntries: 2000,
  defaultTTL: 5 * 60 * 1000 // 5 minutes
})
```

---

## Request Cache Hook

```typescript
// hooks/use-cached-query.ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseCachedQueryOptions<T> {
  key: string
  fetcher: () => Promise<T>
  ttl?: number
  staleWhileRevalidate?: boolean
  enabled?: boolean
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

interface CachedQueryResult<T> {
  data: T | null
  isLoading: boolean
  isError: boolean
  error: Error | null
  isStale: boolean
  refetch: () => Promise<void>
  invalidate: () => void
}

// Simple in-memory cache for client-side
const clientCache = new Map<string, { value: any; expiresAt: number }>()

export function useCachedQuery<T>(options: UseCachedQueryOptions<T>): CachedQueryResult<T> {
  const {
    key,
    fetcher,
    ttl = 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate = true,
    enabled = true,
    onSuccess,
    onError
  } = options

  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isStale, setIsStale] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)

  const getCached = useCallback((): T | null => {
    const cached = clientCache.get(key)
    if (!cached) return null

    if (Date.now() > cached.expiresAt) {
      if (staleWhileRevalidate) {
        setIsStale(true)
        return cached.value
      }
      clientCache.delete(key)
      return null
    }

    return cached.value
  }, [key, staleWhileRevalidate])

  const setCache = useCallback((value: T) => {
    clientCache.set(key, {
      value,
      expiresAt: Date.now() + ttl
    })
  }, [key, ttl])

  const fetchData = useCallback(async (isBackgroundRefetch = false) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    if (!isBackgroundRefetch) {
      setIsLoading(true)
    }
    setIsError(false)
    setError(null)

    try {
      const result = await fetcher()
      setData(result)
      setCache(result)
      setIsStale(false)
      onSuccess?.(result)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      setIsError(true)
      setError(err instanceof Error ? err : new Error('Unknown error'))
      onError?.(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [fetcher, setCache, onSuccess, onError])

  const refetch = useCallback(async () => {
    await fetchData(false)
  }, [fetchData])

  const invalidate = useCallback(() => {
    clientCache.delete(key)
    setIsStale(true)
  }, [key])

  useEffect(() => {
    if (!enabled) return

    // Check cache first
    const cached = getCached()
    if (cached !== null) {
      setData(cached)
      if (isStale) {
        // Background refetch for stale data
        fetchData(true)
      }
    } else {
      fetchData()
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [enabled, getCached, fetchData, isStale])

  return {
    data,
    isLoading,
    isError,
    error,
    isStale,
    refetch,
    invalidate
  }
}
```

---

## Server-Side Cache Utilities

```typescript
// lib/cache/server-cache.ts
import { globalCache } from './memory-cache'

// Cache key generators
export const cacheKeys = {
  user: (id: number) => `user:${id}`,
  userRoles: (id: number) => `user:${id}:roles`,
  users: (filters: any) => `users:${JSON.stringify(filters)}`,
  item: (id: number) => `item:${id}`,
  items: (filters: any) => `items:${JSON.stringify(filters)}`,
  itemStock: (itemId: number, warehouseId: number) => `item:${itemId}:stock:${warehouseId}`,
  warehouse: (id: number) => `warehouse:${id}`,
  warehouses: () => 'warehouses:all',
  category: (id: number) => `category:${id}`,
  categories: () => 'categories:all',
  request: (id: number) => `request:${id}`,
  requests: (filters: any) => `requests:${JSON.stringify(filters)}`,
  dashboardStats: (userId: number) => `dashboard:stats:${userId}`,
  notifications: (userId: number) => `notifications:${userId}`
}

// Cache tags for invalidation
export const cacheTags = {
  users: 'users',
  items: 'items',
  warehouses: 'warehouses',
  categories: 'categories',
  requests: 'requests',
  dashboard: 'dashboard',
  notifications: 'notifications'
}

// Cached data fetcher wrapper
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttl?: number; tags?: string[] } = {}
): Promise<T> {
  return globalCache.getOrSet(key, fetcher, options)
}

// Invalidate cache by tag
export function invalidateCache(tag: string): number {
  return globalCache.invalidateByTag(tag)
}

// Invalidate cache by key pattern
export function invalidateCachePattern(pattern: RegExp): number {
  return globalCache.invalidateByPattern(pattern)
}

// Invalidate user-related caches
export function invalidateUserCache(userId: number): void {
  invalidateCachePattern(new RegExp(`^user:${userId}`))
  invalidateCachePattern(new RegExp(`^dashboard:.*:${userId}`))
  invalidateCachePattern(new RegExp(`^notifications:${userId}`))
}

// Invalidate item-related caches
export function invalidateItemCache(itemId?: number): void {
  if (itemId) {
    invalidateCachePattern(new RegExp(`^item:${itemId}`))
  }
  invalidateCache(cacheTags.items)
  invalidateCache(cacheTags.dashboard)
}

// Invalidate request-related caches
export function invalidateRequestCache(requestId?: number): void {
  if (requestId) {
    invalidateCachePattern(new RegExp(`^request:${requestId}`))
  }
  invalidateCache(cacheTags.requests)
  invalidateCache(cacheTags.dashboard)
}
```

---

## Cached Server Actions

```typescript
// lib/actions/cached-actions.ts
'use server'

import { unstable_cache } from 'next/cache'
import prisma from '@/lib/prisma'
import { cacheKeys, cacheTags, cachedFetch, invalidateItemCache, invalidateUserCache } from '@/lib/cache/server-cache'

// Cached get all warehouses
export const getWarehouses = unstable_cache(
  async () => {
    return prisma.warehouse.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' }
    })
  },
  ['warehouses'],
  {
    tags: [cacheTags.warehouses],
    revalidate: 300 // 5 minutes
  }
)

// Cached get all categories
export const getCategories = unstable_cache(
  async () => {
    return prisma.category.findMany({
      where: { status: 'ACTIVE' },
      include: { parent: true },
      orderBy: { name: 'asc' }
    })
  },
  ['categories'],
  {
    tags: [cacheTags.categories],
    revalidate: 300
  }
)

// Cached get user by ID
export async function getUserById(id: number) {
  return cachedFetch(
    cacheKeys.user(id),
    async () => {
      return prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          department: true,
          position: true,
          phone: true,
          status: true,
          avatar: true,
          createdAt: true
        }
      })
    },
    { ttl: 60000, tags: [cacheTags.users] } // 1 minute
  )
}

// Cached get item with stock levels
export async function getItemWithStock(itemId: number) {
  return cachedFetch(
    cacheKeys.item(itemId),
    async () => {
      return prisma.inventoryItem.findUnique({
        where: { id: itemId },
        include: {
          category: true,
          stockLevels: {
            include: { warehouse: true }
          }
        }
      })
    },
    { ttl: 30000, tags: [cacheTags.items] } // 30 seconds
  )
}

// Cached get dashboard stats
export async function getDashboardStats(userId: number) {
  return cachedFetch(
    cacheKeys.dashboardStats(userId),
    async () => {
      const [
        totalItems,
        lowStockItems,
        pendingRequests,
        myRequests,
        notifications
      ] = await Promise.all([
        prisma.inventoryItem.count({ where: { status: 'AVAILABLE' } }),
        prisma.inventoryItem.count({
          where: {
            status: 'AVAILABLE',
            stockLevels: {
              some: {
                quantity: { lte: prisma.stockLevel.fields.minStock }
              }
            }
          }
        }),
        prisma.request.count({
          where: { status: 'PENDING' }
        }),
        prisma.request.count({
          where: { userId, status: { in: ['PENDING', 'APPROVED'] } }
        }),
        prisma.notification.count({
          where: { userId, read: false }
        })
      ])

      return {
        totalItems,
        lowStockItems,
        pendingRequests,
        myRequests,
        unreadNotifications: notifications
      }
    },
    { ttl: 60000, tags: [cacheTags.dashboard] }
  )
}

// Mutations that invalidate cache
export async function updateItem(itemId: number, data: any) {
  const item = await prisma.inventoryItem.update({
    where: { id: itemId },
    data
  })

  // Invalidate related caches
  invalidateItemCache(itemId)

  return item
}

export async function updateUser(userId: number, data: any) {
  const user = await prisma.user.update({
    where: { id: userId },
    data
  })

  // Invalidate user cache
  invalidateUserCache(userId)

  return user
}
```

---

## Cache Status Component

```typescript
// components/admin/cache-status.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Database, RefreshCw, Trash2 } from 'lucide-react'

interface CacheStats {
  entries: number
  maxEntries: number
  hitRate?: number
}

export function CacheStatus() {
  const [stats, setStats] = useState<CacheStats | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/cache/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch cache stats:', error)
    }
  }

  const invalidateCache = async (tag?: string) => {
    setLoading(true)
    try {
      await fetch('/api/admin/cache/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag })
      })
      fetchStats()
    } finally {
      setLoading(false)
    }
  }

  const clearCache = async () => {
    setLoading(true)
    try {
      await fetch('/api/admin/cache/clear', { method: 'POST' })
      fetchStats()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const cacheTags = [
    { tag: 'users', label: 'ผู้ใช้ / Users' },
    { tag: 'items', label: 'สินค้า / Items' },
    { tag: 'warehouses', label: 'คลัง / Warehouses' },
    { tag: 'categories', label: 'หมวดหมู่ / Categories' },
    { tag: 'requests', label: 'คำขอ / Requests' },
    { tag: 'dashboard', label: 'แดชบอร์ด / Dashboard' }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          สถานะแคช / Cache Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">{stats?.entries || 0}</p>
            <p className="text-sm text-muted-foreground">
              / {stats?.maxEntries || 0} entries
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            รีเฟรช / Refresh
          </Button>
        </div>

        {/* Invalidate by tag */}
        <div>
          <p className="text-sm font-medium mb-2">Invalidation by Tag</p>
          <div className="flex flex-wrap gap-2">
            {cacheTags.map(({ tag, label }) => (
              <Badge
                key={tag}
                variant="outline"
                className="cursor-pointer hover:bg-muted"
                onClick={() => invalidateCache(tag)}
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Clear all */}
        <Button
          variant="destructive"
          size="sm"
          onClick={clearCache}
          disabled={loading}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          ล้างทั้งหมด / Clear All
        </Button>
      </CardContent>
    </Card>
  )
}
```

---

## Cache API Routes

```typescript
// app/api/admin/cache/stats/route.ts
import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache/memory-cache'
import { auth } from '@/auth'

export async function GET() {
  const session = await auth()
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stats = globalCache.stats()
  return NextResponse.json(stats)
}

// app/api/admin/cache/invalidate/route.ts
import { NextResponse } from 'next/server'
import { invalidateCache } from '@/lib/cache/server-cache'
import { auth } from '@/auth'

export async function POST(request: Request) {
  const session = await auth()
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tag, pattern } = await request.json()

  let count = 0
  if (tag) {
    count = invalidateCache(tag)
  } else if (pattern) {
    count = invalidateCache(new RegExp(pattern))
  }

  return NextResponse.json({ invalidated: count })
}

// app/api/admin/cache/clear/route.ts
import { NextResponse } from 'next/server'
import { globalCache } from '@/lib/cache/memory-cache'
import { auth } from '@/auth'

export async function POST() {
  const session = await auth()
  if (!session || session.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  globalCache.clear()
  return NextResponse.json({ success: true })
}
```

---

## Usage Examples

```typescript
// Example 1: Using memory cache
import { globalCache } from '@/lib/cache/memory-cache'

// Set with TTL
globalCache.set('user:1', userData, { ttl: 60000, tags: ['users'] })

// Get
const user = globalCache.get('user:1')

// Get or compute
const data = await globalCache.getOrSet(
  'expensive-data',
  async () => computeExpensiveData(),
  { ttl: 300000 } // 5 minutes
)

// Invalidate by tag
globalCache.invalidateByTag('users')

// Example 2: Using cached query hook
function UserList() {
  const { data, isLoading, isStale, refetch } = useCachedQuery({
    key: 'users-list',
    fetcher: () => fetch('/api/users').then(r => r.json()),
    ttl: 60000,
    staleWhileRevalidate: true
  })

  if (isLoading) return <Loading />
  return (
    <div>
      {isStale && <Badge>Stale data</Badge>}
      <Button onClick={refetch}>Refetch</Button>
      {/* Render users */}
    </div>
  )
}

// Example 3: Server-side caching
import { cachedFetch, cacheKeys, invalidateItemCache } from '@/lib/cache/server-cache'

// Fetch with cache
const item = await cachedFetch(
  cacheKeys.item(1),
  () => prisma.inventoryItem.findUnique({ where: { id: 1 } }),
  { ttl: 30000, tags: ['items'] }
)

// Invalidate after mutation
await prisma.inventoryItem.update({ where: { id: 1 }, data: { name: 'New Name' } })
invalidateItemCache(1)

// Example 4: Using Next.js unstable_cache
import { unstable_cache } from 'next/cache'

export const getItems = unstable_cache(
  async () => {
    return prisma.inventoryItem.findMany()
  },
  ['items-list'],
  {
    tags: ['items'],
    revalidate: 300 // 5 minutes
  }
)
```

---

*Version: 1.0.0 | For HR-IMS Project*
