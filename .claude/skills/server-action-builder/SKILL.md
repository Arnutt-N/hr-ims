---
name: server-action-builder
description: Build Next.js Server Actions with auth, validation, and audit logging
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["server action", "action", "create action", "API", "mutation", "form action"]
  file_patterns: ["lib/actions/*.ts", "actions/*.ts"]
  context: backend, api, database
mcp_servers:
  - context7
  - sequential
personas:
  - backend
  - security
---

# Server Action Builder

## Core Role

Generate Next.js Server Actions following HR-IMS project patterns with:
- Authentication checks
- Role-based authorization
- Zod validation
- Prisma database operations
- Audit logging
- Path revalidation

---

## Standard Server Action Template

```typescript
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// Schema Definition
// ============================================
const <Entity>Schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  // Add fields as needed
})

type <Entity>Input = z.infer<typeof <Entity>Schema>

// ============================================
// CREATE
// ============================================
export async function create<Entity>(data: <Entity>Input) {
  // 1. Auth Check
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // 2. Role Check
  const allowedRoles = ['admin', 'superadmin']
  if (!allowedRoles.includes(session.user.role)) {
    return { error: 'Forbidden', code: 'FORBIDDEN' }
  }

  // 3. Validation
  const validated = <Entity>Schema.safeParse(data)
  if (!validated.success) {
    return {
      error: 'Invalid input',
      code: 'VALIDATION_ERROR',
      details: validated.error.flatten()
    }
  }

  try {
    // 4. Database Operation
    const item = await prisma.<entity>.create({
      data: validated.data
    })

    // 5. Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        tableName: '<Entity>',
        recordId: item.id.toString(),
        userId: parseInt(session.user.id),
        newData: JSON.parse(JSON.stringify(item))
      }
    })

    // 6. Revalidate
    revalidatePath('/<entity-path>')

    return { success: true, data: item }
  } catch (error) {
    console.error('create<Entity> error:', error)
    return { error: 'Internal server error', code: 'INTERNAL_ERROR' }
  }
}

// ============================================
// READ (List)
// ============================================
export async function get<Entity>s(options?: {
  page?: number
  limit?: number
  search?: string
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const page = options?.page ?? 1
  const limit = options?.limit ?? 10
  const skip = (page - 1) * limit

  try {
    const [items, total] = await Promise.all([
      prisma.<entity>.findMany({
        where: options?.search
          ? { name: { contains: options.search } }
          : undefined,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.<entity>.count()
    ])

    return {
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    console.error('get<Entity>s error:', error)
    return { error: 'Internal server error', code: 'INTERNAL_ERROR' }
  }
}

// ============================================
// READ (Single)
// ============================================
export async function get<Entity>ById(id: number) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  try {
    const item = await prisma.<entity>.findUnique({
      where: { id }
    })

    if (!item) {
      return { error: 'Not found', code: 'NOT_FOUND' }
    }

    return { success: true, data: item }
  } catch (error) {
    console.error('get<Entity>ById error:', error)
    return { error: 'Internal server error', code: 'INTERNAL_ERROR' }
  }
}

// ============================================
// UPDATE
// ============================================
export async function update<Entity>(id: number, data: Partial<<Entity>Input>) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const allowedRoles = ['admin', 'superadmin']
  if (!allowedRoles.includes(session.user.role)) {
    return { error: 'Forbidden', code: 'FORBIDDEN' }
  }

  const validated = <Entity>Schema.partial().safeParse(data)
  if (!validated.success) {
    return {
      error: 'Invalid input',
      code: 'VALIDATION_ERROR',
      details: validated.error.flatten()
    }
  }

  try {
    // Get old data for audit
    const oldItem = await prisma.<entity>.findUnique({ where: { id } })
    if (!oldItem) {
      return { error: 'Not found', code: 'NOT_FOUND' }
    }

    const item = await prisma.<entity>.update({
      where: { id },
      data: validated.data
    })

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        tableName: '<Entity>',
        recordId: item.id.toString(),
        userId: parseInt(session.user.id),
        oldData: JSON.parse(JSON.stringify(oldItem)),
        newData: JSON.parse(JSON.stringify(item))
      }
    })

    revalidatePath('/<entity-path>')

    return { success: true, data: item }
  } catch (error) {
    console.error('update<Entity> error:', error)
    return { error: 'Internal server error', code: 'INTERNAL_ERROR' }
  }
}

// ============================================
// DELETE
// ============================================
export async function delete<Entity>(id: number) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const allowedRoles = ['admin', 'superadmin']
  if (!allowedRoles.includes(session.user.role)) {
    return { error: 'Forbidden', code: 'FORBIDDEN' }
  }

  try {
    const oldItem = await prisma.<entity>.findUnique({ where: { id } })
    if (!oldItem) {
      return { error: 'Not found', code: 'NOT_FOUND' }
    }

    await prisma.<entity>.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        tableName: '<Entity>',
        recordId: id.toString(),
        userId: parseInt(session.user.id),
        oldData: JSON.parse(JSON.stringify(oldItem))
      }
    })

    revalidatePath('/<entity-path>')

    return { success: true }
  } catch (error) {
    console.error('delete<Entity> error:', error)
    return { error: 'Internal server error', code: 'INTERNAL_ERROR' }
  }
}
```

---

## Error Response Types

```typescript
interface ActionError {
  error: string
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR'
  details?: ZodFlattenedError
}

interface ActionSuccess<T> {
  success: true
  data: T
}

type ActionResult<T> = ActionSuccess<T> | ActionError
```

---

## Quick Generation Checklist

When creating a new Server Action, ensure:

1. [ ] `'use server'` directive at top
2. [ ] Auth check with `auth()`
3. [ ] Role check for protected operations
4. [ ] Zod schema validation
5. [ ] Try-catch error handling
6. [ ] Audit log for CUD operations
7. [ ] `revalidatePath()` for cache invalidation
8. [ ] TypeScript types exported

---

## Common Patterns

### With Transaction

```typescript
export async function createWithTransaction(data: ComplexInput) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Multiple operations in transaction
      const item1 = await tx.entity1.create({ data: data.part1 })
      const item2 = await tx.entity2.create({ data: { ...data.part2, entityId: item1.id } })

      return { item1, item2 }
    })

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        tableName: 'ComplexEntity',
        recordId: result.item1.id.toString(),
        userId: parseInt(session.user.id),
        newData: JSON.parse(JSON.stringify(result))
      }
    })

    revalidatePath('/path')
    return { success: true, data: result }
  } catch (error) {
    console.error('Transaction error:', error)
    return { error: 'Transaction failed', code: 'INTERNAL_ERROR' }
  }
}
```

### With File Upload

```typescript
export async function uploadFile(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const file = formData.get('file') as File
  if (!file) return { error: 'No file provided', code: 'VALIDATION_ERROR' }

  // Validate file type/size
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Invalid file type', code: 'VALIDATION_ERROR' }
  }

  if (file.size > 5 * 1024 * 1024) { // 5MB limit
    return { error: 'File too large', code: 'VALIDATION_ERROR' }
  }

  // Process file...
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
