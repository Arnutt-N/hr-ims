---
name: caching-optimizer
description: Cache strategies and invalidation patterns for HR-IMS | กลยุทธ์การแคชและรูปแบบการยกเลิกความถูกต้องสำหรับ HR-IMS
version: 1.0.0
author: HR-IMS Team
tags: [cache, optimization, performance, redis, memory]
languages: [en, th]
---

# Caching Optimizer / ตัวเพิ่มประสิทธิภาพการแคช

Cache strategies and invalidation patterns for HR-IMS applications.

## Overview / ภาพรวม

**EN**: Comprehensive caching system with multiple strategies, automatic invalidation, and intelligent cache management for optimal application performance.

**TH**: ระบบแคชที่ครอบคลุมพร้อมกลยุทธ์หลายรูปแบบ การยกเลิกความถูกต้องอัตโนมัติ และการจัดการแคชอัจฉริยะเพื่อประสิทธิภาพแอปพลิเคชันที่เหมาะสมที่สุด

## Core Features / คุณสมบัติหลัก

### 1. Cache Manager / ตัวจัดการแคช

```typescript
// lib/cache/cache-manager.ts
interface CacheOptions {
  ttl?: number // Time to live in seconds
  tags?: string[] // Tags for group invalidation
  staleWhileRevalidate?: boolean // Serve stale while refreshing
  compress?: boolean // Compress large values
}

interface CacheEntry<T> {
  value: T
  expiry: number
  tags: string[]
  createdAt: number
  compressed: boolean
}

class CacheManager {
  private cache: Map<string, CacheEntry<unknown>> = new Map()
  private tagIndex: Map<string, Set<string>> = new Map()
  private readonly defaultTTL: number = 3600 // 1 hour
  private readonly maxSize: number = 1000
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    this.startCleanup()
  }

  // Get value from cache / ดึงค่าจากแคช
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined

    if (!entry) return null

    if (Date.now() > entry.expiry) {
      this.delete(key)
      return null
    }

    let value = entry.value
    if (entry.compressed && typeof value === 'string') {
      value = await this.decompress(value)
    }

    return value as T
  }

  // Set value in cache / ตั้งค่าในแคช
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const {
      ttl = this.defaultTTL,
      tags = [],
      compress = false,
    } = options

    let finalValue: unknown = value
    let compressed = false

    if (compress && typeof value === 'object') {
      finalValue = await this.compress(JSON.stringify(value))
      compressed = true
    }

    // Remove oldest entries if at capacity / ลบรายการเก่าถ้าเต็มความจุ
    if (this.cache.size >= this.maxSize) {
      this.evictOldest()
    }

    const entry: CacheEntry<unknown> = {
      value: finalValue,
      expiry: Date.now() + ttl * 1000,
      tags,
      createdAt: Date.now(),
      compressed,
    }

    this.cache.set(key, entry)

    // Update tag index / อัปเดตดัชนีแท็ก
    tags.forEach(tag => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set())
      }
      this.tagIndex.get(tag)!.add(key)
    })
  }

  // Get or set pattern / รูปแบบ Get or set
  async getOrSet<T>(
    key: string,
    loader: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) return cached

    const value = await loader()
    await this.set(key, value, options)
    return value
  }

  // Delete from cache / ลบจากแคช
  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    // Remove from tag index / ลบจากดัชนีแท็ก
    entry.tags.forEach(tag => {
      this.tagIndex.get(tag)?.delete(key)
      if (this.tagIndex.get(tag)?.size === 0) {
        this.tagIndex.delete(tag)
      }
    })

    return this.cache.delete(key)
  }

  // Invalidate by tag / ยกเลิกความถูกต้องตามแท็ก
  invalidateByTag(tag: string): number {
    const keys = this.tagIndex.get(tag)
    if (!keys) return 0

    let count = 0
    keys.forEach(key => {
      if (this.delete(key)) count++
    })

    return count
  }

  // Invalidate by pattern / ยกเลิกความถูกต้องตามรูปแบบ
  invalidateByPattern(pattern: string): number {
    const regex = new RegExp(pattern)
    let count = 0

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        if (this.delete(key)) count++
      }
    }

    return count
  }

  // Clear all cache / ล้างแคชทั้งหมด
  clear(): void {
    this.cache.clear()
    this.tagIndex.clear()
  }

  // Get cache stats / รับสถิติแคช
  getStats(): {
    size: number
    maxSize: number
    tags: number
    hitRate: number
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      tags: this.tagIndex.size,
      hitRate: 0, // Would need hit/miss tracking
    }
  }

  private evictOldest(): void {
    let oldest: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt
        oldest = key
      }
    }

    if (oldest) this.delete(oldest)
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiry) {
          this.delete(key)
        }
      }
    }, 60000) // Cleanup every minute
  }

  private async compress(data: string): Promise<string> {
    // Simple compression simulation / จำลองการบีบอัดอย่างง่าย
    return `compressed:${data}`
  }

  private async decompress(data: string): Promise<unknown> {
    if (data.startsWith('compressed:')) {
      return JSON.parse(data.slice(11))
    }
    return data
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}

export const cacheManager = new CacheManager()
```

