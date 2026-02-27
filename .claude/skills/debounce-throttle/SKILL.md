---
name: debounce-throttle
description: Debounce and throttle utilities for performance optimization in HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["debounce", "throttle", "rate limit", "delay", "performance"]
  file_patterns: ["*debounce*", "*throttle*", "hooks/use-debounce*"]
  context: search optimization, rate limiting, performance
mcp_servers:
  - sequential
personas:
  - frontend
---

# Debounce & Throttle

## Core Role

Implement debounce and throttle for HR-IMS:
- Search input optimization
- API call rate limiting
- Window resize handling
- Scroll event optimization

---

## Debounce Hook

```typescript
// hooks/use-debounce.ts
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// Debounce a value
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

// Debounce a callback
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    }) as T,
    [callback, delay]
  )
}
```

---

## Throttle Hook

```typescript
// hooks/use-throttle.ts
'use client'

import { useRef, useCallback, useEffect } from 'react'

// Throttle a callback
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const lastRunRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now()
      const timeSinceLastRun = now - lastRunRef.current

      if (timeSinceLastRun >= delay) {
        lastRunRef.current = now
        callback(...args)
      } else {
        // Schedule for remaining time
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(() => {
          lastRunRef.current = Date.now()
          callback(...args)
        }, delay - timeSinceLastRun)
      }
    }) as T,
    [callback, delay]
  )
}

// Throttle a value
export function useThrottle<T>(value: T, delay: number = 300): T {
  const lastRunRef = useRef<number>(0)
  const [throttledValue, setThrottledValue] = useState<T>(value)

  useEffect(() => {
    const now = Date.now()
    if (now - lastRunRef.current >= delay) {
      lastRunRef.current = now
      setThrottledValue(value)
    }
  }, [value, delay])

  return throttledValue
}
```

---

## Leading/Trailing Options

```typescript
// hooks/use-debounce-advanced.ts
'use client'

import { useRef, useCallback, useEffect } from 'react'

interface DebounceOptions {
  delay: number
  leading?: boolean // Execute on first call
  trailing?: boolean // Execute after delay
}

export function useAdvancedDebounce<T extends (...args: any[]) => any>(
  callback: T,
  options: DebounceOptions
): T {
  const { delay, leading = false, trailing = true } = options
  const timeoutRef = useRef<NodeJS.Timeout>()
  const leadingCalledRef = useRef(false)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback(
    ((...args: Parameters<T>) => {
      // Leading edge
      if (leading && !leadingCalledRef.current) {
        leadingCalledRef.current = true
        callback(...args)
      }

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Trailing edge
      if (trailing) {
        timeoutRef.current = setTimeout(() => {
          if (!leading || leadingCalledRef.current) {
            callback(...args)
          }
          leadingCalledRef.current = false
        }, delay)
      }
    }) as T,
    [callback, delay, leading, trailing]
  )
}
```

---

## Search Input with Debounce

```typescript
// components/search/debounced-search.tsx
'use client'

import { useState } from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import { Input } from '@/components/ui/input'
import { useQuery } from '@tanstack/react-query'
import { searchInventory } from '@/lib/actions/inventory'

interface DebouncedSearchProps {
  placeholder?: string
  onResults?: (results: any[]) => void
}

export function DebouncedSearch({
  placeholder = 'ค้นหา... / Search...',
  onResults
}: DebouncedSearchProps) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchInventory(debouncedQuery),
    enabled: debouncedQuery.length >= 2
  })

  // Notify parent of results
  useEffect(() => {
    if (data && onResults) {
      onResults(data)
    }
  }, [data, onResults])

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="pr-10"
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
```

---

## Window Resize Handler

```typescript
// hooks/use-window-size.ts
'use client'

import { useState, useEffect } from 'react'
import { useDebouncedCallback } from '@/hooks/use-debounce'

interface WindowSize {
  width: number
  height: number
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    width: 0,
    height: 0,
    isMobile: false,
    isTablet: false,
    isDesktop: true
  })

  const handleResize = useDebouncedCallback(() => {
    const width = window.innerWidth
    const height = window.innerHeight

    setSize({
      width,
      height,
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024
    })
  }, 150)

  useEffect(() => {
    // Initial size
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [handleResize])

  return size
}
```

---

## Scroll Handler

