---
name: maintenance-tracker
description: Equipment maintenance ticket system with scheduling and status tracking
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["maintenance", "repair", "ticket", "technician", "schedule", "equipment"]
  file_patterns: ["*maintenance*", "app/(dashboard)/maintenance/**"]
  context: maintenance, repair, equipment management
mcp_servers:
  - sequential
personas:
  - backend
  - technician
---

# Maintenance Tracker

## Core Role

Manage equipment maintenance for HR-IMS:
- Maintenance ticket creation and tracking
- Technician assignment
- Scheduling preventive maintenance
- Status workflow management

---

## Data Model

```prisma
model MaintenanceTicket {
  id              Int               @id @default(autoincrement())
  ticketNumber    String            @unique @db.VarChar(50)
  itemId          Int
  title           String            @db.VarChar(255)
  description     String            @db.Text
  priority        MaintenancePriority @default(MEDIUM)
  status          MaintenanceStatus @default(OPEN)
  type            MaintenanceType

  // Assignment
  reportedById    Int
  reportedBy      User              @relation("ReportedTickets", fields: [reportedById], references: [id])
  assignedToId    Int?
  assignedTo      User?             @relation("AssignedTickets", fields: [assignedToId], references: [id])
  assignedAt      DateTime?

  // Scheduling
  scheduledDate   DateTime?
  completedDate   DateTime?

  // Details
  estimatedCost   Decimal?          @db.Decimal(10, 2)
  actualCost      Decimal?          @db.Decimal(10, 2)
  notes           String?

  // Resolution
  resolution      String?
  partsReplaced   String?

  item            InventoryItem     @relation(fields: [itemId], references: [id])

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([status])
  @@index([assignedToId])
  @@index([scheduledDate])
  @@map("maintenance_tickets")
}

model MaintenanceSchedule {
  id              Int       @id @default(autoincrement())
  itemId          Int
  frequency       String    @db.VarChar(20)  // daily, weekly, monthly, quarterly, yearly
  nextDueDate     DateTime
  lastCompletedAt DateTime?
  isActive        Boolean   @default(true)
  notes           String?

  item            InventoryItem @relation(fields: [itemId], references: [id])

  @@map("maintenance_schedules")
}

enum MaintenancePriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum MaintenanceStatus {
  OPEN
  IN_PROGRESS
  ON_HOLD
  COMPLETED
  CANCELLED
}

enum MaintenanceType {
  PREVENTIVE
  CORRECTIVE
  EMERGENCY
  INSPECTION
}
```

---

## Server Actions

### Create Maintenance Ticket

```typescript
// lib/actions/maintenance.ts
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const createTicketSchema = z.object({
  itemId: z.number().positive(),
  title: z.string().min(5).max(255),
  description: z.string().min(10),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  type: z.enum(['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY', 'INSPECTION']),
  scheduledDate: z.date().optional(),
  estimatedCost: z.number().optional()
})

export async function createTicket(input: z.infer<typeof createTicketSchema>) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const validated = createTicketSchema.safeParse(input)
  if (!validated.success) {
    return { error: 'Invalid input', code: 'VALIDATION_ERROR', details: validated.error.flatten() }
  }

  try {
    // Verify item exists
    const item = await prisma.inventoryItem.findUnique({
      where: { id: validated.data.itemId }
    })
    if (!item) {
      return { error: 'Item not found', code: 'NOT_FOUND' }
    }

    // Generate ticket number
    const ticketCount = await prisma.maintenanceTicket.count()
    const ticketNumber = `MNT-${new Date().getFullYear()}-${String(ticketCount + 1).padStart(5, '0')}`

    const ticket = await prisma.$transaction(async (tx) => {
      const newTicket = await tx.maintenanceTicket.create({
        data: {
          ticketNumber,
          itemId: validated.data.itemId,
          title: validated.data.title,
          description: validated.data.description,
          priority: validated.data.priority,
          type: validated.data.type,
          scheduledDate: validated.data.scheduledDate,
          estimatedCost: validated.data.estimatedCost,
          reportedById: parseInt(session.user.id),
          status: 'OPEN'
        }
      })

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          tableName: 'MaintenanceTicket',
          recordId: newTicket.id.toString(),
          userId: parseInt(session.user.id),
          newData: newTicket
        }
      })

      // Notify technicians
      const technicians = await tx.user.findMany({
        where: {
          userRoles: {
            some: { role: { slug: 'technician' } }
          }
        }
      })

      await tx.notification.createMany({
        data: technicians.map(t => ({
          userId: t.id,
          type: 'MAINTENANCE_DUE',
          title: 'New Maintenance Ticket',
          message: `New ${validated.data.priority} priority ticket: ${validated.data.title}`,
          link: `/maintenance/${newTicket.id}`
        }))
      })

      return newTicket
    })

    revalidatePath('/maintenance')
    return { success: true, data: ticket }

  } catch (error) {
    console.error('Create ticket error:', error)
    return { error: 'Failed to create ticket', code: 'INTERNAL_ERROR' }
  }
}
```

### Assign Technician

