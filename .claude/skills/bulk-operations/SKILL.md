---
name: bulk-operations
description: Bulk operations for batch processing items, users, and requests in HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["bulk", "batch", "mass", "multiple", "batch update", "bulk delete"]
  file_patterns: ["*bulk*", "lib/bulk/**", "components/bulk/**"]
  context: batch processing, mass operations, multi-select actions
mcp_servers:
  - sequential
personas:
  - backend
  - admin
---

# Bulk Operations

## Core Role

Implement bulk operations for HR-IMS:
- Bulk status updates
- Bulk delete/archive
- Bulk role assignments
- Bulk stock adjustments
- Bulk request processing

---

## Bulk Operation Patterns

```yaml
patterns:
  single_transaction:
    description: "All operations in one transaction"
    use_case: "Small batches (< 100 items), all must succeed or fail together"

  chunked_transaction:
    description: "Process in chunks with partial success handling"
    use_case: "Large batches (> 100 items), allow partial failures"

  queue_based:
    description: "Add to queue, process asynchronously"
    use_case: "Very large operations (> 1000 items), long-running tasks"
```

---

## Server Actions

### Bulk Status Update

```typescript
// lib/actions/bulk.ts
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const bulkStatusUpdateSchema = z.object({
  itemIds: z.array(z.number().int().positive()).min(1).max(500),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DISPOSED'])
})

interface BulkResult {
  success: boolean
  processed: number
  failed: number
  errors: Array<{ id: number; error: string }>
}

export async function bulkUpdateItemStatus(
  input: z.infer<typeof bulkStatusUpdateSchema>
): Promise<BulkResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, processed: 0, failed: 0, errors: [] }
  }

  const hasPermission = await hasAnyRole(
    parseInt(session.user.id),
    ['admin', 'superadmin']
  )
  if (!hasPermission) {
    return { success: false, processed: 0, failed: 0, errors: [] }
  }

  const validated = bulkStatusUpdateSchema.safeParse(input)
  if (!validated.success) {
    return { success: false, processed: 0, failed: 0, errors: [] }
  }

  const { itemIds, status } = validated.data
  const CHUNK_SIZE = 100
  const result: BulkResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: []
  }

  // Process in chunks
  for (let i = 0; i < itemIds.length; i += CHUNK_SIZE) {
    const chunk = itemIds.slice(i, i + CHUNK_SIZE)

    try {
      await prisma.$transaction(async (tx) => {
        // Get current states for audit
        const items = await tx.inventoryItem.findMany({
          where: { id: { in: chunk } }
        })

        // Update items
        await tx.inventoryItem.updateMany({
          where: { id: { in: chunk } },
          data: { status }
        })

        // Create audit logs
        await tx.auditLog.createMany({
          data: items.map((item) => ({
            action: 'UPDATE',
            tableName: 'InventoryItem',
            recordId: item.id.toString(),
            userId: parseInt(session.user.id),
            oldData: { status: item.status },
            newData: { status }
          }))
        })

        result.processed += chunk.length
      })
    } catch (error: any) {
      chunk.forEach((id) => {
        result.errors.push({ id, error: error.message || 'Update failed' })
      })
      result.failed += chunk.length
      result.success = false
    }
  }

  revalidatePath('/inventory')
  return result
}
```

### Bulk Delete

```typescript
const bulkDeleteSchema = z.object({
  itemIds: z.array(z.number().int().positive()).min(1).max(100)
})

export async function bulkDeleteItems(
  input: z.infer<typeof bulkDeleteSchema>
): Promise<BulkResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, processed: 0, failed: 0, errors: [] }
  }

  const hasPermission = await hasAnyRole(
    parseInt(session.user.id),
    ['admin', 'superadmin']
  )
  if (!hasPermission) {
    return { success: false, processed: 0, failed: 0, errors: [] }
  }

  const validated = bulkDeleteSchema.safeParse(input)
  if (!validated.success) {
    return { success: false, processed: 0, failed: 0, errors: [] }
  }

  const { itemIds } = validated.data

  try {
    await prisma.$transaction(async (tx) => {
      // Check for dependencies (active requests, etc.)
      const itemsWithRequests = await tx.requestItem.findMany({
        where: {
          itemId: { in: itemIds },
          request: { status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] } }
        },
        select: { itemId: true }
      })

      if (itemsWithRequests.length > 0) {
        throw new Error(
          `Cannot delete items with active requests: ${itemsWithRequests.map(i => i.itemId).join(', ')}`
        )
      }

      // Get items for audit
      const items = await tx.inventoryItem.findMany({
        where: { id: { in: itemIds } }
      })

      // Delete related records
      await tx.stockLevel.deleteMany({
        where: { itemId: { in: itemIds } }
      })

      // Delete items
      await tx.inventoryItem.deleteMany({
        where: { id: { in: itemIds } }
      })

      // Create audit logs
      await tx.auditLog.createMany({
        data: items.map((item) => ({
          action: 'DELETE',
          tableName: 'InventoryItem',
          recordId: item.id.toString(),
          userId: parseInt(session.user.id),
          oldData: { name: item.name, serialNumber: item.serialNumber }
        }))
      })
    })

    revalidatePath('/inventory')
    return { success: true, processed: itemIds.length, failed: 0, errors: [] }

  } catch (error: any) {
    return {
      success: false,
      processed: 0,
      failed: itemIds.length,
      errors: [{ id: 0, error: error.message }]
    }
  }
}
```

