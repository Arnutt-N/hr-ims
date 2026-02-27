---
name: api-client
description: API client utilities for data fetching in HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["api client", "fetch", "http client", "request", "api call"]
  file_patterns: ["*api*", "lib/api*", "lib/client*"]
  context: API calls, HTTP requests, data fetching
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# API Client

## Core Role

Handle API communication for HR-IMS:
- HTTP client wrapper
- Request/response interceptors
- Error handling
- Retry logic
- TypeScript integration

---

## Base API Client

```typescript
// lib/api/client.ts

interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
  timeout?: number
}

class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data: any
  ) {
    super(`API Error: ${status} ${statusText}`)
    this.name = 'ApiError'
  }
}

const DEFAULT_TIMEOUT = 30000
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

async function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), ms)
  })
}

export async function apiClient<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const {
    params,
    timeout = DEFAULT_TIMEOUT,
    headers: customHeaders,
    ...init
  } = config

  // Build URL with params
  const url = new URL(`${BASE_URL}${endpoint}`, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value))
      }
    })
  }

  // Default headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders
  }

  // Add auth token if available
  const token = localStorage.getItem('token')
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const request = fetch(url.toString(), {
    ...init,
    headers
  })

  const response = await Promise.race([
    request,
    timeoutPromise(timeout)
  ])

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new ApiError(response.status, response.statusText, data)
  }

  // Handle empty response
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

// Convenience methods
export const api = {
  get: <T>(endpoint: string, config?: RequestConfig) =>
    apiClient<T>(endpoint, { ...config, method: 'GET' }),

  post: <T>(endpoint: string, body?: any, config?: RequestConfig) =>
    apiClient<T>(endpoint, {
      ...config,
      method: 'POST',
      body: JSON.stringify(body)
    }),

  put: <T>(endpoint: string, body?: any, config?: RequestConfig) =>
    apiClient<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(body)
    }),

  patch: <T>(endpoint: string, body?: any, config?: RequestConfig) =>
    apiClient<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: JSON.stringify(body)
    }),

  delete: <T>(endpoint: string, config?: RequestConfig) =>
    apiClient<T>(endpoint, { ...config, method: 'DELETE' })
}
```

---

## React Query Integration

```typescript
// lib/api/query-client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof ApiError && error.status < 500) {
          return false
        }
        return failureCount < 3
      },
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: false
    }
  }
})

// Query keys factory
export const queryKeys = {
  // Inventory
  inventory: {
    all: ['inventory'] as const,
    lists: () => [...queryKeys.inventory.all, 'list'] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.inventory.lists(), filters] as const,
    details: () => [...queryKeys.inventory.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.inventory.details(), id] as const
  },

  // Requests
  requests: {
    all: ['requests'] as const,
    lists: () => [...queryKeys.requests.all, 'list'] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.requests.lists(), filters] as const,
    details: () => [...queryKeys.requests.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.requests.details(), id] as const
  },

  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.users.details(), id] as const,
    current: () => [...queryKeys.users.all, 'current'] as const
  },

  // Warehouses
  warehouses: {
    all: ['warehouses'] as const,
    lists: () => [...queryKeys.warehouses.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.warehouses.all, 'detail', id] as const
  }
}
```

---

## Data Fetching Hooks

```typescript
// hooks/use-api.ts
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/query-client'

// Generic fetch hook
export function useApiQuery<T>(
  key: readonly unknown[],
  endpoint: string,
  params?: Record<string, any>,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: key,
    queryFn: () => api.get<T>(endpoint, { params }),
    ...options
  })
}

// Generic mutation hook
export function useApiMutation<T, TData = unknown>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
  options?: {
    onSuccess?: (data: T) => void
    onError?: (error: ApiError) => void
    invalidateKeys?: readonly unknown[][]
  }
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body?: TData) => {
      switch (method) {
        case 'POST':
          return api.post<T>(endpoint, body)
        case 'PUT':
          return api.put<T>(endpoint, body)
        case 'PATCH':
          return api.patch<T>(endpoint, body)
        case 'DELETE':
          return api.delete<T>(endpoint)
        default:
          return api.post<T>(endpoint, body)
      }
    },
    onSuccess: (data) => {
      options?.onSuccess?.(data)
      if (options?.invalidateKeys) {
        options.invalidateKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key })
        })
      }
    },
    onError: options?.onError
  })
}

// Inventory hooks
export function useInventoryItems(filters?: Record<string, any>) {
  return useApiQuery(
    queryKeys.inventory.list(filters || {}),
    '/api/inventory',
    filters
  )
}

export function useInventoryItem(id: number) {
  return useApiQuery(
    queryKeys.inventory.detail(id),
    `/api/inventory/${id}`,
    undefined,
    { enabled: !!id }
  )
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateItemInput) =>
      api.post('/api/inventory', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() })
    }
  })
}

export function useUpdateInventoryItem(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateItemInput) =>
      api.put(`/api/inventory/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() })
    }
  })
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/inventory/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() })
    }
  })
}