```typescript
export async function assignTechnician(ticketId: number, technicianId: number) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const hasPermission = await hasAnyRole(
    parseInt(session.user.id),
    ['admin', 'superadmin', 'approver']
  )
  if (!hasPermission) {
    return { error: 'Forbidden', code: 'FORBIDDEN' }
  }

  try {
    const ticket = await prisma.maintenanceTicket.update({
      where: { id: ticketId },
      data: {
        assignedToId: technicianId,
        assignedAt: new Date(),
        status: 'IN_PROGRESS'
      }
    })

    // Notify technician
    await prisma.notification.create({
      data: {
        userId: technicianId,
        type: 'MAINTENANCE_DUE',
        title: 'Ticket Assigned',
        message: `Maintenance ticket ${ticket.ticketNumber} has been assigned to you`,
        link: `/maintenance/${ticketId}`
      }
    })

    revalidatePath('/maintenance')
    return { success: true, data: ticket }

  } catch (error) {
    return { error: 'Failed to assign technician', code: 'INTERNAL_ERROR' }
  }
}
```

### Update Status

```typescript
const updateStatusSchema = z.object({
  ticketId: z.number().positive(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
  notes: z.string().optional(),
  actualCost: z.number().optional(),
  resolution: z.string().optional(),
  partsReplaced: z.string().optional()
})

export async function updateTicketStatus(input: z.infer<typeof updateStatusSchema>) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const validated = updateStatusSchema.safeParse(input)
  if (!validated.success) {
    return { error: 'Invalid input', code: 'VALIDATION_ERROR' }
  }

  try {
    const existingTicket = await prisma.maintenanceTicket.findUnique({
      where: { id: validated.data.ticketId }
    })
    if (!existingTicket) {
      return { error: 'Ticket not found', code: 'NOT_FOUND' }
    }

    const updateData: any = {
      status: validated.data.status,
      notes: validated.data.notes
    }

    if (validated.data.status === 'COMPLETED') {
      updateData.completedDate = new Date()
      updateData.resolution = validated.data.resolution
      updateData.partsReplaced = validated.data.partsReplaced
      updateData.actualCost = validated.data.actualCost
    }

    const ticket = await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceTicket.update({
        where: { id: validated.data.ticketId },
        data: updateData
      })

      await tx.auditLog.create({
        data: {
          action: 'UPDATE',
          tableName: 'MaintenanceTicket',
          recordId: validated.data.ticketId.toString(),
          userId: parseInt(session.user.id),
          oldData: existingTicket,
          newData: updated
        }
      })

      return updated
    })

    revalidatePath('/maintenance')
    return { success: true, data: ticket }

  } catch (error) {
    return { error: 'Failed to update status', code: 'INTERNAL_ERROR' }
  }
}
```

### Maintenance Scheduling

```typescript
export async function createMaintenanceSchedule(input: {
  itemId: number
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  notes?: string
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const hasPermission = await hasAnyRole(parseInt(session.user.id), ['admin', 'superadmin'])
  if (!hasPermission) {
    return { error: 'Forbidden', code: 'FORBIDDEN' }
  }

  const nextDueDate = calculateNextDueDate(input.frequency)

  const schedule = await prisma.maintenanceSchedule.create({
    data: {
      itemId: input.itemId,
      frequency: input.frequency,
      nextDueDate,
      notes: input.notes,
      isActive: true
    }
  })

  return { success: true, data: schedule }
}

function calculateNextDueDate(frequency: string): Date {
  const now = new Date()
  switch (frequency) {
    case 'daily':
      return new Date(now.setDate(now.getDate() + 1))
    case 'weekly':
      return new Date(now.setDate(now.getDate() + 7))
    case 'monthly':
      return new Date(now.setMonth(now.getMonth() + 1))
    case 'quarterly':
      return new Date(now.setMonth(now.getMonth() + 3))
    case 'yearly':
      return new Date(now.setFullYear(now.getFullYear() + 1))
    default:
      return new Date(now.setMonth(now.getMonth() + 1))
  }
}
```

---

## Query Patterns

```typescript
// Get tickets by status
export async function getTicketsByStatus(status?: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const tickets = await prisma.maintenanceTicket.findMany({
    where: status ? { status: status as any } : undefined,
    include: {
      item: { select: { id: true, name: true, serialNumber: true } },
      reportedBy: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  return { success: true, data: tickets }
}

// Get technician's assigned tickets
export async function getMyAssignedTickets() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const tickets = await prisma.maintenanceTicket.findMany({
    where: {
      assignedToId: parseInt(session.user.id),
      status: { in: ['OPEN', 'IN_PROGRESS', 'ON_HOLD'] }
    },
    include: {
      item: true
    },
    orderBy: { priority: 'desc' }
  })

  return { success: true, data: tickets }
}

// Get overdue maintenance
export async function getOverdueMaintenance() {
  const schedules = await prisma.maintenanceSchedule.findMany({
    where: {
      nextDueDate: { lt: new Date() },
      isActive: true
    },
    include: {
      item: true
    }
  })

  return { success: true, data: schedules }
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
