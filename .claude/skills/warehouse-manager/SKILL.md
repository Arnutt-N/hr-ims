---
name: warehouse-manager
description: Multi-warehouse inventory management with stock levels and transfers
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["warehouse", "stock", "inventory", "transfer", "stock level"]
  file_patterns: ["*warehouse*", "*stock*", "app/(dashboard)/warehouse/**"]
  context: inventory, warehouse, stock management
mcp_servers:
  - sequential
personas:
  - backend
  - architect
---

# Warehouse Manager

## Core Role

Manage multi-warehouse inventory operations:
- Warehouse CRUD operations
- Stock level tracking per warehouse
- Inter-warehouse transfers
- Stock adjustment and reconciliation

---

## Data Model

```prisma
model Warehouse {
  id          Int           @id @default(autoincrement())
  name        String        @db.VarChar(255)
  code        String        @unique @db.VarChar(50)
  location    String?
  description String?
  status      WarehouseStatus @default(ACTIVE)
  isDefault   Boolean       @default(false)

  stockLevels  StockLevel[]
  transfers    Transfer[]   @relation("SourceWarehouse")
  received     Transfer[]   @relation("DestWarehouse")

  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  @@map("warehouses")
}

model StockLevel {
  id           Int       @id @default(autoincrement())
  itemId       Int
  warehouseId  Int
  quantity     Int       @default(0)
  minQuantity  Int       @default(0)
  maxQuantity  Int?

  item         InventoryItem @relation(fields: [itemId], references: [id])
  warehouse    Warehouse     @relation(fields: [warehouseId], references: [id])

  @@unique([itemId, warehouseId])
  @@map("stock_levels")
}

model Transfer {
  id              Int           @id @default(autoincrement())
  sourceWarehouseId  Int
  destWarehouseId    Int
  status          TransferStatus @default(PENDING)
  notes           String?

  sourceWarehouse Warehouse @relation("SourceWarehouse", fields: [sourceWarehouseId], references: [id])
  destWarehouse   Warehouse @relation("DestWarehouse", fields: [destWarehouseId], references: [id])
  items           TransferItem[]

  createdById     Int
  createdBy       User      @relation(fields: [createdById], references: [id])
  approvedById    Int?
  approvedBy      User?     @relation(fields: [approvedById], references: [id])
  approvedAt      DateTime?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@map("transfers")
}

model TransferItem {
  id          Int      @id @default(autoincrement())
  transferId  Int
  itemId      Int
  quantity    Int

  transfer    Transfer @relation(fields: [transferId], references: [id], onDelete: Cascade)
  item        InventoryItem @relation(fields: [itemId], references: [id])

  @@map("transfer_items")
}

enum WarehouseStatus {
  ACTIVE
  INACTIVE
  MAINTENANCE
}

enum TransferStatus {
  PENDING
  APPROVED
  IN_TRANSIT
  COMPLETED
  CANCELLED
}
```

---

## Server Actions

### Warehouse Management

```typescript
// lib/actions/warehouse.ts
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const createWarehouseSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(2).max(50).toUpperCase(),
  location: z.string().optional(),
  description: z.string().optional(),
  isDefault: z.boolean().default(false)
})

export async function createWarehouse(input: z.infer<typeof createWarehouseSchema>) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const hasPermission = await hasAnyRole(parseInt(session.user.id), ['admin', 'superadmin'])
  if (!hasPermission) {
    return { error: 'Forbidden', code: 'FORBIDDEN' }
  }

  const validated = createWarehouseSchema.safeParse(input)
  if (!validated.success) {
    return { error: 'Invalid input', code: 'VALIDATION_ERROR', details: validated.error.flatten() }
  }

  try {
    // Check unique code
    const existing = await prisma.warehouse.findUnique({
      where: { code: validated.data.code }
    })
    if (existing) {
      return { error: 'Warehouse code already exists', code: 'DUPLICATE' }
    }

    const warehouse = await prisma.$transaction(async (tx) => {
      // If setting as default, unset other defaults
      if (validated.data.isDefault) {
        await tx.warehouse.updateMany({
          where: { isDefault: true },
          data: { isDefault: false }
        })
      }

      const newWarehouse = await tx.warehouse.create({
        data: validated.data
      })

      // Create initial stock levels for all items
      const items = await tx.inventoryItem.findMany()
      if (items.length > 0) {
        await tx.stockLevel.createMany({
          data: items.map(item => ({
            itemId: item.id,
            warehouseId: newWarehouse.id,
            quantity: 0
          }))
        })
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          tableName: 'Warehouse',
          recordId: newWarehouse.id.toString(),
          userId: parseInt(session.user.id),
          newData: newWarehouse
        }
      })

      return newWarehouse
    })

    revalidatePath('/warehouse')
    return { success: true, data: warehouse }

  } catch (error) {
    console.error('Create warehouse error:', error)
    return { error: 'Failed to create warehouse', code: 'INTERNAL_ERROR' }
  }
}
```