### 2. Cache Strategies / กลยุทธ์การแคช

```typescript
// lib/cache/strategies.ts

// Cache-Aside Pattern / รูปแบบ Cache-Aside
export class CacheAsideStrategy {
  constructor(private cache: CacheManager) {}

  async read<T>(
    key: string,
    dbLoader: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.cache.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const data = await dbLoader()
    await this.cache.set(key, data, options)
    return data
  }

  async write<T>(
    key: string,
    data: T,
    dbWriter: (data: T) => Promise<void>,
    options?: CacheOptions
  ): Promise<void> {
    await dbWriter(data)
    await this.cache.set(key, data, options)
  }

  async invalidate(key: string): Promise<void> {
    this.cache.delete(key)
  }
}

// Write-Through Pattern / รูปแบบ Write-Through
export class WriteThroughStrategy {
  constructor(private cache: CacheManager) {}

  async write<T>(
    key: string,
    data: T,
    dbWriter: (data: T) => Promise<void>,
    options?: CacheOptions
  ): Promise<void> {
    await this.cache.set(key, data, options)
    await dbWriter(data)
  }

  async read<T>(
    key: string,
    dbLoader: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    return this.cache.getOrSet(key, dbLoader, options)
  }
}

// Write-Behind Pattern / รูปแบบ Write-Behind
export class WriteBehindStrategy {
  private writeQueue: Map<string, { data: unknown; writer: (data: unknown) => Promise<void> }> = new Map()
  private flushInterval: NodeJS.Timeout | null = null

  constructor(private cache: CacheManager) {
    this.startFlushInterval()
  }

  async write<T>(
    key: string,
    data: T,
    dbWriter: (data: T) => Promise<void>,
    options?: CacheOptions
  ): Promise<void> {
    await this.cache.set(key, data, options)
    this.writeQueue.set(key, { data, writer: dbWriter as (data: unknown) => Promise<void> })
  }

  async read<T>(
    key: string,
    dbLoader: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    return this.cache.getOrSet(key, dbLoader, options)
  }

  private startFlushInterval(): void {
    this.flushInterval = setInterval(async () => {
      const entries = Array.from(this.writeQueue.entries())
      this.writeQueue.clear()

      await Promise.all(
        entries.map(async ([key, { data, writer }]) => {
          try {
            await writer(data)
          } catch (error) {
            console.error(`Failed to flush ${key}:`, error)
            // Re-queue failed writes / ใส่กลับคิวสำหรับการเขียนที่ล้มเหลว
            this.writeQueue.set(key, { data, writer })
          }
        })
      )
    }, 5000) // Flush every 5 seconds
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
  }
}

// Stale-While-Revalidate Pattern / รูปแบบ Stale-While-Revalidate
export class StaleWhileRevalidateStrategy {
  private revalidating: Set<string> = new Set()

  constructor(private cache: CacheManager) {}

  async read<T>(
    key: string,
    dbLoader: () => Promise<T>,
    options: CacheOptions & { staleTTL?: number } = {}
  ): Promise<T> {
    const { staleTTL = 60 } = options
    const cached = await this.cache.get<T>(key)

    if (cached !== null) {
      // Check if stale but still valid / ตรวจสอบว่าเก่าแต่ยังใช้ได้
      const entry = this.cache.getEntry(key)
      const isStale = entry && (Date.now() - entry.createdAt) > staleTTL * 1000

      if (isStale && !this.revalidating.has(key)) {
        // Revalidate in background / รีเฟรชในพื้นหลัง
        this.revalidate(key, dbLoader, options)
      }

      return cached
    }

    const data = await dbLoader()
    await this.cache.set(key, data, options)
    return data
  }

  private async revalidate<T>(
    key: string,
    loader: () => Promise<T>,
    options: CacheOptions
  ): Promise<void> {
    this.revalidating.add(key)
    try {
      const data = await loader()
      await this.cache.set(key, data, options)
    } finally {
      this.revalidating.delete(key)
    }
  }
}
```

