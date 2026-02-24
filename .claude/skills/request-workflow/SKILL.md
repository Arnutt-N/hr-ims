---
name: request-workflow
description: Handle requisition request workflows (borrow/withdraw/return) with approval chains
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["request", "requisition", "borrow", "withdraw", "return", "approval", "approve"]
  file_patterns: ["*request*", "lib/actions/requests.ts", "app/(dashboard)/requests/**"]
  context: business logic, workflow, hr
mcp_servers:
  - sequential
personas:
  - backend
  - analyzer
---

# Request Workflow

## Core Role

Handle HR-IMS requisition request workflows:
- **Borrow** - Temporary item borrowing
- **Withdraw** - Permanent item withdrawal
- **Approve/Reject** - Multi-level approval
- **Return** - Item return processing

---

## Request Types

```yaml
request_types:
  BORROW:
    description: Temporary item borrowing
    requires_return: true
    approval_levels: 1
    default_status: PENDING

  WITHDRAW:
    description: Permanent item withdrawal
    requires_return: false
    approval_levels: 2
    default_status: PENDING

  RETURN:
    description: Return borrowed items
    approval_levels: 0
    default_status: COMPLETED
```

---

## Request Status Flow

```yaml
status_flow:
  PENDING:
    next: [APPROVED, REJECTED]
    actions: [edit, cancel]

  APPROVED:
    next: [PROCESSING, COMPLETED]
    actions: [process]

  REJECTED:
    next: []
    actions: []

  PROCESSING:
    next: [COMPLETED, CANCELLED]
    actions: [complete, cancel]

  COMPLETED:
    next: []
    actions: [view]

  CANCELLED:
    next: []
    actions: [view]
```

---

## Server Action Templates

### Create Request

```typescript
// lib/actions/requests.ts
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const createRequestSchema = z.object({
  type: z.enum(['BORROW', 'WITHDRAW']),
  items: z.array(z.object({
    itemId: z.number().positive(),
    quantity: z.number().positive()
  })).min(1),
  reason: z.string().min(10).max(500),
  returnDate: z.date().optional(), // Required for BORROW
  notes: z.string().optional()
})

export async function createRequest(input: z.infer<typeof createRequestSchema>) {
  // 1. Auth check
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // 2. Validation
  const validated = createRequestSchema.safeParse(input)
  if (!validated.success) {
    return { error: 'Invalid input', code: 'VALIDATION_ERROR', details: validated.error.flatten() }
  }

  // 3. Business rules
  if (validated.data.type === 'BORROW' && !validated.data.returnDate) {
    return { error: 'Return date required for borrow requests', code: 'VALIDATION_ERROR' }
  }

  try {
    // 4. Verify item availability
    for (const item of validated.data.items) {
      const inventoryItem = await prisma.inventoryItem.findUnique({
        where: { id: item.itemId },
        include: { stockLevels: true }
      })

      if (!inventoryItem) {
        return { error: `Item ${item.itemId} not found`, code: 'NOT_FOUND' }
      }

      const totalStock = inventoryItem.stockLevels.reduce((sum, s) => sum + s.quantity, 0)
      if (totalStock < item.quantity) {
        return { error: `Insufficient stock for item ${inventoryItem.name}`, code: 'INSUFFICIENT_STOCK' }
      }
    }

    // 5. Create request with items
    const request = await prisma.$transaction(async (tx) => {
      const newRequest = await tx.request.create({
        data: {
          type: validated.data.type,
          status: 'PENDING',
          reason: validated.data.reason,
          returnDate: validated.data.returnDate,
          notes: validated.data.notes,
          requesterId: parseInt(session.user.id),
          items: {
            create: validated.data.items.map(item => ({
              itemId: item.itemId,
              quantity: item.quantity,
              status: 'PENDING'
            }))
          }
        },
        include: { items: true }
      })

      // Audit log
      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          tableName: 'Request',
          recordId: newRequest.id.toString(),
          userId: parseInt(session.user.id),
          newData: newRequest
        }
      })

      // Create notification for approvers
      const approvers = await tx.user.findMany({
        where: {
          userRoles: {
            some: {
              role: { slug: { in: ['admin', 'approver', 'superadmin'] } }
            }
          }
        }
      })

      await tx.notification.createMany({
        data: approvers.map(approver => ({
          userId: approver.id,
          type: 'REQUEST_PENDING',
          title: 'New Request Pending',
          message: `New ${validated.data.type.toLowerCase()} request #${newRequest.id}`,
          link: `/requests/${newRequest.id}`
        }))
      })

      return newRequest
    })

    revalidatePath('/requests')
    return { success: true, data: request }

  } catch (error) {
    console.error('Create request error:', error)
    return { error: 'Failed to create request', code: 'INTERNAL_ERROR' }
  }
}
```

### Approve/Reject Request

```typescript
const approveRequestSchema = z.object({
  requestId: z.number().positive(),
  action: z.enum(['APPROVE', 'REJECT']),
  notes: z.string().optional()
})