### Stock Level Operations

```typescript
export async function updateStockLevel(
  itemId: number,
  warehouseId: number,
  quantity: number,
  reason?: string
) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const hasPermission = await hasAnyRole(parseInt(session.user.id), ['admin', 'superadmin', 'approver'])
  if (!hasPermission) {
    return { error: 'Forbidden', code: 'FORBIDDEN' }
  }

  try {
    const stockLevel = await prisma.stockLevel.findUnique({
      where: {
        itemId_warehouseId: { itemId, warehouseId }
      }
    })

    if (!stockLevel) {
      // Create if doesn't exist
      const newStockLevel = await prisma.stockLevel.create({
        data: { itemId, warehouseId, quantity }
      })
      return { success: true, data: newStockLevel }
    }

    const oldQuantity = stockLevel.quantity
    const updatedStockLevel = await prisma.$transaction(async (tx) => {
      const updated = await tx.stockLevel.update({
        where: { id: stockLevel.id },
        data: { quantity }
      })

      await tx.auditLog.create({
        data: {
          action: 'UPDATE_STOCK',
          tableName: 'StockLevel',
          recordId: `${itemId}-${warehouseId}`,
          userId: parseInt(session.user.id),
          oldData: { quantity: oldQuantity },
          newData: { quantity, reason }
        }
      })

      return updated
    })

    revalidatePath('/warehouse')
    revalidatePath('/inventory')
    return { success: true, data: updatedStockLevel }

  } catch (error) {
    console.error('Update stock level error:', error)
    return { error: 'Failed to update stock level', code: 'INTERNAL_ERROR' }
  }
}

export async function adjustStock(
  itemId: number,
  warehouseId: number,
  adjustment: number, // positive to add, negative to subtract
  reason: string
) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const stockLevel = await tx.stockLevel.findUnique({
        where: { itemId_warehouseId: { itemId, warehouseId } }
      })

      if (!stockLevel) {
        throw new Error('Stock level not found')
      }

      const newQuantity = stockLevel.quantity + adjustment
      if (newQuantity < 0) {
        throw new Error('Insufficient stock')
      }

      const updated = await tx.stockLevel.update({
        where: { id: stockLevel.id },
        data: { quantity: newQuantity }
      })

      await tx.auditLog.create({
        data: {
          action: 'ADJUST_STOCK',
          tableName: 'StockLevel',
          recordId: `${itemId}-${warehouseId}`,
          userId: parseInt(session.user.id),
          oldData: { quantity: stockLevel.quantity },
          newData: { quantity: newQuantity, adjustment, reason }
        }
      })

      return updated
    })

    revalidatePath('/warehouse')
    return { success: true, data: result }

  } catch (error: any) {
    return { error: error.message || 'Failed to adjust stock', code: 'INTERNAL_ERROR' }
  }
}
```

### Inter-Warehouse Transfer

