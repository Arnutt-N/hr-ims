---
name: report-generator
description: Generate reports and analytics for HR-IMS with charts and data visualization
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["report", "analytics", "chart", "statistics", "dashboard", "export"]
  file_patterns: ["*report*", "app/(dashboard)/reports/**"]
  context: reporting, analytics, data visualization
mcp_servers:
  - sequential
personas:
  - analyzer
  - scribe
---

# Report Generator

## Core Role

Generate reports and analytics for HR-IMS:
- Inventory reports (stock levels, movements)
- Request reports (approvals, rejections)
- User activity reports
- Custom reports with filters

---

## Report Types

```yaml
inventory_reports:
  stock_summary:
    description: Current stock levels by warehouse/category
    data: [warehouse, category, item, current_stock, min_stock]
    chart: bar or pie

  stock_movement:
    description: Stock in/out movements over time
    data: [date, item, quantity_change, type, reason]
    chart: line or bar

  low_stock_alert:
    description: Items below minimum stock level
    data: [item, current_stock, min_stock, warehouse]
    chart: table or alert

request_reports:
  by_status:
    description: Requests grouped by status
    data: [status, count, total_items]
    chart: pie or bar

  by_type:
    description: Requests grouped by type (BORROW/WITHDRAW)
    data: [type, count, total_quantity]
    chart: pie or bar

  approval_rate:
    description: Percentage of approved vs rejected requests
    data: [approved, rejected, pending]
    chart: donut

  avg_processing_time:
    description: Average time from request to completion
    data: [date, avg_days]
    chart: line

user_activity:
  new_users:
    description: New user registrations over time
    data: [date, count]
    chart: line

  active_users:
    description: Users who logged in recently
    data: [date, count]
    chart: line

  by_role:
    description: User count by role
    data: [role, count]
    chart: pie

audit_activity:
  actions_by_day:
    description: Number of actions (CREATE/UPDATE/DELETE) per day
    data: [date, create_count, update_count, delete_count]
    chart: stacked bar

  top_users:
    description: Users with most activity
    data: [user, action_count]
    chart: bar

  by_table:
    description: Actions by table
    data: [table, create, update, delete]
    chart: grouped bar
```

---

## Server Actions

### Inventory Reports

```typescript
// lib/actions/reports.ts
'use server'

import prisma from '@/lib/prisma'
import { auth } from '@/auth'

export async function getStockSummary(warehouseId?: number, categoryId?: number) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  try {
    const stockLevels = await prisma.stockLevel.findMany({
      where: {
        ...(warehouseId && { warehouseId }),
        ...(categoryId && { item: { categoryId } })
        quantity: { gt: 0 }
      },
      include: {
        item: {
          include: { category: true }
        },
        warehouse: true
      },
      orderBy: { item: { name: 'asc' } }
    })

    const summary = stockLevels.map(sl => ({
      itemId: sl.itemId,
      itemName: sl.item.name,
      category: sl.item.category?.name,
      warehouse: sl.warehouse.name,
      currentStock: sl.quantity,
      minStock: sl.minQuantity,
      status: sl.quantity <= sl.minQuantity ? 'LOW' : 'OK'
    }))

    return { success: true, data: summary }
  } catch (error) {
    console.error('Stock summary error:', error)
    return { error: 'Failed to generate report', code: 'INTERNAL_ERROR' }
  }
}

export async function getStockMovement(
  itemId?: number,
  warehouseId?: number,
  startDate?: Date,
  endDate?: Date
) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  try {
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        tableName: { in: ['InventoryItem', 'StockLevel'] },
        ...(itemId && { recordId: itemId.toString() }),
        action: { in: ['CREATE', 'UPDATE'] },
        createdAt: {
          gte: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lte: endDate || new Date()
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    const movements = auditLogs.map(log => {
      const oldQty = log.oldData?.quantity ?? 0
      const newQty = log.newData?.quantity ?? 0
      return {
        date: log.createdAt,
        item: log.newData?.name || log.oldData?.name,
        quantityChange: newQty - oldQty,
        type: log.action,
        user: log.user?.name
      }
    })

    return { success: true, data: movements }
  } catch (error) {
    return { error: 'Failed to get movements', code: 'INTERNAL_ERROR' }
  }
}

export async function getLowStockAlerts() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  try {
    const lowStockItems = await prisma.stockLevel.findMany({
      where: {
        quantity: { lte: prisma.stockLevel.fields.minQuantity }
      },
      include: {
        item: {
          include: { category: true }
        },
        warehouse: true
      }
      orderBy: { quantity: 'asc' }
    })

    return {
      success: true,
      data: lowStockItems.map(sl => ({
        itemId: sl.itemId,
      itemName: sl.item.name,
      category: sl.item.category?.name,
      warehouse: sl.warehouse.name,
      currentStock: sl.quantity,
      minStock: sl.minQuantity,
      shortage: sl.minQuantity - sl.quantity
    }))
  } catch (error) {
    return { error: 'Failed to get alerts', code: 'INTERNAL_ERROR' }
  }
}
```

