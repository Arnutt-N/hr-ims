---
name: url-builder
description: URL and query string utilities for navigation and API calls in HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["url", "query string", "params", "search params", "url builder"]
  file_patterns: ["*url*", "lib/url*", "hooks/use-params*"]
  context: URL construction, query parameters, navigation
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# URL Builder

## Core Role

Handle URL construction and query string management for HR-IMS:
- Build URLs with query parameters
- Parse query strings
- Navigation with preserved filters
- API URL construction

---

## URL Builder Utilities

```typescript
// lib/url/builder.ts

interface QueryParams {
  [key: string]: string | number | boolean | undefined | null | string[]
}

// Build URL with query parameters
export function buildUrl(
  base: string,
  params?: QueryParams
): string {
  if (!params) return base

  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return

    if (Array.isArray(value)) {
      value.forEach(item => {
        searchParams.append(key, String(item))
      })
    } else {
      searchParams.set(key, String(value))
    }
  })

  const queryString = searchParams.toString()
  return queryString ? `${base}?${queryString}` : base
}

// Parse URL query parameters
export function parseQueryParams<T extends QueryParams = QueryParams>(
  urlOrSearch: string
): T {
  const search = urlOrSearch.includes('?')
    ? urlOrSearch.split('?')[1]
    : urlOrSearch

  const params: QueryParams = {}
  const searchParams = new URLSearchParams(search)

  searchParams.forEach((value, key) => {
    // Check if key already exists (array case)
    if (params[key] !== undefined) {
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value)
      } else {
        params[key] = [params[key] as string, value]
      }
    } else {
      params[key] = value
    }
  })

  return params as T
}

// Update query parameters
export function updateQueryParams(
  current: string,
  updates: QueryParams
): string {
  const params = parseQueryParams(current)

  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      delete params[key]
    } else {
      params[key] = value
    }
  })

  return buildUrl('', params).replace('?', '')
}

// Remove query parameters
export function removeQueryParam(
  current: string,
  keys: string[]
): string {
  const params = parseQueryParams(current)

  keys.forEach(key => {
    delete params[key]
  })

  return buildUrl('', params).replace('?', '')
}
```

---

## Typed Query String Parser

```typescript
// lib/url/typed-params.ts
import { z } from 'zod'

// Common pagination params
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
})

// Common sort params
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

// Inventory filter params
export const inventoryFilterSchema = z.object({
  search: z.string().optional(),
  category: z.coerce.number().int().optional(),
  warehouse: z.coerce.number().int().optional(),
  status: z.enum(['AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED']).optional(),
  minQuantity: z.coerce.number().optional(),
  maxQuantity: z.coerce.number().optional()
})

// Combined schema
export const inventoryQuerySchema = paginationSchema
  .merge(sortSchema)
  .merge(inventoryFilterSchema)

export type InventoryQueryParams = z.infer<typeof inventoryQuerySchema>

// Parse with schema
export function parseQueryWithSchema<T extends z.ZodSchema>(
  search: string,
  schema: T
): z.infer<T> {
  const rawParams = parseQueryParams(search)
  return schema.parse(rawParams)
}

// Safe parse with defaults
export function safeParseQueryWithSchema<T extends z.ZodSchema>(
  search: string,
  schema: T,
  defaultValue: z.infer<T>
): z.infer<T> {
  try {
    const rawParams = parseQueryParams(search)
    const result = schema.safeParse(rawParams)
    return result.success ? result.data : defaultValue
  } catch {
    return defaultValue
  }
}
```

---

## React Hook for Query Params

