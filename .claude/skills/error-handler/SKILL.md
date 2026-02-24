---
name: error-handler
description: Error handling patterns for API responses, Server Actions, and UI feedback in HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["error", "exception", "error handling", "try catch", "error boundary"]
  file_patterns: ["*error*", "lib/errors/**", "components/error/**"]
  context: error handling, exception management, user feedback
mcp_servers:
  - sequential
personas:
  - backend
  - frontend
---

# Error Handler

## Core Role

Implement comprehensive error handling for HR-IMS:
- Server Action error responses
- API error handling
- Error boundaries for UI
- Logging and monitoring

---

## Error Types

```yaml
error_codes:
  UNAUTHORIZED: "Authentication required"
  FORBIDDEN: "Permission denied"
  NOT_FOUND: "Resource not found"
  VALIDATION_ERROR: "Invalid input data"
  DUPLICATE_ENTRY: "Record already exists"
  INTERNAL_ERROR: "Server error"
  RATE_LIMITED: "Too many requests"
  SERVICE_UNAVAILABLE: "Service temporarily unavailable"
```

---

## Error Classes

```typescript
// lib/errors/index.ts

// Base application error
export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'INTERNAL_ERROR',
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'AppError'
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      details: this.details
    }
  }
}

// Authentication errors
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401)
    this.name = 'UnauthorizedError'
  }
}

// Authorization errors
export class ForbiddenError extends AppError {
  constructor(message: string = 'Permission denied') {
    super(message, 'FORBIDDEN', 403)
    this.name = 'ForbiddenError'
  }
}

// Not found errors
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

// Validation errors
export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    public fieldErrors: Record<string, string[]> = {}
  ) {
    super(message, 'VALIDATION_ERROR', 400, { fieldErrors })
    this.name = 'ValidationError'
  }
}

// Duplicate entry errors
export class DuplicateError extends AppError {
  constructor(field: string, value: string) {
    super(`${field} '${value}' already exists`, 'DUPLICATE_ENTRY', 409, { field, value })
    this.name = 'DuplicateError'
  }
}

// Rate limiting errors
export class RateLimitError extends AppError {
  constructor(retryAfter: number = 60) {
    super('Too many requests', 'RATE_LIMITED', 429, { retryAfter })
    this.name = 'RateLimitError'
  }
}

// Database errors
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 'DATABASE_ERROR', 500)
    this.name = 'DatabaseError'
  }
}
```

---

## Server Action Error Handler

```typescript
// lib/actions/error-handler.ts
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { AppError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors'

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string; details?: any }

export function handleActionError(error: unknown): ActionResult<never> {
  console.error('Action error:', error)

  // AppError instances
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details
    }
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    const fieldErrors = error.flatten().fieldErrors
    return {
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: { fieldErrors }
    }
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error)
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      success: false,
      error: 'Invalid data provided',
      code: 'VALIDATION_ERROR'
    }
  }

  // Generic errors
  if (error instanceof Error) {
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
      code: 'INTERNAL_ERROR'
    }
  }

  return {
    success: false,
    error: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR'
  }
}

function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): ActionResult<never> {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const field = (error.meta?.target as string[])?.[0] || 'field'
      return {
        success: false,
        error: `${field} already exists`,
        code: 'DUPLICATE_ENTRY',
        details: { field }
      }

    case 'P2025':
      // Record not found
      return {
        success: false,
        error: 'Record not found',
        code: 'NOT_FOUND'
      }

    case 'P2003':
      // Foreign key constraint
      return {
        success: false,
        error: 'Related record not found',
        code: 'VALIDATION_ERROR'
      }

    case 'P2014':
      // Relation violation
      return {
        success: false,
        error: 'Cannot delete: record has related items',
        code: 'VALIDATION_ERROR'
      }

    default:
      return {
        success: false,
        error: 'Database operation failed',
        code: 'DATABASE_ERROR'
      }
  }
}

// Wrapper for Server Actions with automatic error handling
export function withErrorHandling<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>
): (...args: Args) => Promise<ActionResult<T>> {
  return async (...args: Args) => {
    try {
      const data = await fn(...args)
      return { success: true, data }
    } catch (error) {
      return handleActionError(error)
    }
  }
}
```

---

## Usage in Server Actions

```typescript
// lib/actions/users.ts
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { handleActionError, ActionResult } from '@/lib/actions/error-handler'
import { UnauthorizedError, ForbiddenError, NotFoundError, DuplicateError } from '@/lib/errors'
import bcrypt from 'bcryptjs'

export async function updateUser(
  userId: number,
  data: { name?: string; email?: string; department?: string }
): Promise<ActionResult<User>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError()
    }

    const isOwn = parseInt(session.user.id) === userId
    const isAdmin = await hasAnyRole(parseInt(session.user.id), ['admin', 'superadmin'])

    if (!isOwn && !isAdmin) {
      throw new ForbiddenError()
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existing) {
      throw new NotFoundError('User')
    }

    // Check for duplicate email
    if (data.email && data.email !== existing.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email }
      })
      if (emailExists) {
        throw new DuplicateError('Email', data.email)
      }
    }

    // Update user
    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data
      })

      await tx.auditLog.create({
        data: {
          action: 'UPDATE',
          tableName: 'User',
          recordId: userId.toString(),
          userId: parseInt(session.user.id),
          oldData: { name: existing.name, email: existing.email },
          newData: data
        }
      })

      return updated
    })

    revalidatePath('/users')
    return { success: true, data: user }

  } catch (error) {
    return handleActionError(error)
  }
}

// Using wrapper
export const deleteUser = withErrorHandling(async (userId: number) => {
  const session = await auth()
  if (!session?.user?.id) throw new UnauthorizedError()

  const isAdmin = await hasAnyRole(parseInt(session.user.id), ['admin', 'superadmin'])
  if (!isAdmin) throw new ForbiddenError()

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new NotFoundError('User')

  await prisma.user.delete({ where: { id: userId } })
  revalidatePath('/users')

  return user
})
```