### Bulk Role Assignment

```typescript
const bulkRoleAssignSchema = z.object({
  userIds: z.array(z.number().int().positive()).min(1).max(100),
  roleSlugs: z.array(z.string()).min(1),
  action: z.enum(['ADD', 'REMOVE', 'REPLACE'])
})

export async function bulkAssignRoles(
  input: z.infer<typeof bulkRoleAssignSchema>
): Promise<BulkResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, processed: 0, failed: 0, errors: [] }
  }

  const hasPermission = await hasAnyRole(
    parseInt(session.user.id),
    ['superadmin']
  )
  if (!hasPermission) {
    return { success: false, processed: 0, failed: 0, errors: [] }
  }

  const validated = bulkRoleAssignSchema.safeParse(input)
  if (!validated.success) {
    return { success: false, processed: 0, failed: 0, errors: [] }
  }

  const { userIds, roleSlugs, action } = validated.data

  try {
    const roles = await prisma.role.findMany({
      where: { slug: { in: roleSlugs } }
    })

    if (roles.length !== roleSlugs.length) {
      const found = new Set(roles.map(r => r.slug))
      const missing = roleSlugs.filter(s => !found.has(s))
      throw new Error(`Invalid roles: ${missing.join(', ')}`)
    }

    await prisma.$transaction(async (tx) => {
      if (action === 'REPLACE') {
        // Remove all existing roles
        await tx.userRole.deleteMany({
          where: { userId: { in: userIds } }
        })
      }

      if (action === 'REMOVE') {
        // Remove specific roles
        await tx.userRole.deleteMany({
          where: {
            userId: { in: userIds },
            roleId: { in: roles.map(r => r.id) }
          }
        })
      }

      if (action === 'ADD' || action === 'REPLACE') {
        // Add roles
        const assignments: Array<{ userId: number; roleId: number }> = []

        for (const userId of userIds) {
          for (const role of roles) {
            // Check if already exists (for ADD action)
            if (action === 'ADD') {
              const existing = await tx.userRole.findUnique({
                where: {
                  userId_roleId: { userId, roleId: role.id }
                }
              })
              if (existing) continue
            }

            assignments.push({ userId, roleId: role.id })
          }
        }

        if (assignments.length > 0) {
          await tx.userRole.createMany({
            data: assignments,
            skipDuplicates: true
          })
        }
      }

      // Audit logs
      await tx.auditLog.createMany({
        data: userIds.map((userId) => ({
          action: 'UPDATE',
          tableName: 'User',
          recordId: userId.toString(),
          userId: parseInt(session.user.id),
          newData: { action, roles: roleSlugs }
        }))
      })
    })

    revalidatePath('/users')
    return { success: true, processed: userIds.length, failed: 0, errors: [] }

  } catch (error: any) {
    return {
      success: false,
      processed: 0,
      failed: userIds.length,
      errors: [{ id: 0, error: error.message }]
    }
  }
}
```

### Bulk Stock Adjustment

