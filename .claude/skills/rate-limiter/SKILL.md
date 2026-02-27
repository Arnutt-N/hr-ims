---
name: rate-limiter
description: Rate limiting and request throttling for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["rate limit", "throttle", "rate limiting", "request limit", "ddos protection"]
  file_patterns: ["*rate*", "*limit*", "*throttle*", "middleware/rate*"]
  context: rate limiting, request throttling, DDoS protection, API limits
mcp_servers:
  - sequential
personas:
  - backend
  - security
---

# Rate Limiter

## Core Role

Implement rate limiting for HR-IMS:
- API rate limiting
- Login attempt limiting
- Request throttling
- DDoS protection

---

## Rate Limiter Service

```typescript
// lib/rate-limit/limiter.ts
import { NextRequest, NextResponse } from 'next/server'

export interface RateLimitConfig {
  windowMs: number        // Time window in milliseconds
  maxRequests: number     // Max requests per window
  keyGenerator?: (req: NextRequest) => string
  skipIf?: (req: NextRequest) => boolean
  handler?: (req: NextRequest) => NextResponse
  standardHeaders?: boolean
  legacyHeaders?: boolean
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: Date
  resetMs: number
}

// In-memory store (use Redis for production)
const store = new Map<string, { count: number; resetTime: number }>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of store.entries()) {
    if (value.resetTime < now) {
      store.delete(key)
    }
  }
}, 60000) // Clean every minute

// Default key generator (IP-based)
function defaultKeyGenerator(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'
  return ip
}

// Default handler for rate limited requests
function defaultHandler(req: NextRequest): NextResponse {
  return NextResponse.json(
    {
      error: 'Too Many Requests',
      message: 'คำขอเกินขีดจำกัด กรุณารอสักครู่ / Rate limit exceeded, please try again later',
      retryAfter: 60
    },
    { status: 429 }
  )
}

// Create rate limiter middleware
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs = 60000, // 1 minute default
    maxRequests = 100,
    keyGenerator = defaultKeyGenerator,
    skipIf,
    handler = defaultHandler,
    standardHeaders = true,
    legacyHeaders = false
  } = config

  return async function rateLimiter(
    req: NextRequest
  ): Promise<NextResponse | null> {
    // Skip if condition met
    if (skipIf?.(req)) {
      return null
    }

    const key = keyGenerator(req)
    const now = Date.now()
    const resetTime = now + windowMs

    // Get or create entry
    let entry = store.get(key)

    if (!entry || entry.resetTime < now) {
      // Create new entry
      entry = { count: 0, resetTime }
      store.set(key, entry)
    }

    // Increment count
    entry.count++

    const remaining = Math.max(0, maxRequests - entry.count)
    const resetDate = new Date(entry.resetTime)
    const resetMs = entry.resetTime - now

    // Check if rate limit exceeded
    if (entry.count > maxRequests) {
      const response = handler(req)

      // Add rate limit headers
      if (standardHeaders) {
        response.headers.set('RateLimit-Limit', maxRequests.toString())
        response.headers.set('RateLimit-Remaining', '0')
        response.headers.set('RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString())
      }

      if (legacyHeaders) {
        response.headers.set('X-RateLimit-Limit', maxRequests.toString())
        response.headers.set('X-RateLimit-Remaining', '0')
        response.headers.set('X-RateLimit-Reset', resetDate.toISOString())
      }

      response.headers.set('Retry-After', Math.ceil(resetMs / 1000).toString())

      return response
    }

    // Update remaining count
    store.set(key, entry)

    // Return null to allow request to continue
    // Headers should be added by wrapper
    return null
  }
}

// Get rate limit info for a key
export function getRateLimitInfo(
  req: NextRequest,
  config: RateLimitConfig
): RateLimitInfo {
  const key = (config.keyGenerator || defaultKeyGenerator)(req)
  const entry = store.get(key)
  const now = Date.now()

  if (!entry || entry.resetTime < now) {
    return {
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset: new Date(now + config.windowMs),
      resetMs: config.windowMs
    }
  }

  return {
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    reset: new Date(entry.resetTime),
    resetMs: entry.resetTime - now
  }
}

// Reset rate limit for a key
export function resetRateLimit(
  req: NextRequest,
  config: RateLimitConfig
): void {
  const key = (config.keyGenerator || defaultKeyGenerator)(req)
  store.delete(key)
}
```