```typescript
// hooks/use-query-params.ts
'use client'

import { useCallback, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { buildUrl, parseQueryParams, QueryParams } from '@/lib/url/builder'

interface UseQueryParamsOptions {
  shallow?: boolean // Don't trigger server components
  scroll?: boolean
}

export function useQueryParams<T extends QueryParams = QueryParams>(
  options: UseQueryParamsOptions = {}
) {
  const { shallow = true, scroll = false } = options
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const params = useMemo(() => {
    const result: QueryParams = {}
    searchParams.forEach((value, key) => {
      if (result[key] !== undefined) {
        if (Array.isArray(result[key])) {
          (result[key] as string[]).push(value)
        } else {
          result[key] = [result[key] as string, value]
        }
      } else {
        result[key] = value
      }
    })
    return result as T
  }, [searchParams])

  const setParams = useCallback(
    (newParams: Partial<T> | ((prev: T) => Partial<T>)) => {
      const updated = typeof newParams === 'function'
        ? newParams(params)
        : newParams

      const merged = { ...params, ...updated }

      // Remove undefined/null values
      const filtered: QueryParams = {}
      Object.entries(merged).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          filtered[key] = value
        }
      })

      const url = buildUrl(pathname, filtered)

      if (shallow) {
        window.history.replaceState(null, '', url)
      } else {
        router.push(url, { scroll })
      }
    },
    [params, pathname, router, shallow, scroll]
  )

  const updateParam = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setParams({ [key]: value } as Partial<T>)
    },
    [setParams]
  )

  const removeParam = useCallback(
    (key: keyof T) => {
      const filtered = { ...params }
      delete filtered[key]
      const url = buildUrl(pathname, filtered)
      router.push(url, { scroll })
    },
    [params, pathname, router, scroll]
  )

  const clearParams = useCallback(() => {
    router.push(pathname, { scroll })
  }, [pathname, router, scroll])

  return {
    params,
    setParams,
    updateParam,
    removeParam,
    clearParams
  }
}

// Typed version
export function useTypedQueryParams<T extends z.ZodSchema>(
  schema: T,
  defaultValue: z.infer<T>,
  options?: UseQueryParamsOptions
) {
  const { params, setParams, updateParam, removeParam, clearParams } =
    useQueryParams<z.infer<T>>(options)

  const typedParams = useMemo(() => {
    const result = schema.safeParse(params)
    return result.success ? result.data : defaultValue
  }, [params, schema, defaultValue])

  return {
    params: typedParams,
    setParams,
    updateParam,
    removeParam,
    clearParams
  }
}
```

---

## Filter URL State

```typescript
// hooks/use-filter-state.ts
'use client'

import { useQueryParams } from './use-query-params'
import { useCallback } from 'react'

interface FilterState {
  search: string
  page: number
  limit: number
  sortBy: string
  sortOrder: 'asc' | 'desc'
  [key: string]: any
}

const defaultFilterState: FilterState = {
  search: '',
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
}

export function useFilterState<T extends FilterState = FilterState>(
  defaultValues?: Partial<T>
) {
  const defaults = { ...defaultFilterState, ...defaultValues } as T

  const { params, setParams, updateParam, clearParams } =
    useQueryParams<T>()

  // Ensure defaults are applied
  const state: T = {
    ...defaults,
    ...params
  } as T

  // Convert string page to number
  if (typeof state.page === 'string') {
    state.page = parseInt(state.page, 10) || 1
  }
  if (typeof state.limit === 'string') {
    state.limit = parseInt(state.limit, 10) || 20
  }

  const setSearch = useCallback(
    (search: string) => {
      setParams(prev => ({
        ...prev,
        search,
        page: 1 // Reset to first page on search
      }) as Partial<T>)
    },
    [setParams]
  )

  const setPage = useCallback(
    (page: number) => {
      updateParam('page' as keyof T, page as any)
    },
    [updateParam]
  )

  const setLimit = useCallback(
    (limit: number) => {
      setParams(prev => ({
        ...prev,
        limit,
        page: 1 // Reset to first page on limit change
      }) as Partial<T>)
    },
    [setParams]
  )

  const setSort = useCallback(
    (sortBy: string, sortOrder: 'asc' | 'desc' = 'asc') => {
      setParams({
        sortBy,
        sortOrder
      } as Partial<T>)
    },
    [setParams]
  )

  const setFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setParams(prev => ({
        ...prev,
        [key]: value,
        page: 1 // Reset to first page on filter change
      }) as Partial<T>)
    },
    [setParams]
  )

  const resetFilters = useCallback(() => {
    clearParams()
  }, [clearParams])

  const hasActiveFilters = Object.entries(state).some(([key, value]) => {
    if (key === 'page' || key === 'limit' || key === 'sortBy' || key === 'sortOrder') {
      return false
    }
    return value !== undefined && value !== '' && value !== defaults[key as keyof T]
  })

  return {
    filters: state,
    setSearch,
    setPage,
    setLimit,
    setSort,
    setFilter,
    resetFilters,
    hasActiveFilters
  }
}
```

