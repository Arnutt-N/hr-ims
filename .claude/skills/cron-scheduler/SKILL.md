---
name: cron-scheduler
description: Scheduled tasks and cron jobs for automated maintenance and notifications
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["cron", "schedule", "scheduled", "job", "task", "automation", "timer"]
  file_patterns: ["*cron*", "*schedule*", "lib/cron/**", "app/api/cron/**"]
  context: automation, scheduling, background tasks
mcp_servers:
  - sequential
personas:
  - backend
  - devops
---

# Cron Scheduler

## Core Role

Manage scheduled tasks for HR-IMS:
- Automated stock alerts
- Maintenance reminders
- Report generation
- Data cleanup
- Email notifications

---

## Implementation Options

### Option 1: Vercel Cron Jobs (Recommended for Production)

```typescript
// app/api/cron/stock-alerts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

// Vercel Cron: 0 9 * * * (Daily at 9 AM)
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find low stock items
    const lowStockItems = await prisma.stockLevel.findMany({
      where: {
        quantity: { lte: prisma.stockLevel.fields.minQuantity }
      },
      include: {
        item: true,
        warehouse: true
      }
    })

    if (lowStockItems.length === 0) {
      return NextResponse.json({ message: 'No low stock items' })
    }

    // Get admins to notify
    const admins = await prisma.user.findMany({
      where: {
        userRoles: {
          some: { role: { slug: { in: ['admin', 'superadmin'] } } }
        },
        status: 'ACTIVE'
      }
    })

    // Send notifications
    await Promise.all([
      // In-app notifications
      prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          type: 'LOW_STOCK',
          title: 'Low Stock Alert',
          message: `${lowStockItems.length} items are below minimum stock level`,
          link: '/inventory?alert=low_stock'
        }))
      }),

      // Email notifications
      ...admins.map(admin =>
        sendEmail({
          to: admin.email,
          subject: 'Daily Low Stock Alert',
          html: generateLowStockEmail(lowStockItems)
        })
      )
    ])

    return NextResponse.json({
      success: true,
      alertedItems: lowStockItems.length,
      notifiedUsers: admins.length
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

function generateLowStockEmail(items: any[]): string {
  return `
    <h2>Low Stock Alert</h2>
    <p>The following items are below minimum stock level:</p>
    <table style="width:100%; border-collapse: collapse;">
      <tr style="background: #f5f5f5;">
        <th style="padding: 8px; text-align: left;">Item</th>
        <th style="padding: 8px; text-align: left;">Warehouse</th>
        <th style="padding: 8px; text-align: right;">Current</th>
        <th style="padding: 8px; text-align: right;">Minimum</th>
      </tr>
      ${items.map(item => `
        <tr>
          <td style="padding: 8px;">${item.item.name}</td>
          <td style="padding: 8px;">${item.warehouse.name}</td>
          <td style="padding: 8px; text-align: right; color: red;">${item.quantity}</td>
          <td style="padding: 8px; text-align: right;">${item.minQuantity}</td>
        </tr>
      `).join('')}
    </table>
    <p><a href="${process.env.NEXTAUTH_URL}/inventory">View Inventory</a></p>
  `
}
```

### Option 2: BullMQ (Recommended for Complex Scheduling)

```typescript
// lib/queue/index.ts
import Queue from 'bull'
import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

// Redis connection
const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
}

// Create queues
export const emailQueue = new Queue('email', { redis: redisOptions })
export const reportQueue = new Queue('report', { redis: redisOptions })
export const maintenanceQueue = new Queue('maintenance', { redis: redisOptions })

// Email job processor
emailQueue.process(async (job) => {
  const { to, subject, html } = job.data
  return sendEmail({ to, subject, html })
})

// Report generation processor
reportQueue.process(async (job) => {
  const { type, userId, filters } = job.data

  switch (type) {
    case 'stock_summary':
      return generateStockSummaryReport(userId, filters)
    case 'request_activity':
      return generateRequestActivityReport(userId, filters)
    default:
      throw new Error(`Unknown report type: ${type}`)
  }
})

// Maintenance processor
maintenanceQueue.process(async (job) => {
  const { task } = job.data

  switch (task) {
    case 'check_due_maintenance':
      return checkDueMaintenance()
    case 'cleanup_old_logs':
      return cleanupOldLogs()
    default:
      throw new Error(`Unknown maintenance task: ${task}`)
  }
})

// Schedule recurring jobs
export async function scheduleRecurringJobs() {
  // Daily stock alert - 9 AM
  await emailQueue.add(
    'daily-stock-alert',
    { task: 'stock_alert' },
    {
      repeat: { cron: '0 9 * * *' },
      removeOnComplete: 10
    }
  )

  // Weekly report - Monday 8 AM
  await reportQueue.add(
    'weekly-summary',
    { type: 'weekly_summary' },
    {
      repeat: { cron: '0 8 * * 1' },
      removeOnComplete: 10
    }
  )

  // Maintenance check - Every 6 hours
  await maintenanceQueue.add(
    'due-maintenance-check',
    { task: 'check_due_maintenance' },
    {
      repeat: { cron: '0 */6 * * *' },
      removeOnComplete: 10
    }
  )

  // Log cleanup - Daily at 2 AM
  await maintenanceQueue.add(
    'log-cleanup',
    { task: 'cleanup_old_logs' },
    {
      repeat: { cron: '0 2 * * *' },
      removeOnComplete: 10
    }
  )
}
```

---

## Scheduled Tasks

### Maintenance Due Check