### 3. Server Action Cache Integration / การรวมแคชกับ Server Actions

```typescript
// lib/cache/server-action-cache.ts
import { cacheManager } from './cache-manager'

// Cache decorator for Server Actions / ตัวตกแต่งแคชสำหรับ Server Actions
export function cached<TArgs extends unknown[], TResult>(
  options: {
    keyGenerator: (...args: TArgs) => string
    ttl?: number
    tags?: string[] | ((...args: TArgs) => string[])
    revalidate?: boolean
  }
) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: TArgs) => Promise<TResult>>
  ) {
    const originalMethod = descriptor.value!

    descriptor.value = async function (...args: TArgs): Promise<TResult> {
      const key = options.keyGenerator(...args)
      const tags = typeof options.tags === 'function'
        ? options.tags(...args)
        : options.tags || []

      if (!options.revalidate) {
        return cacheManager.getOrSet(
          key,
          () => originalMethod.apply(this, args),
          { ttl: options.ttl, tags }
        )
      }

      // Force revalidation / บังคับรีเฟรช
      const result = await originalMethod.apply(this, args)
      await cacheManager.set(key, result, { ttl: options.ttl, tags })
      return result
    }

    return descriptor
  }
}

// Usage example / ตัวอย่างการใช้งาน
// class InventoryService {
//   @cached({
//     keyGenerator: (id: number) => `inventory:item:${id}`,
//     ttl: 300,
//     tags: ['inventory'],
//   })
//   async getItem(id: number) {
//     return prisma.inventoryItem.findUnique({ where: { id } })
//   }
// }
```

### 4. Cache Invalidation Patterns / รูปแบบการยกเลิกความถูกต้อง

```typescript
// lib/cache/invalidation.ts
import { cacheManager } from './cache-manager'

// Invalidation rules / กฎการยกเลิกความถูกต้อง
const INVALIDATION_RULES = {
  // When an item is updated, invalidate related caches / เมื่อรายการถูกอัปเดต ยกเลิกแคชที่เกี่ยวข้อง
  inventoryItem: {
    onCreate: ['inventory:list', 'dashboard:stats'],
    onUpdate: ['inventory:item:*', 'inventory:list', 'dashboard:stats'],
    onDelete: ['inventory:item:*', 'inventory:list', 'dashboard:stats'],
  },
  request: {
    onCreate: ['request:list', 'request:user:*', 'dashboard:stats'],
    onUpdate: ['request:*', 'dashboard:stats'],
    onDelete: ['request:*', 'dashboard:stats'],
  },
  user: {
    onUpdate: ['user:*', 'dashboard:stats'],
  },
}

// Invalidation service / บริการยกเลิกความถูกต้อง
export class CacheInvalidationService {
  // Invalidate after create / ยกเลิกหลังสร้าง
  async invalidateOnCreate(entity: keyof typeof INVALIDATION_RULES, id: number): Promise<void> {
    const patterns = INVALIDATION_RULES[entity]?.onCreate || []
    await this.invalidatePatterns(patterns, id)
  }

  // Invalidate after update / ยกเลิกหลังอัปเดต
  async invalidateOnUpdate(entity: keyof typeof INVALIDATION_RULES, id: number): Promise<void> {
    const patterns = INVALIDATION_RULES[entity]?.onUpdate || []
    await this.invalidatePatterns(patterns, id)
  }

  // Invalidate after delete / ยกเลิกหลังลบ
  async invalidateOnDelete(entity: keyof typeof INVALIDATION_RULES, id: number): Promise<void> {
    const patterns = INVALIDATION_RULES[entity]?.onDelete || []
    await this.invalidatePatterns(patterns, id)
  }

  private async invalidatePatterns(patterns: string[], id: number): Promise<void> {
    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        // Replace wildcard with ID or match pattern / แทนที่ไวลด์การ์ดด้วย ID หรือจับคู่รูปแบบ
        if (pattern.endsWith(':*')) {
          // Tag-based invalidation / ยกเลิกตามแท็ก
          const tag = pattern.replace(':*', '')
          cacheManager.invalidateByTag(tag)
        } else {
          // Pattern-based invalidation / ยกเลิกตามรูปแบบ
          const regexPattern = pattern.replace('*', '.*')
          cacheManager.invalidateByPattern(regexPattern)
        }
      } else {
        cacheManager.delete(pattern)
      }
    }
  }
}

export const cacheInvalidation = new CacheInvalidationService()
```

### 5. Next.js Integration / การรวมกับ Next.js