---

## Frontend Error Handling

### Error Boundary

```typescript
// components/error-boundary.tsx
'use client'

import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    // Send to error reporting service
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            เกิดข้อผิดพลาด / Something went wrong
          </h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button onClick={() => this.setState({ hasError: false })}>
            <RefreshCw className="h-4 w-4 mr-2" />
            ลองใหม่ / Try Again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
```

### Error Page

```typescript
// app/error.tsx
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Page error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
      <h1 className="text-2xl font-bold mb-2">
        เกิดข้อผิดพลาด / Error
      </h1>
      <p className="text-muted-foreground mb-6 text-center max-w-md">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <div className="flex gap-4">
        <Button onClick={reset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          ลองใหม่ / Try Again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">
            <Home className="h-4 w-4 mr-2" />
            กลับหน้าหลัก / Home
          </Link>
        </Button>
      </div>
    </div>
  )
}
```

### Not Found Page

```typescript
// app/not-found.tsx
import { Button } from '@/components/ui/button'
import { FileQuestion, Home, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <FileQuestion className="h-16 w-16 text-muted-foreground mb-6" />
      <h1 className="text-2xl font-bold mb-2">
        ไม่พบหน้านี้ / Page Not Found
      </h1>
      <p className="text-muted-foreground mb-6 text-center">
        หน้าที่คุณค้นหาไม่มีอยู่หรือถูกย้ายไปแล้ว
        <br />
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex gap-4">
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          ย้อนกลับ / Go Back
        </Button>
        <Button asChild>
          <Link href="/">
            <Home className="h-4 w-4 mr-2" />
            กลับหน้าหลัก / Home
          </Link>
        </Button>
      </div>
    </div>
  )
}
```

---

## Form Error Display

```typescript
// components/forms/form-errors.tsx
'use client'

import { FieldErrors } from 'react-hook-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

interface FormErrorsProps {
  errors: FieldErrors
  serverErrors?: Record<string, string[]>
}

export function FormErrors({ errors, serverErrors }: FormErrorsProps) {
  const allErrors: Array<{ field: string; message: string }> = []

  // Client-side errors
  Object.entries(errors).forEach(([field, error]) => {
    if (error?.message) {
      allErrors.push({ field, message: String(error.message) })
    }
  })

  // Server-side errors
  if (serverErrors) {
    Object.entries(serverErrors).forEach(([field, messages]) => {
      messages.forEach((message) => {
        allErrors.push({ field, message })
      })
    })
  }

  if (allErrors.length === 0) return null

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <ul className="list-disc list-inside">
          {allErrors.map((error, index) => (
            <li key={index}>
              <strong>{formatFieldName(error.field)}:</strong> {error.message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}

function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}
```

---

## API Error Response Handler

```typescript
// lib/api/error-response.ts
import { NextResponse } from 'next/server'
import { AppError } from '@/lib/errors'

export function apiErrorResponse(error: unknown): NextResponse {
  console.error('API error:', error)

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details
      },
      { status: error.statusCode }
    )
  }

  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: error.message,
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR'
    },
    { status: 500 }
  )
}

// Usage in API route
export async function GET(request: Request) {
  try {
    // ... logic
    return NextResponse.json({ data })
  } catch (error) {
    return apiErrorResponse(error)
  }
}
```

---

## Error Logging

```typescript
// lib/logging/error-logger.ts

interface ErrorLog {
  timestamp: Date
  error: string
  stack?: string
  context?: Record<string, any>
  userId?: number
  requestId?: string
}

export function logError(error: unknown, context?: Record<string, any>) {
  const log: ErrorLog = {
    timestamp: new Date(),
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context
  }

  // Console logging (development)
  if (process.env.NODE_ENV === 'development') {
    console.error('[ERROR]', log)
  }

  // TODO: Send to error monitoring service
  // - Sentry
  // - LogRocket
  // - Custom logging endpoint

  return log
}

// Usage
try {
  // ... operation
} catch (error) {
  logError(error, { action: 'createUser', email: data.email })
  throw error
}
```

---

## Async Error Boundary Hook

```typescript
// hooks/use-async-error.ts
'use client'

import { useCallback, useRef } from 'react'

export function useAsyncError() {
  const setError = useRef<(error: Error) => void>()

  const throwError = useCallback((error: unknown) => {
    if (error instanceof Error) {
      setError.current?.(error)
    } else {
      setError.current?.(new Error(String(error)))
    }
  }, [])

  const register = useCallback((dispatchError: (error: Error) => void) => {
    setError.current = dispatchError
  }, [])

  return { throwError, register }
}

// Usage with ErrorBoundary
import { useAsyncError } from '@/hooks/use-async-error'

function MyComponent() {
  const { throwError } = useAsyncError()

  const handleClick = async () => {
    try {
      await someAsyncOperation()
    } catch (error) {
      throwError(error)
    }
  }
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