```typescript
// lib/cron/maintenance-check.ts
import prisma from '@/lib/prisma'

export async function checkDueMaintenance() {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Find items with due maintenance
  const dueItems = await prisma.maintenanceSchedule.findMany({
    where: {
      isActive: true,
      nextDueDate: { lte: tomorrow }
    },
    include: {
      item: true
    }
  })

  for (const schedule of dueItems) {
    // Check if ticket already exists
    const existingTicket = await prisma.maintenanceTicket.findFirst({
      where: {
        itemId: schedule.itemId,
        type: 'PREVENTIVE',
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      }
    })

    if (!existingTicket) {
      // Create maintenance ticket
      const ticket = await prisma.maintenanceTicket.create({
        data: {
          itemId: schedule.itemId,
          title: `Preventive Maintenance: ${schedule.item.name}`,
          description: 'Scheduled preventive maintenance',
          type: 'PREVENTIVE',
          priority: 'MEDIUM',
          scheduledDate: schedule.nextDueDate,
          reportedById: 1 // System user
        }
      })

      // Notify technicians
      const technicians = await prisma.user.findMany({
        where: {
          userRoles: { some: { role: { slug: 'technician' } } }
        }
      })

      await prisma.notification.createMany({
        data: technicians.map(t => ({
          userId: t.id,
          type: 'MAINTENANCE_DUE',
          title: 'Maintenance Due',
          message: `Preventive maintenance due for ${schedule.item.name}`,
          link: `/maintenance/${ticket.id}`
        }))
      })
    }

    // Update next due date
    await prisma.maintenanceSchedule.update({
      where: { id: schedule.id },
      data: {
        nextDueDate: calculateNextDueDate(schedule.frequency),
        lastCompletedAt: now
      }
    })
  }

  return { checked: dueItems.length }
}
```

### Log Cleanup

```typescript
// lib/cron/log-cleanup.ts
import prisma from '@/lib/prisma'

export async function cleanupOldLogs() {
  // Keep audit logs for 90 days, older logs are archived/deleted
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 90)

  // Count logs to delete
  const count = await prisma.auditLog.count({
    where: {
      createdAt: { lt: cutoffDate }
    }
  })

  // Delete old logs in batches
  const batchSize = 1000
  let deleted = 0

  while (true) {
    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      },
      take: batchSize
    })

    deleted += result.count
    if (result.count < batchSize) break
  }

  // Also cleanup old notifications (read, older than 30 days)
  const notificationCutoff = new Date()
  notificationCutoff.setDate(notificationCutoff.getDate() - 30)

  const deletedNotifications = await prisma.notification.deleteMany({
    where: {
      isRead: true,
      createdAt: { lt: notificationCutoff }
    }
  })

  return {
    auditLogsDeleted: deleted,
    notificationsDeleted: deletedNotifications.count
  }
}
```

### Weekly Summary

```typescript
// lib/cron/weekly-summary.ts
import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export async function sendWeeklySummary() {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  // Gather statistics
  const [
    newItems,
    totalRequests,
    completedRequests,
    lowStockCount,
    pendingMaintenance
  ] = await Promise.all([
    prisma.inventoryItem.count({
      where: { createdAt: { gte: oneWeekAgo } }
    }),
    prisma.request.count({
      where: { createdAt: { gte: oneWeekAgo } }
    }),
    prisma.request.count({
      where: {
        status: 'COMPLETED',
        updatedAt: { gte: oneWeekAgo }
      }
    }),
    prisma.stockLevel.count({
      where: {
        quantity: { lte: prisma.stockLevel.fields.minQuantity }
      }
    }),
    prisma.maintenanceTicket.count({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] } }
    })
  ])

  // Get admins
  const admins = await prisma.user.findMany({
    where: {
      userRoles: { some: { role: { slug: { in: ['admin', 'superadmin'] } } } }
    }
  })

  // Send emails
  for (const admin of admins) {
    await sendEmail({
      to: admin.email,
      subject: 'Weekly HR-IMS Summary',
      html: `
        <h2>Weekly Summary Report</h2>
        <p>Here's what happened in the last 7 days:</p>

        <h3>Inventory</h3>
        <ul>
          <li>New Items Added: ${newItems}</li>
          <li>Low Stock Alerts: ${lowStockCount}</li>
        </ul>

        <h3>Requests</h3>
        <ul>
          <li>New Requests: ${totalRequests}</li>
          <li>Completed: ${completedRequests}</li>
        </ul>

        <h3>Maintenance</h3>
        <ul>
          <li>Pending Tickets: ${pendingMaintenance}</li>
        </ul>

        <p><a href="${process.env.NEXTAUTH_URL}/dashboard">View Dashboard</a></p>
      `
    })
  }

  return { sent: admins.length }
}
```

---

## Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/stock-alerts",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/maintenance-check",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/weekly-summary",
      "schedule": "0 8 * * 1"
    }
  ]
}
```

---

## Cron Expression Reference

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday = 0)
│ │ │ │ │
* * * * *

Examples:
0 9 * * *       - Every day at 9:00 AM
0 */6 * * *     - Every 6 hours
0 2 * * *       - Every day at 2:00 AM
0 8 * * 1       - Every Monday at 8:00 AM
0 0 1 * *       - First day of every month
*/15 * * * *    - Every 15 minutes
```

---

## Manual Trigger (Admin)

```typescript
// app/api/admin/cron/trigger/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hasPermission = await hasAnyRole(
    parseInt(session.user.id),
    ['admin', 'superadmin']
  )
  if (!hasPermission) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { job } = await request.json()

  let result
  switch (job) {
    case 'stock-alerts':
      result = await checkLowStock()
      break
    case 'maintenance':
      result = await checkDueMaintenance()
      break
    case 'cleanup':
      result = await cleanupOldLogs()
      break
    default:
      return NextResponse.json({ error: 'Unknown job' }, { status: 400 })
  }

  return NextResponse.json({ success: true, result })
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