export async function reviewRequest(input: z.infer<typeof approveRequestSchema>) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // Check approver role
  const hasApproverRole = await hasAnyRole(parseInt(session.user.id), ['admin', 'approver', 'superadmin'])
  if (!hasApproverRole) {
    return { error: 'Forbidden - Approver role required', code: 'FORBIDDEN' }
  }

  const validated = approveRequestSchema.safeParse(input)
  if (!validated.success) {
    return { error: 'Invalid input', code: 'VALIDATION_ERROR' }
  }

  try {
    const existingRequest = await prisma.request.findUnique({
      where: { id: validated.data.requestId },
      include: { items: true, requester: true }
    })

    if (!existingRequest) {
      return { error: 'Request not found', code: 'NOT_FOUND' }
    }

    if (existingRequest.status !== 'PENDING') {
      return { error: 'Request is not pending', code: 'INVALID_STATUS' }
    }

    const newStatus = validated.data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED'

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const request = await tx.request.update({
        where: { id: validated.data.requestId },
        data: {
          status: newStatus,
          approvedById: parseInt(session.user.id),
          approvedAt: new Date(),
          reviewNotes: validated.data.notes
        }
      })

      // Update request items status
      await tx.requestItem.updateMany({
        where: { requestId: validated.data.requestId },
        data: { status: newStatus }
      })

      // If approved, update inventory stock
      if (newStatus === 'APPROVED') {
        for (const item of existingRequest.items) {
          await tx.stockLevel.updateMany({
            where: { itemId: item.itemId },
            data: { quantity: { decrement: item.quantity } }
          })
        }
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          action: validated.data.action,
          tableName: 'Request',
          recordId: validated.data.requestId.toString(),
          userId: parseInt(session.user.id),
          oldData: existingRequest,
          newData: request
        }
      })

      // Notify requester
      await tx.notification.create({
        data: {
          userId: existingRequest.requesterId,
          type: validated.data.action === 'APPROVE' ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED',
          title: `Request ${newStatus}`,
          message: `Your request #${validated.data.requestId} has been ${newStatus.toLowerCase()}`,
          link: `/requests/${validated.data.requestId}`
        }
      })

      return request
    })

    revalidatePath('/requests')
    return { success: true, data: updatedRequest }

  } catch (error) {
    console.error('Review request error:', error)
    return { error: 'Failed to review request', code: 'INTERNAL_ERROR' }
  }
}
```

### Return Items

```typescript
export async function returnItems(requestId: number, items: { itemId: number; quantity: number; condition?: string }[]) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  try {
    const existingRequest = await prisma.request.findUnique({
      where: { id: requestId },
      include: { items: true }
    })

    if (!existingRequest) {
      return { error: 'Request not found', code: 'NOT_FOUND' }
    }

    if (existingRequest.type !== 'BORROW') {
      return { error: 'Only borrow requests can be returned', code: 'INVALID_TYPE' }
    }

    if (existingRequest.status !== 'COMPLETED') {
      return { error: 'Request must be completed before return', code: 'INVALID_STATUS' }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update stock levels
      for (const item of items) {
        await tx.stockLevel.updateMany({
          where: { itemId: item.itemId },
          data: { quantity: { increment: item.quantity } }
        })

        // Update request item
        await tx.requestItem.update({
          where: {
            requestId_itemId: { requestId, itemId: item.itemId }
          },
          data: {
            returnedAt: new Date(),
            returnCondition: item.condition || 'GOOD'
          }
        })
      }

      // Check if all items returned
      const allReturned = await tx.requestItem.count({
        where: { requestId, returnedAt: null }
      }) === 0

      if (allReturned) {
        await tx.request.update({
          where: { id: requestId },
          data: { status: 'RETURNED', returnedAt: new Date() }
        })
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          action: 'RETURN',
          tableName: 'Request',
          recordId: requestId.toString(),
          userId: parseInt(session.user.id),
          newData: { items }
        }
      })
    })

    revalidatePath('/requests')
    revalidatePath('/my-assets')
    return { success: true }

  } catch (error) {
    console.error('Return items error:', error)
    return { error: 'Failed to return items', code: 'INTERNAL_ERROR' }
  }
}
```

---

## Cart Integration

```typescript
// lib/actions/cart.ts

export async function addToCart(itemId: number, quantity: number = 1) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const cartItem = await prisma.cartItem.upsert({
    where: {
      userId_itemId: {
        userId: parseInt(session.user.id),
        itemId
      }
    },
    update: { quantity: { increment: quantity } },
    create: {
      userId: parseInt(session.user.id),
      itemId,
      quantity
    }
  })

  revalidatePath('/cart')
  return { success: true, data: cartItem }
}

export async function submitCartAsRequest(type: 'BORROW' | 'WITHDRAW', reason: string, returnDate?: Date) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const cartItems = await prisma.cartItem.findMany({
    where: { userId: parseInt(session.user.id) },
    include: { item: true }
  })

  if (cartItems.length === 0) {
    return { error: 'Cart is empty', code: 'EMPTY_CART' }
  }

  const result = await createRequest({
    type,
    reason,
    returnDate,
    items: cartItems.map(ci => ({
      itemId: ci.itemId,
      quantity: ci.quantity
    }))
  })

  if (result.success) {
    // Clear cart
    await prisma.cartItem.deleteMany({
      where: { userId: parseInt(session.user.id) }
    })
    revalidatePath('/cart')
  }

  return result
}
```

---

## Query Patterns

```typescript
// Get pending requests for approver
export async function getPendingRequests() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const requests = await prisma.request.findMany({
    where: { status: 'PENDING' },
    include: {
      requester: { select: { id: true, name: true, department: true } },
      items: {
        include: { item: { select: { id: true, name: true, serialNumber: true } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return { success: true, data: requests }
}

// Get user's own requests
export async function getMyRequests(status?: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const requests = await prisma.request.findMany({
    where: {
      requesterId: parseInt(session.user.id),
      ...(status && { status: status as any })
    },
    include: {
      items: {
        include: { item: true }
      },
      approvedBy: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  return { success: true, data: requests }
}

// Get request statistics
export async function getRequestStats() {
  const stats = await prisma.request.groupBy({
    by: ['status'],
    _count: { id: true }
  })

  return {
    success: true,
    data: stats.reduce((acc, s) => ({ ...acc, [s.status]: s._count.id }), {})
  }
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