```typescript
const bulkStockAdjustSchema = z.object({
  adjustments: z.array(z.object({
    itemId: z.number().int().positive(),
    warehouseId: z.number().int().positive(),
    quantity: z.number().int(), // Can be negative for reduction
    reason: z.string().min(1).max(500)
  })).min(1).max(100)
})

export async function bulkAdjustStock(
  input: z.infer<typeof bulkStockAdjustSchema>
): Promise<BulkResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, processed: 0, failed: 0, errors: [] }
  }

  const validated = bulkStockAdjustSchema.safeParse(input)
  if (!validated.success) {
    return { success: false, processed: 0, failed: 0, errors: [] }
  }

  const { adjustments } = validated.data
  const result: BulkResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: []
  }

  for (const adj of adjustments) {
    try {
      await prisma.$transaction(async (tx) => {
        // Get current stock
        const stockLevel = await tx.stockLevel.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: adj.itemId,
              warehouseId: adj.warehouseId
            }
          }
        })

        const oldQuantity = stockLevel?.quantity || 0
        const newQuantity = oldQuantity + adj.quantity

        if (newQuantity < 0) {
          throw new Error('Insufficient stock')
        }

        // Update or create stock level
        await tx.stockLevel.upsert({
          where: {
            itemId_warehouseId: {
              itemId: adj.itemId,
              warehouseId: adj.warehouseId
            }
          },
          update: { quantity: newQuantity },
          create: {
            itemId: adj.itemId,
            warehouseId: adj.warehouseId,
            quantity: newQuantity,
            minQuantity: 0
          }
        })

        // Create stock movement record
        await tx.stockMovement.create({
          data: {
            itemId: adj.itemId,
            warehouseId: adj.warehouseId,
            quantity: adj.quantity,
            type: adj.quantity > 0 ? 'IN' : 'OUT',
            reason: adj.reason,
            userId: parseInt(session.user.id)
          }
        })

        // Audit log
        await tx.auditLog.create({
          data: {
            action: 'UPDATE',
            tableName: 'StockLevel',
            recordId: `${adj.itemId}-${adj.warehouseId}`,
            userId: parseInt(session.user.id),
            oldData: { quantity: oldQuantity },
            newData: { quantity: newQuantity, reason: adj.reason }
          }
        })

        result.processed++
      })
    } catch (error: any) {
      result.failed++
      result.errors.push({
        id: adj.itemId,
        error: error.message || 'Adjustment failed'
      })
      result.success = false
    }
  }

  revalidatePath('/inventory')
  return result
}
```

### Bulk Request Approval

```typescript
const bulkApprovalSchema = z.object({
  requestIds: z.array(z.number().int().positive()).min(1).max(50),
  action: z.enum(['APPROVE', 'REJECT']),
  notes: z.string().max(500).optional()
})

export async function bulkProcessRequests(
  input: z.infer<typeof bulkApprovalSchema>
): Promise<BulkResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, processed: 0, failed: 0, errors: [] }
  }

  const hasPermission = await hasAnyRole(
    parseInt(session.user.id),
    ['admin', 'superadmin', 'approver']
  )
  if (!hasPermission) {
    return { success: false, processed: 0, failed: 0, errors: [] }
  }

  const validated = bulkApprovalSchema.safeParse(input)
  if (!validated.success) {
    return { success: false, processed: 0, failed: 0, errors: [] }
  }

  const { requestIds, action, notes } = validated.data

  try {
    await prisma.$transaction(async (tx) => {
      // Get pending requests only
      const requests = await tx.request.findMany({
        where: {
          id: { in: requestIds },
          status: 'PENDING'
        },
        include: {
          items: {
            include: { item: true }
          }
        }
      })

      if (requests.length === 0) {
        throw new Error('No pending requests found')
      }

      // Process each request
      for (const request of requests) {
        if (action === 'APPROVE') {
          // Check stock availability for borrow/withdraw
          if (request.type === 'WITHDRAW' || request.type === 'BORROW') {
            for (const item of request.items) {
              const stock = await tx.stockLevel.findFirst({
                where: {
                  itemId: item.itemId,
                  quantity: { gte: item.quantity }
                }
              })

              if (!stock) {
                throw new Error(
                  `Insufficient stock for item ${item.item?.name || item.itemId}`
                )
              }
            }
          }
        }

        // Update request status
        await tx.request.update({
          where: { id: request.id },
          data: {
            status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            approvedById: parseInt(session.user.id),
            approvedAt: new Date(),
            notes: notes ? `${request.notes || ''}\n${notes}`.trim() : request.notes
          }
        })

        // Create audit log
        await tx.auditLog.create({
          data: {
            action,
            tableName: 'Request',
            recordId: request.id.toString(),
            userId: parseInt(session.user.id),
            newData: { status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED', notes }
          }
        })

        // Create notification for requester
        await tx.notification.create({
          data: {
            userId: request.requesterId,
            type: 'REQUEST_UPDATE',
            title: `Request #${request.id} ${action === 'APPROVE' ? 'Approved' : 'Rejected'}`,
            message: notes || `Your request has been ${action.toLowerCase()}ed.`,
            link: `/requests/${request.id}`
          }
        })
      }
    })

    revalidatePath('/requests')
    return { success: true, processed: requestIds.length, failed: 0, errors: [] }

  } catch (error: any) {
    return {
      success: false,
      processed: 0,
      failed: requestIds.length,
      errors: [{ id: 0, error: error.message }]
    }
  }
}
```

---

## Frontend Components

### Bulk Action Dialog

```typescript
// components/bulk/bulk-action-dialog.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { AlertTriangle } from 'lucide-react'