// Request hooks
export function useRequests(filters?: Record<string, any>) {
  return useApiQuery(
    queryKeys.requests.list(filters || {}),
    '/api/requests',
    filters
  )
}

export function useRequest(id: number) {
  return useApiQuery(
    queryKeys.requests.detail(id),
    `/api/requests/${id}`,
    undefined,
    { enabled: !!id }
  )
}

export function useApproveRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      api.post(`/api/requests/${id}/approve`, { notes }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.requests.detail(variables.id)
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.lists() })
    }
  })
}

// User hooks
export function useUsers(filters?: Record<string, any>) {
  return useApiQuery(
    queryKeys.users.list(filters || {}),
    '/api/users',
    filters
  )
}

export function useUser(id: number) {
  return useApiQuery(
    queryKeys.users.detail(id),
    `/api/users/${id}`,
    undefined,
    { enabled: !!id }
  )
}

export function useCurrentUser() {
  return useApiQuery(
    queryKeys.users.current(),
    '/api/users/me'
  )
}
```

---

## Prefetch Utilities

```typescript
// lib/api/prefetch.ts
import { queryClient, queryKeys } from './query-client'
import { api } from './client'

export async function prefetchInventoryItem(id: number) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.inventory.detail(id),
    queryFn: () => api.get(`/api/inventory/${id}`)
  })
}

export async function prefetchInventoryList(filters?: Record<string, any>) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.inventory.list(filters || {}),
    queryFn: () => api.get('/api/inventory', filters)
  })
}

export async function prefetchRequest(id: number) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.requests.detail(id),
    queryFn: () => api.get(`/api/requests/${id}`)
  })
}

// Prefetch on link hover
export function usePrefetchOnHover() {
  return {
    onMouseEnter: (action: () => Promise<void>) => {
      action()
    }
  }
}
```

---

## Optimistic Updates

```typescript
// hooks/use-optimistic-update.ts
'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

export function useOptimisticUpdate<T>(
  queryKey: readonly unknown[],
  updateFn: (old: T | undefined, newValue: Partial<T>) => T | undefined
) {
  const queryClient = useQueryClient()

  const performOptimisticUpdate = useCallback(
    (newValue: Partial<T>) => {
      queryClient.setQueryData<T>(queryKey, (old) =>
        updateFn(old, newValue)
      )
    },
    [queryClient, queryKey, updateFn]
  )

  const rollback = useCallback(
    (previousValue: T | undefined) => {
      queryClient.setQueryData(queryKey, previousValue)
    },
    [queryClient, queryKey]
  )

  return { performOptimisticUpdate, rollback }
}

// Example usage
function useUpdateItemOptimistic(id: number) {
  const queryClient = useQueryClient()
  const queryKey = queryKeys.inventory.detail(id)

  return useMutation({
    mutationFn: (data: Partial<InventoryItem>) =>
      api.put(`/api/inventory/${id}`, data),

    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey })

      // Snapshot previous value
      const previousItem = queryClient.getQueryData<InventoryItem>(queryKey)

      // Optimistically update
      queryClient.setQueryData<InventoryItem>(queryKey, (old) =>
        old ? { ...old, ...newData } : undefined
      )

      return { previousItem }
    },

    onError: (err, newData, context) => {
      // Rollback on error
      if (context?.previousItem) {
        queryClient.setQueryData(queryKey, context.previousItem)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    }
  })
}
```

---

## Request Interceptor

```typescript
// lib/api/interceptor.ts
import { toast } from 'sonner'