```typescript
// lib/cache/next-cache.ts
import { unstable_cache } from 'next/cache'

// Wrapper for Next.js cache / ตัวห่อสำหรับ Next.js cache
export function withNextCache<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: {
    tags: string[]
    revalidate?: number | false
  }
): T {
  return unstable_cache(fn, undefined, {
    tags: options.tags,
    revalidate: options.revalidate,
  }) as T
}

// Revalidate cache by tag / รีเฟรชแคชตามแท็ก
export async function revalidateCacheTag(tag: string): Promise<void> {
  'use server'
  const { revalidateTag } = await import('next/cache')
  revalidateTag(tag)
}

// Revalidate cache by path / รีเฟรชแคชตามเส้นทาง
export async function revalidateCachePath(path: string): Promise<void> {
  'use server'
  const { revalidatePath } = await import('next/cache')
  revalidatePath(path)
}

// Usage example / ตัวอย่างการใช้งาน
// export const getInventoryList = withNextCache(
//   async () => {
//     return prisma.inventoryItem.findMany()
//   },
//   {
//     tags: ['inventory'],
//     revalidate: 300, // 5 minutes
//   }
// )
```

### 6. Cache Statistics Component / คอมโพเนนต์สถิติแคช

```typescript
// components/admin/cache-stats.tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface CacheStats {
  size: number
  maxSize: number
  tags: number
  hitRate: number
}

export function CacheStatsDisplay() {
  const [stats, setStats] = useState<CacheStats | null>(null)

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/cache/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch cache stats:', error)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const clearCache = async () => {
    try {
      await fetch('/api/admin/cache/clear', { method: 'POST' })
      fetchStats()
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }

  if (!stats) return <div>Loading...</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Cache Statistics
          <br />
          สถิติแคช
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <span>Cache Size</span>
          <Badge variant="outline">
            {stats.size} / {stats.maxSize}
          </Badge>
        </div>

        <div className="flex justify-between">
          <span>Tags</span>
          <Badge variant="outline">{stats.tags}</Badge>
        </div>

        <div className="flex justify-between">
          <span>Hit Rate</span>
          <Badge variant={stats.hitRate > 80 ? 'default' : 'destructive'}>
            {stats.hitRate.toFixed(1)}%
          </Badge>
        </div>

        <Button variant="destructive" onClick={clearCache} className="w-full">
          Clear Cache
          <br />
          ล้างแคช
        </Button>
      </CardContent>
    </Card>
  )
}
```

## Usage Examples / ตัวอย่างการใช้งาน

### Basic Caching / การแคชพื้นฐาน

```typescript
import { cacheManager } from '@/lib/cache/cache-manager'

// Get or set / ดึงหรือตั้งค่า
const item = await cacheManager.getOrSet(
  `inventory:${id}`,
  () => prisma.inventoryItem.findUnique({ where: { id } }),
  { ttl: 300, tags: ['inventory'] }
)

// Invalidate / ยกเลิกความถูกต้อง
await cacheManager.invalidateByTag('inventory')
```

### Server Action with Cache / Server Action พร้อมแคช

```typescript
// lib/actions/inventory.ts
import { cacheManager } from '@/lib/cache/cache-manager'
import { cacheInvalidation } from '@/lib/cache/invalidation'

export async function updateInventoryItem(id: number, data: UpdateItemInput) {
  const item = await prisma.inventoryItem.update({
    where: { id },
    data,
  })

  // Invalidate related caches / ยกเลิกแคชที่เกี่ยวข้อง
  await cacheInvalidation.invalidateOnUpdate('inventoryItem', id)

  return item
}
```

## Best Practices / แนวทางปฏิบัติ

1. **Choose Right TTL**: Balance freshness with performance
   - **เลือก TTL ที่เหมาะสม**: สมดุลระหว่างความสดและประสิทธิภาพ

2. **Use Tags**: Group related caches for easy invalidation
   - **ใช้แท็ก**: จัดกลุ่มแคชที่เกี่ยวข้องเพื่อยกเลิกง่าย

3. **Monitor Hit Rate**: Aim for >80% cache hit rate
   - **ติดตาม Hit Rate**: มุ่งเป้าไปที่ >80% cache hit rate

4. **Handle Failures**: Graceful degradation when cache fails
   - **จัดการความล้มเหลว**: ลดระดับอย่างสวยงามเมื่อแคชล้มเหลว

## Related Skills / Skills ที่เกี่ยวข้อง

- `performance-monitor` - Performance monitoring
- `query-optimizer` - Query optimization
- `local-storage` - Client-side caching
