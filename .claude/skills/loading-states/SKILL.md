---
name: loading-states
description: Loading skeletons, spinners, and loading state components for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["loading", "skeleton", "spinner", "loader", "suspense", "loading state"]
  file_patterns: ["*loading*", "*skeleton*", "components/loading/**"]
  context: loading indicators, skeleton screens, async states
mcp_servers:
  - sequential
personas:
  - frontend
---

# Loading States

## Core Role

Implement loading states for HR-IMS:
- Skeleton components for content loading
- Spinner components for async operations
- Loading overlays and progress indicators
- Suspense boundaries

---

## Skeleton Components

### Base Skeleton

```typescript
// components/ui/skeleton.tsx
import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className
      )}
      {...props}
    />
  )
}
```

### Table Skeleton

```typescript
// components/skeletons/table-skeleton.tsx
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'

interface TableSkeletonProps {
  rows?: number
  columns?: number
}

export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <Table>
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <TableCell key={colIndex}>
                <Skeleton className="h-4 w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

### Card Skeleton

```typescript
// components/skeletons/card-skeleton.tsx
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function CardSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  )
}

export function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}
```

### Form Skeleton

```typescript
// components/skeletons/form-skeleton.tsx
import { Skeleton } from '@/components/ui/skeleton'

interface FormSkeletonProps {
  fields?: number
  withButtons?: boolean
}

export function FormSkeleton({ fields = 4, withButtons = true }: FormSkeletonProps) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}

      {withButtons && (
        <div className="flex gap-3 pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      )}
    </div>
  )
}
```

### List Skeleton

```typescript
// components/skeletons/list-skeleton.tsx
import { Skeleton } from '@/components/ui/skeleton'

interface ListSkeletonProps {
  items?: number
  withAvatar?: boolean
}

export function ListSkeleton({ items = 5, withAvatar = false }: ListSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          {withAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

### Dashboard Skeleton

```typescript
// components/skeletons/dashboard-skeleton.tsx
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Spinner Components

### Spinner Variants

```typescript
// components/ui/spinner.tsx
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin text-primary', sizeClasses[size], className)}
    />
  )
}
```

### Loading Overlay

```typescript
// components/ui/loading-overlay.tsx
'use client'

import { Spinner } from './spinner'
import { cn } from '@/lib/utils'

interface LoadingOverlayProps {
  show: boolean
  message?: string
  className?: string
}

export function LoadingOverlay({ show, message, className }: LoadingOverlayProps) {
  if (!show) return null

  return (
    <div
      className={cn(
        'absolute inset-0 z-50 flex flex-col items-center justify-center',
        'bg-background/80 backdrop-blur-sm',
        className
      )}
    >
      <Spinner size="lg" />
      {message && (
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  )
}
```

### Page Loading

```typescript
// components/ui/page-loading.tsx
import { Spinner } from './spinner'

interface PageLoadingProps {
  message?: string
}

export function PageLoading({ message = 'กำลังโหลด... / Loading...' }: PageLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <Spinner size="xl" />
      <p className="mt-4 text-muted-foreground">{message}</p>
    </div>
  )
}
```

### Button Loading

```typescript
// components/ui/button-loading.tsx
import { Button, ButtonProps } from '@/components/ui/button'
import { Spinner } from './spinner'
import { cn } from '@/lib/utils'

interface ButtonLoadingProps extends ButtonProps {
  loading?: boolean
  loadingText?: string
}

export function ButtonLoading({
  loading,
  loadingText,
  children,
  disabled,
  className,
  ...props
}: ButtonLoadingProps) {
  return (
    <Button
      disabled={disabled || loading}
      className={cn(loading && 'cursor-not-allowed', className)}
      {...props}
    >
      {loading && <Spinner size="sm" className="mr-2" />}
      {loading ? (loadingText || children) : children}
    </Button>
  )
}
```

---

## React Query Integration

### Query Loading Wrapper

```typescript
// components/query/query-loading.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { PageLoading } from '@/components/ui/page-loading'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

interface QueryLoadingProps<T> {
  queryKey: unknown[]
  queryFn: () => Promise<T>
  children: (data: T) => React.ReactNode
  loadingComponent?: React.ReactNode
  errorComponent?: (error: Error) => React.ReactNode
}

export function QueryLoading<T>({
  queryKey,
  queryFn,
  children,
  loadingComponent,
  errorComponent
}: QueryLoadingProps<T>) {
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn
  })

  if (isLoading) {
    return loadingComponent || <PageLoading />
  }

  if (error) {
    if (errorComponent) {
      return errorComponent(error as Error)
    }

    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          เกิดข้อผิดพลาด: {(error as Error).message}
        </AlertDescription>
      </Alert>
    )
  }

  if (!data) return null

  return <>{children(data)}</>
}
```

### Suspense Boundary

```typescript
// components/suspense/suspense-boundary.tsx
'use client'

import { Suspense } from 'react'
import { PageLoading } from '@/components/ui/page-loading'

interface SuspenseBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function SuspenseBoundary({
  children,
  fallback
}: SuspenseBoundaryProps) {
  return (
    <Suspense fallback={fallback || <PageLoading />}>
      {children}
    </Suspense>
  )
}
```

---

## Loading Hook

```typescript
// hooks/use-loading.ts
'use client'

import { useState, useCallback } from 'react'

interface UseLoadingOptions {
  initialState?: boolean
  minDuration?: number // Minimum loading time in ms
}

export function useLoading(options: UseLoadingOptions = {}) {
  const { initialState = false, minDuration = 0 } = options
  const [loading, setLoading] = useState(initialState)

  const withLoading = useCallback(async <T,>(
    fn: () => Promise<T>
  ): Promise<T> => {
    setLoading(true)
    const startTime = Date.now()

    try {
      const result = await fn()
      return result
    } finally {
      const elapsed = Date.now() - startTime
      const remaining = minDuration - elapsed

      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining))
      }

      setLoading(false)
    }
  }, [minDuration])

  return {
    loading,
    setLoading,
    withLoading
  }
}

// Usage
function MyComponent() {
  const { loading, withLoading } = useLoading({ minDuration: 500 })

  const handleSubmit = () => {
    withLoading(async () => {
      await saveData(data)
    })
  }

  return (
    <ButtonLoading loading={loading} onClick={handleSubmit}>
      Save
    </ButtonLoading>
  )
}
```

---

## Skeleton Page Examples

### Inventory Page Skeleton

```typescript
// app/(dashboard)/inventory/loading.tsx
import { DashboardSkeleton } from '@/components/skeletons/dashboard-skeleton'

export default function InventoryLoading() {
  return <DashboardSkeleton />
}
```

### Users Page Skeleton

```typescript
// app/(dashboard)/users/loading.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TableSkeleton } from '@/components/skeletons/table-skeleton'

export default function UsersLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={10} columns={6} />
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Progressive Loading

```typescript
// components/loading/progressive-loading.tsx
'use client'

import { useState, useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

interface ProgressiveLoadingProps {
  children: React.ReactNode
  delay?: number
  skeleton?: React.ReactNode
}

export function ProgressiveLoading({
  children,
  delay = 200,
  skeleton
}: ProgressiveLoadingProps) {
  const [showContent, setShowContent] = useState(delay === 0)

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setShowContent(true), delay)
      return () => clearTimeout(timer)
    }
  }, [delay])

  if (showContent) {
    return <>{children}</>
  }

  return (
    <>
      {skeleton || <Skeleton className="h-20 w-full" />}
    </>
  )
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