### Request Reports
```typescript
export async function getRequestByStatus() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  try {
    const byStatus = await prisma.request.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { items: { _count: { quantity: true } } }
    })

    return { success: true, data: byStatus }
  } catch (error) {
    return { error: 'Failed to get report', code: 'INTERNAL_ERROR' }
  }
}

export async function getRequestByType() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  try {
    const byType = await prisma.request.groupBy({
      by: ['type'],
      _count: { id: true },
      _sum: { items: { _sum: { quantity: true } } }
    })

    return { success: true, data: byType }
  } catch (error) {
    return { error: 'Failed to get report', code: 'INTERNAL_ERROR' }
  }
}

export async function getApprovalRate(startDate?: Date, endDate?: Date) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  try {
    const requests = await prisma.request.findMany({
      where: {
        createdAt: {
          gte: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lte: endDate || new Date()
        },
        status: { in: ['APPROVED', 'REJECTED'] }
      },
      select: { status: true }
    })

    const total = requests.length
    const approved = requests.filter(r => r.status === 'APPROVED').length
    const rejected = requests.filter(r => r.status === 'REJECTED').length
    const pending = await prisma.request.count({
      where: { status: 'PENDING' }
    })

    return {
      success: true,
      data: {
        total,
        approved,
        rejected,
        pending,
        approvalRate: total > 0 ? (approved / total * 100).toFixed(1) : 0
      }
    }
  } catch (error) {
    return { error: 'Failed to get rate', code: 'INTERNAL_ERROR' }
  }
}
```

### User Activity Reports
```typescript
export async function getNewUsers(days: number = 30) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  try {
    const users = await prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        }
      },
      _count: { id: true }
    })

    return { success: true, data: users }
  } catch (error) {
    return { error: 'Failed to get users', code: 'INTERNAL_ERROR' }
  }
}

export async function getUsersByRole() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  try {
    const users = await prisma.user.findMany({
      include: {
        userRoles: {
          include: { role: true }
        }
      }
    })

    const byRole: Record<string, number> = {}

    users.forEach(user => {
      user.userRoles.forEach(ur => {
        const roleName = ur.role.name
        byRole[roleName] = (byRole[roleName] || 0) + 1
      })
    })

    return { success: true, data: byRole }
  } catch (error) {
    return { error: 'Failed to get users', code: 'INTERNAL_ERROR' }
  }
}
```

### Audit Activity Reports
```typescript
export async function getActionsByDay(days: number = 7) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // Check if user has auditor or admin role
  const hasPermission = await hasAnyRole(
    parseInt(session.user.id),
    ['admin', 'superadmin', 'auditor']
  )

  if (!hasPermission) {
    return { error: 'Forbidden', code: 'FORBIDDEN' }
  }

  try {
    const logs = await prisma.$queryRaw`
      SELECT
        DATE(createdAt) as date,
        COUNT(*) FILTER (action = 'CREATE') as create_count,
        COUNT(*) FILTER (action = 'UPDATE') as update_count,
        COUNT(*) FILTER (action = 'DELETE') as delete_count
      FROM audit_logs
      WHERE createdAt >= datetime('now', '-${days} days')
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
    `

    return { success: true, data: logs }
  } catch (error) {
    return { error: 'Failed to get logs', code: 'INTERNAL_ERROR' }
  }
}

export async function getTopUsers(limit: number = 10) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  try {
    const users = await prisma.auditLog.groupBy({
      by: ['userId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit
    })

    const usersWithNames = await Promise.all(
      users.map(async (u) => {
        const user = await prisma.user.findUnique({
          where: { id: u.userId },
          select: { id: true, name: true, email: true }
        })
        return { ...user, actionCount: u._count.id }
      })
    )

    return { success: true, data: usersWithNames }
  } catch (error) {
    return { error: 'Failed to get users', code: 'INTERNAL_ERROR' }
  }
}
```

---

## Export Functionality

```typescript
export async function exportReport(
  reportType: 'stock_summary' | 'request_by_status' | 'audit_activity',
  format: 'csv' | 'json' = 'csv'
) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const hasPermission = await hasAnyRole(
    parseInt(session.user.id),
    ['admin', 'superadmin', 'auditor']
  )

  if (!hasPermission) {
    return { error: 'Forbidden', code: 'FORBIDDEN' }
  }

  let data: any[]
  let filename: string

  switch (reportType) {
    case 'stock_summary':
      const result = await getStockSummary()
      data = result.data
      filename = 'stock_summary'
      break
    case 'request_by_status':
      const result2 = await getRequestByStatus()
      data = result2.data
      filename = 'request_by_status'
      break
    case 'audit_activity':
      const result3 = await getActionsByDay()
      data = result3.data
      filename = 'audit_activity'
      break
    default:
      return { error: 'Invalid report type', code: 'VALIDATION_ERROR' }
  }

  if (format === 'json') {
    return {
      success: true,
      data: JSON.stringify(data, null, 2),
      filename: `${filename}.json`,
      mimeType: 'application/json'
    }
  }

  // CSV format
  const csv = convertToCSV(data)
  return {
    success: true,
    data: csv,
    filename: `${filename}.csv`,
    mimeType: 'text/csv'
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  const rows = data.map(obj =>
    headers.map(h =>
      JSON.stringify(obj[h] ?? '')
    ).join(',')
  )

  return [headers.join(','), ...rows].join('\n')].join('\n')
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