---

## Pre-configured Rate Limiters

```typescript
// lib/rate-limit/presets.ts
import { createRateLimiter, RateLimitConfig } from './limiter'

// General API rate limiter (100 requests per minute)
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  standardHeaders: true
})

// Strict API rate limiter (30 requests per minute)
export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  standardHeaders: true
})

// Login rate limiter (5 attempts per 15 minutes)
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  keyGenerator: (req) => {
    // Rate limit by IP + email to prevent brute force
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'
    const email = req.headers.get('x-login-email') || ''
    return `login:${ip}:${email}`
  },
  handler: (req) => {
    return new Response(
      JSON.stringify({
        error: 'Too Many Attempts',
        message: 'พยายามเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาที / Too many login attempts, please wait 15 minutes'
      }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})

// Password reset rate limiter (3 per hour)
export const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
  keyGenerator: (req) => {
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'
    return `pwd-reset:${ip}`
  },
  handler: (req) => {
    return new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'ขอรีเซ็ตรหัสผ่านมากเกินไป กรุณารอ 1 ชั่วโมง / Too many password reset requests, please wait 1 hour'
      }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})

// Registration rate limiter (3 per hour per IP)
export const registrationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
  keyGenerator: (req) => {
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'
    return `register:${ip}`
  }
})

// Search rate limiter (30 per minute)
export const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30
})

// Export rate limiter (10 per hour)
export const exportRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  handler: (req) => {
    return new Response(
      JSON.stringify({
        error: 'Export Limit Reached',
        message: 'ส่งออกข้อมูลมากเกินไป กรุณารอ 1 ชั่วโมง / Export limit reached, please wait 1 hour'
      }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})

// Admin action rate limiter (60 per minute)
export const adminActionLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  skipIf: (req) => {
    // Skip for superadmin (based on header)
    const role = req.headers.get('x-user-role')
    return role === 'superadmin'
  }
})
```

---

## Rate Limit Middleware

```typescript
// middleware/rate-limit.ts
import { NextRequest, NextResponse } from 'next/server'
import { apiRateLimiter, strictRateLimiter, loginRateLimiter } from '@/lib/rate-limit/presets'
import { getRateLimitInfo } from '@/lib/rate-limit/limiter'

// Path configurations
const pathConfigs: Array<{
  pattern: RegExp
  limiter: ReturnType<typeof createRateLimiter>
  config: RateLimitConfig
}> = [
  // Login endpoint - strict
  {
    pattern: /^\/api\/auth\/login/,
    limiter: loginRateLimiter,
    config: { windowMs: 15 * 60 * 1000, maxRequests: 5 }
  },
  // Search endpoints - moderate
  {
    pattern: /^\/api\/(inventory|users|requests)\/search/,
    limiter: strictRateLimiter,
    config: { windowMs: 60 * 1000, maxRequests: 30 }
  },
  // General API - standard
  {
    pattern: /^\/api\//,
    limiter: apiRateLimiter,
    config: { windowMs: 60 * 1000, maxRequests: 100 }
  }
]

export async function rateLimitMiddleware(
  req: NextRequest
): Promise<NextResponse | null> {
  const path = req.nextUrl.pathname

  // Find matching config
  for (const { pattern, limiter, config } of pathConfigs) {
    if (pattern.test(path)) {
      const result = await limiter(req)

      if (result) {
        // Rate limit exceeded
        return result
      }

      // Add rate limit headers to response
      // Note: In middleware, we can't modify response headers directly
      // This info should be passed via request headers
      const info = getRateLimitInfo(req, config)
      req.headers.set('x-ratelimit-limit', info.limit.toString())
      req.headers.set('x-ratelimit-remaining', info.remaining.toString())
      req.headers.set('x-ratelimit-reset', info.reset.toISOString())

      return null // Continue to next handler
    }
  }

  return null // No rate limit for this path
}
```

---

## Server Action Rate Limiter