interface BulkActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  destructive?: boolean
  onConfirm: () => Promise<void>
  selectedCount: number
}

export function BulkActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'ยืนยัน / Confirm',
  destructive = false,
  onConfirm,
  selectedCount
}: BulkActionDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (error) {
      console.error('Bulk action error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {destructive && <AlertTriangle className="h-5 w-5 text-destructive" />}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm">
            คุณเลือก <strong>{selectedCount}</strong> รายการ
            / You have selected <strong>{selectedCount}</strong> items
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            ยกเลิก / Cancel
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'กำลังดำเนินการ... / Processing...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Bulk Status Select

```typescript
// components/bulk/bulk-status-select.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { bulkUpdateItemStatus } from '@/lib/actions/bulk'

interface BulkStatusSelectProps {
  selectedIds: number[]
  onComplete: () => void
}

export function BulkStatusSelect({ selectedIds, onComplete }: BulkStatusSelectProps) {
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const handleUpdate = async () => {
    if (!status || selectedIds.length === 0) return

    setLoading(true)
    try {
      const result = await bulkUpdateItemStatus({
        itemIds: selectedIds,
        status: status as 'ACTIVE' | 'INACTIVE' | 'DISPOSED'
      })

      if (result.success) {
        onComplete()
      } else {
        alert(`Failed: ${result.errors.map(e => e.error).join(', ')}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="เลือกสถานะ / Select status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ACTIVE">ใช้งาน / Active</SelectItem>
          <SelectItem value="INACTIVE">ไม่ใช้งาน / Inactive</SelectItem>
          <SelectItem value="DISPOSED">จำหน่าย / Disposed</SelectItem>
        </SelectContent>
      </Select>

      <Button onClick={handleUpdate} disabled={!status || loading}>
        {loading ? 'กำลังอัพเดท...' : 'อัพเดท / Update'}
      </Button>
    </div>
  )
}
```

### Selection Context Provider

```typescript
// contexts/selection-context.tsx
'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface SelectionContextType<T> {
  selected: T[]
  isSelected: (id: T) => boolean
  toggle: (id: T) => void
  selectAll: (ids: T[]) => void
  clearSelection: () => void
  selectedCount: number
}

const SelectionContext = createContext<SelectionContextType<any> | null>(null)

export function SelectionProvider<T extends number | string>({
  children
}: {
  children: ReactNode
}) {
  const [selected, setSelected] = useState<Set<T>>(new Set())

  const isSelected = useCallback((id: T) => selected.has(id), [selected])

  const toggle = useCallback((id: T) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectAll = useCallback((ids: T[]) => {
    setSelected(new Set(ids))
  }, [])

  const clearSelection = useCallback(() => {
    setSelected(new Set())
  }, [])

  return (
    <SelectionContext.Provider
      value={{
        selected: Array.from(selected),
        isSelected,
        toggle,
        selectAll,
        clearSelection,
        selectedCount: selected.size
      }}
    >
      {children}
    </SelectionContext.Provider>
  )
}

export function useSelection<T extends number | string>() {
  const context = useContext(SelectionContext)
  if (!context) {
    throw new Error('useSelection must be used within SelectionProvider')
  }
  return context as SelectionContextType<T>
}
```

---

## Progress Tracking

```typescript
// components/bulk/bulk-progress.tsx
'use client'

import { Progress } from '@/components/ui/progress'

interface BulkProgressProps {
  current: number
  total: number
  label?: string
}

export function BulkProgress({ current, total, label }: BulkProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{label || 'กำลังดำเนินการ... / Processing...'}</span>
        <span>{current} / {total} ({percentage}%)</span>
      </div>
      <Progress value={percentage} />
    </div>
  )
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