```typescript
const createTransferSchema = z.object({
  sourceWarehouseId: z.number().positive(),
  destWarehouseId: z.number().positive(),
  items: z.array(z.object({
    itemId: z.number().positive(),
    quantity: z.number().positive()
  })).min(1),
  notes: z.string().optional()
})

export async function createTransfer(input: z.infer<typeof createTransferSchema>) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  if (input.sourceWarehouseId === input.destWarehouseId) {
    return { error: 'Source and destination must be different', code: 'VALIDATION_ERROR' }
  }

  try {
    // Verify stock availability
    for (const item of input.items) {
      const stockLevel = await prisma.stockLevel.findUnique({
        where: {
          itemId_warehouseId: {
            itemId: item.itemId,
            warehouseId: input.sourceWarehouseId
          }
        }
      })

      if (!stockLevel || stockLevel.quantity < item.quantity) {
        return { error: `Insufficient stock for item ${item.itemId}`, code: 'INSUFFICIENT_STOCK' }
      }
    }

    const transfer = await prisma.$transaction(async (tx) => {
      // Deduct from source warehouse
      for (const item of input.items) {
        await tx.stockLevel.update({
          where: {
            itemId_warehouseId: {
              itemId: item.itemId,
              warehouseId: input.sourceWarehouseId
            }
          },
          data: { quantity: { decrement: item.quantity } }
        })
      }

      // Create transfer record
      const newTransfer = await tx.transfer.create({
        data: {
          sourceWarehouseId: input.sourceWarehouseId,
          destWarehouseId: input.destWarehouseId,
          notes: input.notes,
          createdById: parseInt(session.user.id),
          status: 'PENDING',
          items: {
            create: input.items
          }
        },
        include: { items: true, sourceWarehouse: true, destWarehouse: true }
      })

      await tx.auditLog.create({
        data: {
          action: 'CREATE_TRANSFER',
          tableName: 'Transfer',
          recordId: newTransfer.id.toString(),
          userId: parseInt(session.user.id),
          newData: newTransfer
        }
      })

      return newTransfer
    })

    revalidatePath('/warehouse')
    return { success: true, data: transfer }

  } catch (error) {
    console.error('Create transfer error:', error)
    return { error: 'Failed to create transfer', code: 'INTERNAL_ERROR' }
  }
}

export async function completeTransfer(transferId: number) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  try {
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: { items: true }
    })

    if (!transfer) {
      return { error: 'Transfer not found', code: 'NOT_FOUND' }
    }

    if (transfer.status !== 'PENDING' && transfer.status !== 'IN_TRANSIT') {
      return { error: 'Transfer cannot be completed', code: 'INVALID_STATUS' }
    }

    await prisma.$transaction(async (tx) => {
      // Add to destination warehouse
      for (const item of transfer.items) {
        const destStock = await tx.stockLevel.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: item.itemId,
              warehouseId: transfer.destWarehouseId
            }
          }
        })

        if (destStock) {
          await tx.stockLevel.update({
            where: { id: destStock.id },
            data: { quantity: { increment: item.quantity } }
          })
        } else {
          await tx.stockLevel.create({
            data: {
              itemId: item.itemId,
              warehouseId: transfer.destWarehouseId,
              quantity: item.quantity
            }
          })
        }
      }

      // Update transfer status
      await tx.transfer.update({
        where: { id: transferId },
        data: {
          status: 'COMPLETED',
          approvedById: parseInt(session.user.id),
          approvedAt: new Date()
        }
      })

      await tx.auditLog.create({
        data: {
          action: 'COMPLETE_TRANSFER',
          tableName: 'Transfer',
          recordId: transferId.toString(),
          userId: parseInt(session.user.id)
        }
      })
    })

    revalidatePath('/warehouse')
    return { success: true }

  } catch (error) {
    console.error('Complete transfer error:', error)
    return { error: 'Failed to complete transfer', code: 'INTERNAL_ERROR' }
  }
}
```

---

## Query Patterns

```typescript
// Get stock levels by warehouse
export async function getWarehouseStock(warehouseId: number) {
  const stockLevels = await prisma.stockLevel.findMany({
    where: { warehouseId },
    include: {
      item: {
        include: { category: true }
      }
    },
    orderBy: { item: { name: 'asc' } }
  })

  return { success: true, data: stockLevels }
}

// Get low stock alerts
export async function getLowStockAlerts() {
  const alerts = await prisma.stockLevel.findMany({
    where: {
      quantity: { lte: prisma.stockLevel.fields.minQuantity }
    },
    include: {
      item: true,
      warehouse: true
    }
  })

  return { success: true, data: alerts }
}

// Get stock summary
export async function getStockSummary(itemId: number) {
  const stockLevels = await prisma.stockLevel.findMany({
    where: { itemId },
    include: { warehouse: true }
  })

  const total = stockLevels.reduce((sum, sl) => sum + sl.quantity, 0)
  const available = stockLevels
    .filter(sl => sl.warehouse.status === 'ACTIVE')
    .reduce((sum, sl) => sum + sl.quantity, 0)

  return {
    success: true,
    data: {
      total,
      available,
      byWarehouse: stockLevels
    }
  }
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