---

## API URL Builder

```typescript
// lib/url/api-url.ts

const API_BASE = '/api'

interface ApiEndpoint {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
}

// API endpoints registry
export const apiEndpoints = {
  // Inventory
  inventory: {
    list: { path: '/inventory', method: 'GET' },
    get: (id: number) => ({ path: `/inventory/${id}`, method: 'GET' }),
    create: { path: '/inventory', method: 'POST' },
    update: (id: number) => ({ path: `/inventory/${id}`, method: 'PUT' }),
    delete: (id: number) => ({ path: `/inventory/${id}`, method: 'DELETE' }),
    bulkDelete: { path: '/inventory/bulk-delete', method: 'POST' }
  },

  // Requests
  requests: {
    list: { path: '/requests', method: 'GET' },
    get: (id: number) => ({ path: `/requests/${id}`, method: 'GET' }),
    create: { path: '/requests', method: 'POST' },
    approve: (id: number) => ({ path: `/requests/${id}/approve`, method: 'POST' }),
    reject: (id: number) => ({ path: `/requests/${id}/reject`, method: 'POST' })
  },

  // Users
  users: {
    list: { path: '/users', method: 'GET' },
    get: (id: number) => ({ path: `/users/${id}`, method: 'GET' }),
    update: (id: number) => ({ path: `/users/${id}`, method: 'PUT' }),
    delete: (id: number) => ({ path: `/users/${id}`, method: 'DELETE' })
  },

  // Warehouse
  warehouse: {
    list: { path: '/warehouse', method: 'GET' },
    stockLevels: (itemId: number) => ({
      path: `/inventory/${itemId}/stock`,
      method: 'GET'
    }),
    transfer: { path: '/warehouse/transfer', method: 'POST' }
  }
} as const

// Build full API URL
export function getApiUrl(
  endpoint: ApiEndpoint | { path: string; method: string },
  params?: QueryParams
): string {
  const url = buildUrl(`${API_BASE}${endpoint.path}`, params)
  return url
}

// Example usage
const listUrl = getApiUrl(apiEndpoints.inventory.list, { page: 1, limit: 20 })
// Result: '/api/inventory?page=1&limit=20'

const detailUrl = getApiUrl(apiEndpoints.inventory.get(123))
// Result: '/api/inventory/123'
```

---

## Breadcrumb URL Builder

```typescript
// lib/url/breadcrumbs.ts

interface Breadcrumb {
  label: string
  href: string
  isCurrent: boolean
}

export function buildBreadcrumbs(
  pathname: string,
  labels: Record<string, string> = {}
): Breadcrumb[] {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: Breadcrumb[] = []

  let currentPath = ''

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`

    // Try to get label from map, otherwise format segment
    const label = labels[currentPath] || formatSegment(segment)

    breadcrumbs.push({
      label,
      href: currentPath,
      isCurrent: index === segments.length - 1
    })
  })

  // Add home at the beginning
  breadcrumbs.unshift({
    label: 'หน้าแรก / Home',
    href: '/dashboard',
    isCurrent: false
  })

  return breadcrumbs
}

