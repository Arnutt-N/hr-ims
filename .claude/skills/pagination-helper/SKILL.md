---
name: pagination-helper
description: Pagination utilities for lists, tables, and data fetching in HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["pagination", "paginate", "page", "limit", "offset", "cursor"]
  file_patterns: ["*pagination*", "lib/pagination/**", "components/pagination/**"]
  context: list views, data tables, infinite scroll, server-side pagination
mcp_servers:
  - sequential
personas:
  - backend
  - frontend
---

# Pagination Helper

## Core Role

Implement pagination for HR-IMS:
- Server-side pagination with Prisma
- Client-side pagination components
- Cursor-based pagination for large datasets
- Infinite scroll patterns

---

## Pagination Types

```yaml
offset_pagination:
  description: "Traditional page-based pagination"
  use_case: "Small to medium datasets, needs page numbers"
  params: "page, limit"
  pros: "Simple, supports jumping to any page"
  cons: "Performance degrades with large offsets"

cursor_pagination:
  description: "Keyset-based pagination"
  use_case: "Large datasets, infinite scroll, real-time data"
  params: "cursor, limit"
  pros: "Consistent performance, no duplicate/missing rows"
  cons: "No page numbers, can't jump to arbitrary pages"
```

---

## Server-Side Pagination

### Offset Pagination with Prisma

```typescript
// lib/pagination/index.ts
import prisma from '@/lib/prisma'

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginationResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export async function paginate<T>(
  model: any,
  params: PaginationParams,
  options?: {
    where?: any
    include?: any
    select?: any
    orderBy?: any
  }
): Promise<PaginationResult<T>> {
  const page = Math.max(1, params.page || 1)
  const limit = Math.min(100, Math.max(1, params.limit || 20))
  const skip = (page - 1) * limit

  const [data, total] = await Promise.all([
    model.findMany({
      where: options?.where,
      include: options?.include,
      select: options?.select,
      skip,
      take: limit,
      orderBy: options?.orderBy || { createdAt: 'desc' }
    }),
    model.count({ where: options?.where })
  ])

  const pages = Math.ceil(total / limit)

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1
    }
  }
}
```

### Usage in Server Actions

```typescript
// lib/actions/inventory.ts
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { paginate } from '@/lib/pagination'

interface InventoryFilters {
  search?: string
  status?: string
  categoryId?: number
  warehouseId?: number
}

export async function getInventoryItems(
  params: PaginationParams & InventoryFilters
) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const where: any = {}

  if (params.search) {
    where.OR = [
      { name: { contains: params.search } },
      { description: { contains: params.search } },
      { serialNumber: { contains: params.search } }
    ]
  }

  if (params.status) {
    where.status = params.status
  }

  if (params.categoryId) {
    where.categoryId = params.categoryId
  }

  if (params.warehouseId) {
    where.warehouseId = params.warehouseId
  }

  try {
    const result = await paginate(prisma.inventoryItem, params, {
      where,
      include: {
        category: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        stockLevels: {
          include: { warehouse: { select: { id: true, name: true } } }
        }
      },
      orderBy: params.sortBy
        ? { [params.sortBy]: params.sortOrder || 'asc' }
        : { name: 'asc' }
    })

    return { success: true, ...result }

  } catch (error) {
    console.error('Get inventory error:', error)
    return { error: 'Failed to fetch items', code: 'INTERNAL_ERROR' }
  }
}
```

### Cursor-Based Pagination

```typescript
// lib/pagination/cursor.ts

export interface CursorPaginationParams {
  cursor?: string
  limit?: number
}

export interface CursorPaginationResult<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}

export async function cursorPaginate<T extends { id: number }>(
  model: any,
  params: CursorPaginationParams,
  options?: {
    where?: any
    include?: any
    select?: any
    orderBy?: any
    cursorField?: string
  }
): Promise<CursorPaginationResult<T>> {
  const limit = Math.min(100, Math.max(1, params.limit || 20))
  const cursorField = options?.cursorField || 'id'

  const data = await model.findMany({
    where: options?.where,
    include: options?.include,
    select: options?.select,
    take: limit + 1, // Take one extra to check if there's more
    ...(params.cursor && {
      cursor: { [cursorField]: params.cursor },
      skip: 1
    }),
    orderBy: options?.orderBy || { [cursorField]: 'desc' }
  })

  const hasMore = data.length > limit
  const items = hasMore ? data.slice(0, -1) : data
  const nextCursor = hasMore
    ? String(items[items.length - 1]?.[cursorField])
    : null

  return {
    data: items,
    nextCursor,
    hasMore
  }
}

// Usage
export async function getInfiniteInventory(cursor?: string) {
  return cursorPaginate(prisma.inventoryItem, { cursor, limit: 20 }, {
    where: { status: 'ACTIVE' },
    include: { category: true }
  })
}
```

---

## Frontend Components

### Pagination Component

```typescript
// components/ui/pagination.tsx
'use client'

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  showFirstLast?: boolean
  maxVisible?: number
  className?: string
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  showFirstLast = true,
  maxVisible = 5,
  className
}: PaginationProps) {
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages: (number | string)[] = []
    const half = Math.floor(maxVisible / 2)

    if (page <= half + 1) {
      // Near the start
      for (let i = 1; i <= maxVisible - 1; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(totalPages)
    } else if (page >= totalPages - half) {
      // Near the end
      pages.push(1)
      pages.push('...')
      for (let i = totalPages - maxVisible + 2; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Middle
      pages.push(1)
      pages.push('...')
      for (let i = page - 1; i <= page + 1; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(totalPages)
    }

    return pages
  }

  if (totalPages <= 1) return null

  return (
    <nav className={cn('flex items-center justify-center gap-1', className)}>
      {showFirstLast && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
      )}

      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {getPageNumbers().map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">
            ...
          </span>
        ) : (
          <Button
            key={p}
            variant={page === p ? 'default' : 'outline'}
            size="icon"
            onClick={() => onPageChange(p as number)}
            aria-label={`Page ${p}`}
            aria-current={page === p ? 'page' : undefined}
          >
            {p}
          </Button>
        )
      )}

      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {showFirstLast && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      )}
    </nav>
  )
}
```

