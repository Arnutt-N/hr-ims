---
name: audit-logger
description: Comprehensive audit logging for all CUD operations with before/after snapshots
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["audit", "log", "history", "track", "record change"]
  file_patterns: ["*audit*", "lib/actions/*"]
  context: security, compliance, database
mcp_servers:
  - sequential
personas:
  - security
  - backend
---

# Audit Logger

## Core Role

Implement comprehensive audit logging for HR-IMS:
- Track all Create/Update/Delete operations
- Record before/after data snapshots
- User attribution and timestamps
- Query and display audit history

---

## Audit Log Schema

```prisma
model AuditLog {
  id        Int      @id @default(autoincrement())
  action    String   // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
  tableName String   // Entity name
  recordId  String   // ID of affected record
  userId    Int?     // User who performed action
  oldData   Json?    // Data before change
  newData   Json?    // Data after change
  ipAddress String?  // Request IP
  userAgent String?  // Browser info
  createdAt DateTime @default(now())

  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([tableName])
  @@index([recordId])
  @@index([userId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

---

## Audit Helper Functions

### Core Audit Logger

```typescript
// lib/audit.ts
import prisma from '@/lib/prisma'
import { headers } from 'next/headers'

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'IMPORT'
  | 'APPROVE'
  | 'REJECT'
  | 'ASSIGN'
  | 'TRANSFER'

interface AuditParams {
  action: AuditAction | string
  tableName: string
  recordId: string | number
  userId?: number
  oldData?: any
  newData?: any
}

export async function createAuditLog(params: AuditParams) {
  try {
    const headersList = headers()
    const ipAddress = headersList.get('x-forwarded-for') ||
                      headersList.get('x-real-ip') ||
                      'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    await prisma.auditLog.create({
      data: {
        action: params.action,
        tableName: params.tableName,
        recordId: String(params.recordId),
        userId: params.userId,
        oldData: params.oldData ? JSON.parse(JSON.stringify(params.oldData)) : null,
        newData: params.newData ? JSON.parse(JSON.stringify(params.newData)) : null,
        ipAddress,
        userAgent
      }
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
    // Don't throw - audit logging should not break operations
  }
}

// Convenience functions
export const auditCreate = (tableName: string, recordId: string | number, newData: any, userId?: number) =>
  createAuditLog({ action: 'CREATE', tableName, recordId, newData, userId })

export const auditUpdate = (tableName: string, recordId: string | number, oldData: any, newData: any, userId?: number) =>
  createAuditLog({ action: 'UPDATE', tableName, recordId, oldData, newData, userId })

export const auditDelete = (tableName: string, recordId: string | number, oldData: any, userId?: number) =>
  createAuditLog({ action: 'DELETE', tableName, recordId, oldData, userId })
```

### Usage in Server Actions

```typescript
// lib/actions/inventory.ts
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { auditCreate, auditUpdate, auditDelete } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

export async function createItem(data: ItemInput) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  // Validation...

  const item = await prisma.inventoryItem.create({
    data: validatedData
  })

  // Create audit log
  await auditCreate(
    'InventoryItem',
    item.id,
    item,
    parseInt(session.user.id)
  )

  revalidatePath('/inventory')
  return { success: true, data: item }
}

export async function updateItem(id: number, data: Partial<ItemInput>) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  // Get old data
  const oldItem = await prisma.inventoryItem.findUnique({ where: { id } })
  if (!oldItem) return { error: 'Not found' }

  const item = await prisma.inventoryItem.update({
    where: { id },
    data: validatedData
  })

  // Create audit log with before/after
  await auditUpdate(
    'InventoryItem',
    item.id,
    oldItem,
    item,
    parseInt(session.user.id)
  )

  revalidatePath('/inventory')
  return { success: true, data: item }
}