function formatSegment(segment: string): string {
  // Handle dynamic routes like [id]
  if (segment.startsWith('[') && segment.endsWith(']')) {
    return segment
  }

  // Convert kebab-case to Title Case
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Custom labels for routes
export const routeLabels: Record<string, string> = {
  '/dashboard': 'แดชบอร์ด / Dashboard',
  '/inventory': 'คลังสินค้า / Inventory',
  '/inventory/new': 'เพิ่มสินค้าใหม่ / New Item',
  '/requests': 'คำขอ / Requests',
  '/requests/new': 'สร้างคำขอ / New Request',
  '/users': 'ผู้ใช้ / Users',
  '/users/new': 'เพิ่มผู้ใช้ / New User',
  '/warehouse': 'คลัง / Warehouses',
  '/settings': 'ตั้งค่า / Settings',
  '/logs': 'ประวัติ / Audit Logs',
  '/reports': 'รายงาน / Reports',
  '/my-assets': 'ทรัพย์สินของฉัน / My Assets'
}
```

---

## Navigation Hook

```typescript
// hooks/use-navigation.ts
'use client'

import { useRouter, usePathname } from 'next/navigation'
import { buildUrl, QueryParams } from '@/lib/url/builder'

export function useNavigation() {
  const router = useRouter()
  const pathname = usePathname()

  const navigate = (
    path: string,
    params?: QueryParams,
    options?: { replace?: boolean; scroll?: boolean }
  ) => {
    const url = buildUrl(path, params)
    if (options?.replace) {
      router.replace(url, { scroll: options.scroll ?? true })
    } else {
      router.push(url, { scroll: options.scroll ?? true })
    }
  }

  const goBack = () => {
    router.back()
  }

  const refresh = () => {
    router.refresh()
  }

  const navigateWithParams = (params: QueryParams) => {
    const url = buildUrl(pathname, params)
    router.push(url)
  }

  const navigateToDetail = (basePath: string, id: number | string) => {
    router.push(`${basePath}/${id}`)
  }

  const navigateToEdit = (basePath: string, id: number | string) => {
    router.push(`${basePath}/${id}/edit`)
  }

  const navigateToNew = (basePath: string) => {
    router.push(`${basePath}/new`)
  }

  return {
    navigate,
    navigateWithParams,
    navigateToDetail,
    navigateToEdit,
    navigateToNew,
    goBack,
    refresh,
    pathname
  }
}
```

---

## Share URL Generator

```typescript
// lib/url/share.ts

export function getShareUrl(
  path: string,
  params?: QueryParams
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '')

  return buildUrl(`${baseUrl}${path}`, params)
}

// Generate public URL for QR code
export function getPublicItemUrl(code: string): string {
  return getShareUrl(`/public/item/${code}`)
}

// Generate request tracking URL
export function getRequestTrackingUrl(requestId: number, token: string): string {
  return getShareUrl(`/track/${requestId}`, { token })
}

// Copy share URL to clipboard
export async function copyShareUrl(
  path: string,
  params?: QueryParams
): Promise<boolean> {
  const url = getShareUrl(path, params)

  try {
    await navigator.clipboard.writeText(url)
    return true
  } catch {
    return false
  }
}
```

---

## Usage Examples

```typescript
// Example 1: Build URL with params
const url = buildUrl('/inventory', {
  page: 1,
  limit: 20,
  category: 5,
  status: 'AVAILABLE'
})
// Result: '/inventory?page=1&limit=20&category=5&status=AVAILABLE'

// Example 2: Use filter state hook
function InventoryList() {
  const { filters, setSearch, setPage, setFilter, resetFilters } =
    useFilterState({ category: undefined })

  return (
    <div>
      <Input
        value={filters.search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="ค้นหา..."
      />
      <Select
        value={filters.category}
        onChange={(v) => setFilter('category', v)}
      >
        {/* Options */}
      </Select>
      <Button onClick={resetFilters}>รีเซ็ต / Reset</Button>
    </div>
  )
}

// Example 3: Navigate with params
const { navigate } = useNavigation()

<Button onClick={() => navigate('/inventory', { category: 5, status: 'AVAILABLE' })}>
  ดูสินค้าที่มี / View Available Items
</Button>

// Example 4: Build API URL
const apiUrl = getApiUrl(apiEndpoints.inventory.list, { page: 1, limit: 50 })
fetch(apiUrl)
```

---

*Version: 1.0.0 | For HR-IMS Project*