```typescript
// hooks/use-scroll-position.ts
'use client'

import { useState, useEffect } from 'react'
import { useThrottledCallback } from '@/hooks/use-throttle'

interface ScrollPosition {
  x: number
  y: number
  direction: 'up' | 'down' | null
  isAtTop: boolean
  isAtBottom: boolean
}

export function useScrollPosition(): ScrollPosition {
  const [position, setPosition] = useState<ScrollPosition>({
    x: 0,
    y: 0,
    direction: null,
    isAtTop: true,
    isAtBottom: false
  })

  const lastYRef = useRef(0)

  const handleScroll = useThrottledCallback(() => {
    const x = window.scrollX
    const y = window.scrollY
    const prevY = lastYRef.current

    const direction = y > prevY ? 'down' : y < prevY ? 'up' : null
    lastYRef.current = y

    setPosition({
      x,
      y,
      direction,
      isAtTop: y === 0,
      isAtBottom: y + window.innerHeight >= document.documentElement.scrollHeight - 10
    })
  }, 100)

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return position
}

// Usage: Show/hide header on scroll
function StickyHeader() {
  const { direction, isAtTop } = useScrollPosition()
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    setHidden(direction === 'down' && !isAtTop)
  }, [direction, isAtTop])

  return (
    <header className={cn(
      'fixed top-0 w-full transition-transform',
      hidden && '-translate-y-full'
    )}>
      {/* Header content */}
    </header>
  )
}
```

---

## Auto-Save with Debounce

```typescript
// hooks/use-auto-save.ts
'use client'

import { useEffect } from 'react'
import { useDebouncedCallback } from '@/hooks/use-debounce'
import { toast } from 'sonner'

interface AutoSaveOptions {
  delay?: number
  onSave: (data: any) => Promise<void>
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useAutoSave<T>(
  data: T,
  options: AutoSaveOptions
) {
  const { delay = 2000, onSave, onSuccess, onError } = options

  const save = useDebouncedCallback(async (dataToSave: T) => {
    try {
      await onSave(dataToSave)
      toast.success('บันทึกอัตโนมัติ / Auto-saved')
      onSuccess?.()
    } catch (error) {
      toast.error('บันทึกไม่สำเร็จ / Save failed')
      onError?.(error as Error)
    }
  }, delay)

  useEffect(() => {
    if (data) {
      save(data)
    }
  }, [data, save])

  return { save }
}

// Usage
function EditForm({ itemId }: { itemId: number }) {
  const [formData, setFormData] = useState({ name: '', description: '' })

  useAutoSave(formData, {
    delay: 1500,
    onSave: (data) => updateItem(itemId, data)
  })

  return (
    <form>
      <Input
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      <p className="text-xs text-muted-foreground">
        บันทึกอัตโนมัติ / Auto-saves as you type
      </p>
    </form>
  )
}
```

---

## Rate Limiter for API Calls

```typescript
// lib/rate-limiter.ts
export class RateLimiter {
  private queue: Array<() => Promise<any>> = []
  private processing = false
  private lastCall = 0

  constructor(
    private minDelay: number = 100,
    private maxConcurrent: number = 5
  ) {}

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      this.process()
    })
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return

    this.processing = true

    while (this.queue.length > 0) {
      const now = Date.now()
      const timeSinceLastCall = now - this.lastCall

      if (timeSinceLastCall < this.minDelay) {
        await new Promise((r) => setTimeout(r, this.minDelay - timeSinceLastCall))
      }

      const batch = this.queue.splice(0, this.maxConcurrent)
      await Promise.all(batch.map((fn) => fn()))
      this.lastCall = Date.now()
    }

    this.processing = false
  }
}

// Usage
const apiLimiter = new RateLimiter(100, 5)

async function fetchItems(ids: number[]) {
  return Promise.all(
    ids.map((id) =>
      apiLimiter.add(() => fetch(`/api/items/${id}`).then((r) => r.json()))
    )
  )
}
```

---

## Utility Functions

```typescript
// lib/utils/debounce.ts

// Simple debounce function
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout

  return function (...args: Parameters<T>) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// Simple throttle function
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0

  return function (...args: Parameters<T>) {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      fn(...args)
    }
  }
}

// Once - only execute once
export function once<T extends (...args: any[]) => any>(fn: T): T {
  let called = false
  let result: ReturnType<T>

  return ((...args: Parameters<T>) => {
    if (!called) {
      called = true
      result = fn(...args)
    }
    return result
  }) as T
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