```typescript
// lib/rate-limit/server-action.ts
import { headers } from 'next/headers'

interface ActionRateLimitConfig {
  action: string
  windowMs: number
  maxRequests: number
}

const actionStore = new Map<string, { count: number; resetTime: number }>()

// Rate limit for Server Actions
export async function rateLimitAction(config: ActionRateLimitConfig): Promise<{
  success: boolean
  remaining: number
  resetTime: Date
  error?: string
}> {
  const headersList = await headers()
  const forwarded = headersList.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'
  const userId = headersList.get('x-user-id') || ip

  const key = `action:${config.action}:${userId}`
  const now = Date.now()
  const resetTime = now + config.windowMs

  let entry = actionStore.get(key)

  if (!entry || entry.resetTime < now) {
    entry = { count: 0, resetTime }
    actionStore.set(key, entry)
  }

  entry.count++

  const remaining = Math.max(0, config.maxRequests - entry.count)

  if (entry.count > config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: new Date(entry.resetTime),
      error: `คำขอเกินขีดจำกัด กรุณารอสักครู่ / Rate limit exceeded for ${config.action}`
    }
  }

  actionStore.set(key, entry)

  return {
    success: true,
    remaining,
    resetTime: new Date(entry.resetTime)
  }
}

// Decorator for rate-limited server actions
export function withRateLimit(
  action: string,
  maxRequests: number = 10,
  windowMs: number = 60000
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const limitResult = await rateLimitAction({
        action,
        maxRequests,
        windowMs
      })

      if (!limitResult.success) {
        return { error: limitResult.error }
      }

      return originalMethod.apply(this, args)
    }

    return descriptor
  }
}
```

---

## Rate Limit Status Component

```typescript
// components/admin/rate-limit-status.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, CheckCircle } from 'lucide-react'

interface RateLimitStatus {
  path: string
  limit: number
  remaining: number
  resetTime: Date
}

export function RateLimitStatus() {
  const [statuses, setStatuses] = useState<RateLimitStatus[]>([])

  useEffect(() => {
    // Fetch rate limit status from headers or API
    const fetchStatus = async () => {
      const response = await fetch('/api/admin/rate-limit-status')
      const data = await response.json()
      setStatuses(data.statuses || [])
    }

    fetchStatus()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>สถานะ Rate Limit / Rate Limit Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {statuses.map((status) => {
            const usagePercent = ((status.limit - status.remaining) / status.limit) * 100
            const isWarning = usagePercent > 80

            return (
              <div key={status.path} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{status.path}</span>
                  <div className="flex items-center gap-2">
                    {isWarning ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {status.remaining}/{status.limit}
                    </span>
                  </div>
                </div>
                <Progress
                  value={usagePercent}
                  className={`h-2 ${isWarning ? 'bg-yellow-100' : ''}`}
                />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Usage Examples

```typescript
// Example 1: Apply rate limit to API route
import { apiRateLimiter } from '@/lib/rate-limit/presets'

export async function GET(request: NextRequest) {
  const limitResult = await apiRateLimiter(request)
  if (limitResult) {
    return limitResult // Rate limit exceeded
  }

  // Continue with normal handler
  return NextResponse.json({ data: 'success' })
}

// Example 2: Rate limit Server Action
'use server'

import { rateLimitAction } from '@/lib/rate-limit/server-action'

export async function deleteItem(itemId: number) {
  const limitResult = await rateLimitAction({
    action: 'delete-item',
    maxRequests: 10,
    windowMs: 60000
  })

  if (!limitResult.success) {
    return { error: limitResult.error }
  }

  // Proceed with deletion
  await prisma.inventoryItem.delete({ where: { id: itemId } })
  return { success: true }
}

// Example 3: Login with rate limiting
export async function login(email: string, password: string) {
  // Check rate limit before attempting login
  const limitResult = await rateLimitAction({
    action: 'login',
    maxRequests: 5,
    windowMs: 15 * 60 * 1000 // 15 minutes
  })

  if (!limitResult.success) {
    return { error: limitResult.error }
  }

  // Attempt login
  // ...
}

// Example 4: Custom rate limiter configuration
import { createRateLimiter } from '@/lib/rate-limit/limiter'

const customLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 50,
  keyGenerator: (req) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    const userId = req.headers.get('x-user-id')
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'
    return userId ? `user:${userId}` : `ip:${ip}`
  },
  skipIf: (req) => {
    // Skip rate limiting for superadmin
    return req.headers.get('x-user-role') === 'superadmin'
  }
})
```

---

*Version: 1.0.0 | For HR-IMS Project*
