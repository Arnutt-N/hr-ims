---
name: search-helper
description: Advanced search and filtering for inventory, users, and requests
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["search", "filter", "query", "find", "lookup"]
  file_patterns: ["*search*", "components/search/**", "lib/search/**"]
  context: search, filtering, data retrieval
mcp_servers:
  - sequential
personas:
  - backend
  - frontend
---

# Search Helper

## Core Role

Implement advanced search functionality for HR-IMS:
- Full-text search across entities
- Filter combinations
- Sort and pagination
- Search suggestions

---

## Search Architecture

```yaml
entities:
  inventory:
    fields: [name, description, serialNumber, category]
    filters: [status, category, warehouse, price_range]
    sort: [name, created_at, quantity, price]

  users:
    fields: [name, email, department, position]
    filters: [status, role, department]
    sort: [name, email, created_at]

  requests:
    fields: [reason, notes]
    filters: [status, type, requester, date_range]
    sort: [created_at, status, type]
```

---

## Server Actions

### Unified Search

```typescript
// lib/actions/search.ts
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().min(1),
  entities: z.array(z.enum(['inventory', 'users', 'requests'])).default(['inventory']),
  limit: z.number().min(1).max(50).default(10)
})

interface SearchResult {
  inventory?: any[]
  users?: any[]
  requests?: any[]
}

export async function globalSearch(input: z.infer<typeof searchSchema>): Promise<{
  success: boolean
  data?: SearchResult
  error?: string
}> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  const validated = searchSchema.safeParse(input)
  if (!validated.success) {
    return { success: false, error: 'Invalid input' }
  }

  const { query, entities, limit } = validated.data
  const searchTerm = query.trim()
  const results: SearchResult = {}

  try {
    // Inventory search
    if (entities.includes('inventory')) {
      results.inventory = await prisma.inventoryItem.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm } },
            { description: { contains: searchTerm } },
            { serialNumber: { contains: searchTerm } }
          ]
        },
        include: {
          category: { select: { name: true } },
          warehouse: { select: { name: true } },
          stockLevels: true
        },
        take: limit,
        orderBy: { name: 'asc' }
      })
    }

    // User search (admin only)
    if (entities.includes('users')) {
      const isAdmin = await hasAnyRole(parseInt(session.user.id), ['admin', 'superadmin'])
      if (isAdmin) {
        results.users = await prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: searchTerm } },
              { email: { contains: searchTerm } },
              { department: { contains: searchTerm } }
            ]
          },
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            status: true,
            userRoles: { include: { role: { select: { slug: true } } } }
          },
          take: limit,
          orderBy: { name: 'asc' }
        })
      }
    }

    // Request search
    if (entities.includes('requests')) {
      results.requests = await prisma.request.findMany({
        where: {
          OR: [
            { reason: { contains: searchTerm } },
            { notes: { contains: searchTerm } }
          ]
        },
        include: {
          requester: { select: { id: true, name: true } },
          items: {
            include: {
              item: { select: { id: true, name: true } }
            }
          }
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    }

    return { success: true, data: results }

  } catch (error) {
    console.error('Search error:', error)
    return { success: false, error: 'Search failed' }
  }
}
```

### Inventory Search with Filters

```typescript
const inventoryFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DISPOSED']).optional(),
  categoryId: z.number().optional(),
  warehouseId: z.number().optional(),
  minQuantity: z.number().optional(),
  maxQuantity: z.number().optional(),
  lowStock: z.boolean().optional(),
  sortBy: z.enum(['name', 'quantity', 'createdAt', 'updatedAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
})

export async function searchInventory(input: z.infer<typeof inventoryFilterSchema>) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const validated = inventoryFilterSchema.safeParse(input)
  if (!validated.success) {
    return { error: 'Invalid input', code: 'VALIDATION_ERROR' }
  }

  const { search, status, categoryId, warehouseId, minQuantity, maxQuantity, lowStock, sortBy, sortOrder, page, limit } = validated.data
  const skip = (page - 1) * limit

  try {
    const where: any = {
      ...(status && { status }),
      ...(categoryId && { categoryId }),
      ...(warehouseId && { warehouseId }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { description: { contains: search } },
          { serialNumber: { contains: search } }
        ]
      })
    }

    // Low stock filter
    if (lowStock) {
      where.stockLevels = {
        some: {
          quantity: { lte: prisma.stockLevel.fields.minQuantity }
        }
      }
    }

    // Quantity range filter
    if (minQuantity !== undefined || maxQuantity !== undefined) {
      where.quantity = {
        ...(minQuantity !== undefined && { gte: minQuantity }),
        ...(maxQuantity !== undefined && { lte: maxQuantity })
      }
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          warehouse: true,
          stockLevels: {
            include: { warehouse: true }
          },
          _count: {
            select: { requestItems: true }
          }
        },
        orderBy: { [sortBy]: sortOrder }
      }),
      prisma.inventoryItem.count({ where })
    ])

    return {
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    }

  } catch (error) {
    console.error('Inventory search error:', error)
    return { error: 'Search failed', code: 'INTERNAL_ERROR' }
  }
}
```

### Search Suggestions

```typescript
export async function getSearchSuggestions(query: string, type: 'inventory' | 'users' = 'inventory') {
  if (query.length < 2) {
    return { success: true, data: [] }
  }

  try {
    let suggestions: string[] = []

    if (type === 'inventory') {
      const items = await prisma.inventoryItem.findMany({
        where: {
          OR: [
            { name: { startsWith: query } },
            { serialNumber: { startsWith: query } }
          ]
        },
        select: { name: true, serialNumber: true },
        take: 10
      })

      suggestions = items.flatMap(item => [item.name, item.serialNumber].filter(Boolean)) as string[]
    }

    return {
      success: true,
      data: [...new Set(suggestions)].slice(0, 10)
    }

  } catch (error) {
    return { success: true, data: [] }
  }
}
```