type Interceptor = (
  request: RequestInit
) => RequestInit | Promise<RequestInit>

type ResponseInterceptor = (
  response: Response,
  data: any
) => any | Promise<any>

type ErrorInterceptor = (
  error: any
) => void | Promise<void>

class ApiInterceptor {
  private requestInterceptors: Interceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []
  private errorInterceptors: ErrorInterceptor[] = []

  addRequestInterceptor(interceptor: Interceptor) {
    this.requestInterceptors.push(interceptor)
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor)
      if (index > -1) this.requestInterceptors.splice(index, 1)
    }
  }

  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor)
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor)
      if (index > -1) this.responseInterceptors.splice(index, 1)
    }
  }

  addErrorInterceptor(interceptor: ErrorInterceptor) {
    this.errorInterceptors.push(interceptor)
    return () => {
      const index = this.errorInterceptors.indexOf(interceptor)
      if (index > -1) this.errorInterceptors.splice(index, 1)
    }
  }

  async applyRequestInterceptors(config: RequestInit): Promise<RequestInit> {
    let result = config
    for (const interceptor of this.requestInterceptors) {
      result = await interceptor(result)
    }
    return result
  }

  async applyResponseInterceptors(response: Response, data: any): Promise<any> {
    let result = data
    for (const interceptor of this.responseInterceptors) {
      result = await interceptor(response, result)
    }
    return result
  }

  async applyErrorInterceptors(error: any): Promise<void> {
    for (const interceptor of this.errorInterceptors) {
      await interceptor(error)
    }
  }
}

export const apiInterceptor = new ApiInterceptor()

// Add default error interceptor
apiInterceptor.addErrorInterceptor((error) => {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        toast.error('Session expired. Please login again.')
        window.location.href = '/login'
        break
      case 403:
        toast.error('Access denied')
        break
      case 404:
        toast.error('Resource not found')
        break
      case 500:
        toast.error('Server error. Please try again later.')
        break
      default:
        toast.error(error.data?.message || 'An error occurred')
    }
  }
})
```

---

## Polling Hook

```typescript
// hooks/use-polling.ts
'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

interface UsePollingOptions {
  interval: number // in milliseconds
  enabled?: boolean
  queryKey: readonly unknown[]
  queryFn: () => Promise<any>
  onUpdate?: (data: any) => void
}

export function usePolling({
  interval,
  enabled = true,
  queryKey,
  queryFn,
  onUpdate
}: UsePollingOptions) {
  const queryClient = useQueryClient()
  const intervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!enabled) return

    intervalRef.current = setInterval(async () => {
      const data = await queryFn()
      queryClient.setQueryData(queryKey, data)
      onUpdate?.(data)
    }, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, interval, queryKey, queryFn, onUpdate, queryClient])
}

// Usage
usePolling({
  interval: 30000, // 30 seconds
  queryKey: queryKeys.requests.lists(),
  queryFn: () => api.get('/api/requests'),
  onUpdate: (data) => {
    if (data.some(r => r.status === 'PENDING')) {
      toast.info('You have pending requests')
    }
  }
})
```

---

## Usage Examples

```typescript
// Example 1: Fetch inventory list
function InventoryList() {
  const { data, isLoading, error } = useInventoryItems({
    category: 5,
    status: 'AVAILABLE'
  })

  if (isLoading) return <Loading />
  if (error) return <Error error={error} />

  return (
    <ul>
      {data?.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  )
}

// Example 2: Create item mutation
function CreateItemForm() {
  const mutation = useCreateInventoryItem()

  const handleSubmit = (data: CreateItemInput) => {
    mutation.mutate(data, {
      onSuccess: () => {
        toast.success('Item created successfully')
        router.push('/inventory')
      },
      onError: (error) => {
        toast.error(`Failed to create item: ${error.message}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <Button
        type="submit"
        loading={mutation.isPending}
      >
        Create Item
      </Button>
    </form>
  )
}

// Example 3: Optimistic update
function ItemName({ item }: { item: InventoryItem }) {
  const mutation = useUpdateItemOptimistic(item.id)

  return (
    <input
      defaultValue={item.name}
      onBlur={(e) => {
        mutation.mutate({ name: e.target.value })
      }}
    />
  )
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