### Page Size Selector

```typescript
// components/ui/page-size-selector.tsx
'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

interface PageSizeSelectorProps {
  value: number
  options?: number[]
  onChange: (size: number) => void
}

export function PageSizeSelector({
  value,
  options = [10, 20, 50, 100],
  onChange
}: PageSizeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">แสดง / Show:</span>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-sm text-muted-foreground">รายการ / items</span>
    </div>
  )
}
```

### Pagination Info

```typescript
// components/ui/pagination-info.tsx
interface PaginationInfoProps {
  page: number
  limit: number
  total: number
}

export function PaginationInfo({ page, limit, total }: PaginationInfoProps) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  return (
    <p className="text-sm text-muted-foreground">
      แสดง {start.toLocaleString()}-{end.toLocaleString()} จาก {total.toLocaleString()} รายการ
      <span className="hidden sm:inline"> / Showing {start}-{end} of {total}</span>
    </p>
  )
}
```

---

## Hook for URL State

```typescript
// hooks/use-pagination.ts
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

interface UsePaginationOptions {
  defaultPage?: number
  defaultLimit?: number
}

export function usePagination(options: UsePaginationOptions = {}) {
  const { defaultPage = 1, defaultLimit = 20 } = options
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const page = Number(searchParams.get('page')) || defaultPage
  const limit = Number(searchParams.get('limit')) || defaultLimit

  const setPage = useCallback((newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [router, searchParams, pathname])

  const setLimit = useCallback((newLimit: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('limit', String(newLimit))
    params.set('page', '1') // Reset to first page
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [router, searchParams, pathname])

  const reset = useCallback(() => {
    router.push(pathname, { scroll: false })
  }, [router, pathname])

  return {
    page,
    limit,
    setPage,
    setLimit,
    reset,
    offset: (page - 1) * limit
  }
}
```

---

## Infinite Scroll Hook

```typescript
// hooks/use-infinite-scroll.ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseInfiniteScrollOptions<T> {
  fetchFn: (cursor?: string) => Promise<{
    data: T[]
    nextCursor: string | null
    hasMore: boolean
  }>
  threshold?: number
}

export function useInfiniteScroll<T extends { id: number | string }>({
  fetchFn,
  threshold = 200
}: UseInfiniteScrollOptions<T>) {
  const [data, setData] = useState<T[]>([])
  const [cursor, setCursor] = useState<string | undefined>()
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    setError(null)

    try {
      const result = await fetchFn(cursor)

      setData((prev) => {
        // Deduplicate by id
        const existingIds = new Set(prev.map((item) => item.id))
        const newItems = result.data.filter((item) => !existingIds.has(item.id))
        return [...prev, ...newItems]
      })

      setCursor(result.nextCursor || undefined)
      setHasMore(result.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load'))
    } finally {
      setLoading(false)
    }
  }, [fetchFn, cursor, loading, hasMore])

  const refresh = useCallback(() => {
    setData([])
    setCursor(undefined)
    setHasMore(true)
    setLoading(false)
    setError(null)
  }, [])

  // Initial load
  useEffect(() => {
    if (data.length === 0 && hasMore) {
      loadMore()
    }
  }, [])

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      { rootMargin: `${threshold}px` }
    )

    observerRef.current.observe(loadMoreRef.current)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [hasMore, loading, loadMore, threshold])

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    loadMoreRef
  }
}

// Usage in component
function InfiniteItemList() {
  const { data, loading, hasMore, loadMoreRef } = useInfiniteScroll({
    fetchFn: (cursor) => getInfiniteInventory(cursor),
    threshold: 200
  })

  return (
    <div>
      {data.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}

      <div ref={loadMoreRef} className="h-10">
        {loading && <LoadingSpinner />}
      </div>

      {!hasMore && data.length > 0 && (
        <p className="text-center text-muted-foreground">
          ไม่มีข้อมูลเพิ่มเติม / No more items
        </p>
      )}
    </div>
  )
}
```

---

## Complete List Page Example

```typescript
// app/(dashboard)/inventory/page.tsx
import { getInventoryItems } from '@/lib/actions/inventory'
import { Pagination } from '@/components/ui/pagination'
import { PageSizeSelector } from '@/components/ui/page-size-selector'
import { PaginationInfo } from '@/components/ui/pagination-info'
import { InventoryList } from '@/components/inventory/inventory-list'

interface PageProps {
  searchParams: {
    page?: string
    limit?: string
    search?: string
    status?: string
  }
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const page = Number(searchParams.page) || 1
  const limit = Number(searchParams.limit) || 20

  const result = await getInventoryItems({
    page,
    limit,
    search: searchParams.search,
    status: searchParams.status
  })

  if (!result.success) {
    return <div>Error: {result.error}</div>
  }

  const { data, pagination } = result

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PaginationInfo {...pagination} />
        <PageSizeSelector
          value={limit}
          onChange={(size) => {
            // Update URL with new limit
          }}
        />
      </div>

      <InventoryList items={data} />

      <Pagination
        page={pagination.page}
        totalPages={pagination.pages}
        onPageChange={(p) => {
          // Update URL with new page
        }}
      />
    </div>
  )
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