---

## Frontend Components

### Global Search Component

```typescript
// components/search/global-search.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Package, User, FileText, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { globalSearch } from '@/lib/actions/search'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: number
  type: 'inventory' | 'user' | 'request'
  title: string
  subtitle?: string
  href: string
}

export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        setLoading(true)
        const result = await globalSearch({
          query,
          entities: ['inventory', 'users', 'requests'],
          limit: 5
        })

        if (result.success && result.data) {
          const formatted: SearchResult[] = []

          result.data.inventory?.forEach(item => {
            formatted.push({
              id: item.id,
              type: 'inventory',
              title: item.name,
              subtitle: item.serialNumber || item.category?.name,
              href: `/inventory/${item.id}`
            })
          })

          result.data.users?.forEach(user => {
            formatted.push({
              id: user.id,
              type: 'user',
              title: user.name,
              subtitle: user.email,
              href: `/users/${user.id}`
            })
          })

          result.data.requests?.forEach(request => {
            formatted.push({
              id: request.id,
              type: 'request',
              title: `Request #${request.id}`,
              subtitle: request.reason?.slice(0, 50),
              href: `/requests/${request.id}`
            })
          })

          setResults(formatted)
        }
        setLoading(false)
        setIsOpen(true)
      } else {
        setResults([])
        setIsOpen(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (result: SearchResult) => {
    router.push(result.href)
    setIsOpen(false)
    setQuery('')
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'inventory': return <Package className="w-4 h-4" />
      case 'user': return <User className="w-4 h-4" />
      case 'request': return <FileText className="w-4 h-4" />
      default: return null
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search inventory, users, requests..."
          className="pl-10"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-80 overflow-auto">
          {results.map((result, i) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => handleSelect(result)}
              className={cn(
                "w-full px-4 py-3 flex items-center gap-3 hover:bg-muted text-left",
                i > 0 && "border-t"
              )}
            >
              <div className="text-muted-foreground">
                {getIcon(result.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{result.title}</p>
                {result.subtitle && (
                  <p className="text-sm text-muted-foreground truncate">
                    {result.subtitle}
                  </p>
                )}
              </div>
              <span className="text-xs text-muted-foreground capitalize">
                {result.type}
              </span>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 p-4 text-center text-muted-foreground">
          No results found for "{query}"
        </div>
      )}
    </div>
  )
}
```

### Filter Panel Component

```typescript
// components/search/filter-panel.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { X, Filter } from 'lucide-react'

interface FilterConfig {
  key: string
  label: string
  type: 'select' | 'input' | 'date' | 'number'
  options?: { value: string; label: string }[]
}

interface FilterPanelProps {
  filters: FilterConfig[]
  values: Record<string, any>
  onChange: (values: Record<string, any>) => void
  onReset: () => void
}

export function FilterPanel({ filters, values, onChange, onReset }: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const activeCount = Object.values(values).filter(v => v !== undefined && v !== '').length

  const handleChange = (key: string, value: any) => {
    onChange({ ...values, [key]: value })
  }

  const handleClear = (key: string) => {
    const newValues = { ...values }
    delete newValues[key]
    onChange(newValues)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeCount > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
              {activeCount}
            </span>
          )}
        </Button>

        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-muted-foreground"
          >
            Clear all
          </Button>
        )}
      </div>

      {isExpanded && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 p-4 bg-muted/50 rounded-lg">
          {filters.map(filter => (
            <div key={filter.key} className="space-y-1">
              <label className="text-sm font-medium">{filter.label}</label>

              {filter.type === 'select' && (
                <Select
                  value={values[filter.key] || ''}
                  onValueChange={(v) => handleChange(filter.key, v || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`All ${filter.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {filter.options?.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {filter.type === 'input' && (
                <div className="relative">
                  <Input
                    value={values[filter.key] || ''}
                    onChange={(e) => handleChange(filter.key, e.target.value || undefined)}
                    placeholder={`Enter ${filter.label.toLowerCase()}`}
                  />
                  {values[filter.key] && (
                    <button
                      onClick={() => handleClear(filter.key)}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              )}

              {filter.type === 'number' && (
                <Input
                  type="number"
                  value={values[filter.key] || ''}
                  onChange={(e) => handleChange(filter.key, e.target.value ? Number(e.target.value) : undefined)}
                  placeholder={`Enter ${filter.label.toLowerCase()}`}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## URL State Management

```typescript
// hooks/use-search-params.ts
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export function useSearchParamsState<T extends Record<string, any>>() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const setParams = useCallback((params: Partial<T>) => {
    const current = new URLSearchParams(searchParams.toString())

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === null) {
        current.delete(key)
      } else {
        current.set(key, String(value))
      }
    })

    router.push(`?${current.toString()}`, { scroll: false })
  }, [router, searchParams])

  const getParams = useCallback((): T => {
    const params: Record<string, any> = {}
    searchParams.forEach((value, key) => {
      // Convert to appropriate type
      if (value === 'true') params[key] = true
      else if (value === 'false') params[key] = false
      else if (!isNaN(Number(value))) params[key] = Number(value)
      else params[key] = value
    })
    return params as T
  }, [searchParams])

  const resetParams = useCallback(() => {
    router.push(window.location.pathname, { scroll: false })
  }, [router])

  return { getParams, setParams, resetParams }
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