export async function deleteItem(id: number) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const oldItem = await prisma.inventoryItem.findUnique({ where: { id } })
  if (!oldItem) return { error: 'Not found' }

  await prisma.inventoryItem.delete({ where: { id } })

  // Create audit log with deleted data
  await auditDelete(
    'InventoryItem',
    id,
    oldItem,
    parseInt(session.user.id)
  )

  revalidatePath('/inventory')
  return { success: true }
}
```

---

## Audit Query Functions

```typescript
// lib/actions/audit.ts
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function getAuditLogs(options?: {
  page?: number
  limit?: number
  tableName?: string
  recordId?: string
  userId?: number
  action?: string
  startDate?: Date
  endDate?: Date
}) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  // Only admin/auditor can view logs
  const allowedRoles = ['admin', 'superadmin', 'auditor']
  if (!allowedRoles.includes(session.user.role)) {
    return { error: 'Forbidden' }
  }

  const page = options?.page ?? 1
  const limit = options?.limit ?? 50
  const skip = (page - 1) * limit

  const where: any = {}

  if (options?.tableName) where.tableName = options.tableName
  if (options?.recordId) where.recordId = options.recordId
  if (options?.userId) where.userId = options.userId
  if (options?.action) where.action = options.action
  if (options?.startDate || options?.endDate) {
    where.createdAt = {}
    if (options?.startDate) where.createdAt.gte = options.startDate
    if (options?.endDate) where.createdAt.lte = options.endDate
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    }),
    prisma.auditLog.count({ where })
  ])

  return {
    success: true,
    data: logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

export async function getEntityHistory(tableName: string, recordId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const logs = await prisma.auditLog.findMany({
    where: { tableName, recordId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  })

  return { success: true, data: logs }
}

export async function getUserActivity(userId: number, limit = 50) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const logs = await prisma.auditLog.findMany({
    where: { userId },
    take: limit,
    orderBy: { createdAt: 'desc' }
  })

  return { success: true, data: logs }
}
```

---

## Audit Log Viewer Component

```typescript
// components/audit/audit-log-viewer.tsx
'use client'

import { useState } from 'react'
import { format } from 'date-fns'

interface AuditLog {
  id: number
  action: string
  tableName: string
  recordId: string
  user?: { name: string; email: string }
  createdAt: Date
  oldData: any
  newData: any
}

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  LOGIN: 'bg-purple-100 text-purple-800',
  LOGOUT: 'bg-gray-100 text-gray-800',
  APPROVE: 'bg-emerald-100 text-emerald-800',
  REJECT: 'bg-orange-100 text-orange-800'
}

export function AuditLogViewer({ logs }: { logs: AuditLog[] }) {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div
          key={log.id}
          className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
          onClick={() => setSelectedLog(log)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded text-xs font-medium ${actionColors[log.action] || 'bg-gray-100'}`}>
                {log.action}
              </span>
              <span className="font-medium">{log.tableName}</span>
              <span className="text-gray-500">#{log.recordId}</span>
            </div>
            <div className="text-sm text-gray-500">
              {log.user?.name} • {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm')}
            </div>
          </div>
        </div>
      ))}

      {/* Detail Modal */}
      {selectedLog && (
        <AuditLogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  )
}

function AuditLogDetailModal({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {log.action} - {log.tableName}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {log.oldData && (
            <div>
              <h4 className="font-medium mb-2 text-red-600">Before</h4>
              <pre className="bg-red-50 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(log.oldData, null, 2)}
              </pre>
            </div>
          )}
          {log.newData && (
            <div>
              <h4 className="font-medium mb-2 text-green-600">After</h4>
              <pre className="bg-green-50 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(log.newData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## Best Practices

1. **Always log CUD operations** - Create, Update, Delete must have audit trails
2. **Include old and new data** - Enable change tracking and rollback capability
3. **Don't log sensitive data** - Mask passwords, tokens, etc.
4. **Use JSON serialization** - Handle Date objects and circular references
5. **Handle failures gracefully** - Audit logging should not break main operations
6. **Index audit table** - Optimize queries on tableName, recordId, userId, createdAt
7. **Regular archival** - Move old logs to archive storage for performance

---

## Common Audit Actions

| Action | Description | Has Old Data | Has New Data |
|--------|-------------|--------------|--------------|
| CREATE | New record created | No | Yes |
| UPDATE | Record modified | Yes | Yes |
| DELETE | Record removed | Yes | No |
| LOGIN | User logged in | No | Session info |
| LOGOUT | User logged out | No | No |
| APPROVE | Request approved | Yes (request) | Yes (status) |
| REJECT | Request rejected | Yes (request) | Yes (status) |
| EXPORT | Data exported | No | Export details |
| IMPORT | Data imported | No | Import summary |

---

*Version: 1.0.0 | For HR-IMS Project*
