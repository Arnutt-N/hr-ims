---
name: dashboard-builder
description: Dashboard widgets, statistics, and real-time metrics for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["dashboard", "widget", "stats", "metrics", "chart", "overview"]
  file_patterns: ["*dashboard*", "components/dashboard/**", "app/(dashboard)/dashboard/**"]
  context: visualization, analytics, overview, widgets
mcp_servers:
  - sequential
personas:
  - frontend
  - analyzer
---

# Dashboard Builder

## Core Role

Build dashboard components for HR-IMS:
- Statistics cards with real-time data
- Charts and visualizations
- Activity feeds and notifications
- Quick action widgets

---

## Dashboard Widgets

```yaml
widgets:
  stats_cards:
    - total_items
    - low_stock_alerts
    - pending_requests
    - active_users
    - maintenance_due
    - recent_activity

  charts:
    - inventory_by_category: pie
    - requests_by_status: donut
    - monthly_requests: line
    - stock_movement: bar
    - user_activity: area

  feeds:
    - recent_requests
    - recent_audit_logs
    - notifications
    - maintenance_alerts

  quick_actions:
    - create_request
    - add_item
    - view_reports
    - manage_users
```

---

## Server Actions

### Dashboard Statistics

```typescript
// lib/actions/dashboard.ts
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function getDashboardStats() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  try {
    const [
      totalItems,
      lowStockCount,
      pendingRequests,
      activeUsers,
      maintenanceDue,
      todayActivity
    ] = await Promise.all([
      // Total inventory items
      prisma.inventoryItem.count({
        where: { status: 'ACTIVE' }
      }),

      // Low stock alerts
      prisma.stockLevel.count({
        where: {
          quantity: { lte: prisma.stockLevel.fields.minQuantity }
        }
      }),

      // Pending requests
      prisma.request.count({
        where: { status: 'PENDING' }
      }),

      // Active users
      prisma.user.count({
        where: { status: 'ACTIVE' }
      }),

      // Maintenance due
      prisma.maintenanceTicket.count({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] }
        }
      }),

      // Today's activity
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ])

    // Calculate changes from yesterday
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const [
      yesterdayItems,
      yesterdayRequests,
      yesterdayActivity
    ] = await Promise.all([
      prisma.inventoryItem.count({
        where: {
          status: 'ACTIVE',
          createdAt: { lt: yesterday }
        }
      }),
      prisma.request.count({
        where: {
          status: 'PENDING',
          createdAt: { lt: yesterday }
        }
      }),
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(yesterday.setHours(0, 0, 0, 0)),
            lt: new Date(new Date(yesterday).setHours(23, 59, 59, 999))
          }
        }
      })
    ])

    return {
      success: true,
      data: {
        totalItems: {
          value: totalItems,
          change: totalItems - yesterdayItems,
          trend: totalItems >= yesterdayItems ? 'up' : 'down'
        },
        lowStockCount: {
          value: lowStockCount,
          label: 'Items below minimum'
        },
        pendingRequests: {
          value: pendingRequests,
          change: pendingRequests - yesterdayRequests,
          trend: pendingRequests <= yesterdayRequests ? 'up' : 'down'
        },
        activeUsers: {
          value: activeUsers,
          label: 'Registered users'
        },
        maintenanceDue: {
          value: maintenanceDue,
          label: 'Open tickets'
        },
        todayActivity: {
          value: todayActivity,
          change: todayActivity - yesterdayActivity,
          trend: todayActivity >= yesterdayActivity ? 'up' : 'down'
        }
      }
    }

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return { error: 'Failed to fetch stats', code: 'INTERNAL_ERROR' }
  }
}
```

### Chart Data

```typescript
export async function getInventoryByCategory() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const data = await prisma.inventoryItem.groupBy({
    by: ['categoryId'],
    where: { status: 'ACTIVE' },
    _count: { id: true }
  })

  const categories = await prisma.category.findMany({
    where: { id: { in: data.map(d => d.categoryId).filter(Boolean) } }
  })

  const chartData = data.map(item => ({
    name: categories.find(c => c.id === item.categoryId)?.name || 'Uncategorized',
    value: item._count.id
  }))

  return { success: true, data: chartData }
}

export async function getRequestsByStatus() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const data = await prisma.request.groupBy({
    by: ['status'],
    _count: { id: true }
  })

  const chartData = data.map(item => ({
    name: item.status,
    value: item._count.id,
    color: getStatusColor(item.status)
  }))

  return { success: true, data: chartData }
}

export async function getMonthlyRequests(months: number = 6) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)
  startDate.setDate(1)
  startDate.setHours(0, 0, 0, 0)

  const requests = await prisma.request.findMany({
    where: {
      createdAt: { gte: startDate }
    },
    select: {
      createdAt: true,
      type: true,
      status: true
    }
  })

  // Group by month
  const monthlyData: Record<string, { total: number; approved: number; rejected: number }> = {}

  for (let i = 0; i < months; i++) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const key = date.toISOString().slice(0, 7) // YYYY-MM
    monthlyData[key] = { total: 0, approved: 0, rejected: 0 }
  }

  requests.forEach(req => {
    const key = req.createdAt.toISOString().slice(0, 7)
    if (monthlyData[key]) {
      monthlyData[key].total++
      if (req.status === 'APPROVED') monthlyData[key].approved++
      if (req.status === 'REJECTED') monthlyData[key].rejected++
    }
  })

  const chartData = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
      ...data
    }))

  return { success: true, data: chartData }
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: '#f59e0b',
    APPROVED: '#10b981',
    REJECTED: '#ef4444',
    PROCESSING: '#3b82f6',
    COMPLETED: '#6366f1',
    CANCELLED: '#6b7280'
  }
  return colors[status] || '#6b7280'
}
```

### Activity Feed

```typescript
export async function getRecentActivity(limit: number = 10) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const logs = await prisma.auditLog.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } }
    }
  })

  const activities = logs.map(log => ({
    id: log.id,
    action: log.action,
    table: log.tableName,
    recordId: log.recordId,
    user: log.user?.name || 'System',
    timestamp: log.createdAt,
    description: formatActivityDescription(log)
  }))

  return { success: true, data: activities }
}

function formatActivityDescription(log: any): string {
  const tableNames: Record<string, string> = {
    InventoryItem: 'inventory item',
    User: 'user',
    Request: 'request',
    Warehouse: 'warehouse',
    Category: 'category'
  }

  const entity = tableNames[log.tableName] || log.tableName
  const itemName = log.newData?.name || log.oldData?.name || `#${log.recordId}`

  switch (log.action) {
    case 'CREATE':
      return `Created ${entity} "${itemName}"`
    case 'UPDATE':
      return `Updated ${entity} "${itemName}"`
    case 'DELETE':
      return `Deleted ${entity} "${itemName}"`
    default:
      return `${log.action} on ${entity}`
  }
}
```

---

## Frontend Components

### Stats Card

```typescript
// components/dashboard/stats-card.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: number | string
  description?: string
  change?: number
  trend?: 'up' | 'down'
  icon?: React.ReactNode
  className?: string
}

export function StatsCard({
  title,
  value,
  description,
  change,
  trend,
  icon,
  className
}: StatsCardProps) {
  const formatValue = (val: number | string) => {
    if (typeof val === 'number') {
      return val.toLocaleString()
    }
    return val
  }

  const getTrendIcon = () => {
    if (!change) return <MinusIcon className="w-4 h-4" />
    return trend === 'up'
      ? <ArrowUpIcon className="w-4 h-4" />
      : <ArrowDownIcon className="w-4 h-4" />
  }

  const getTrendColor = () => {
    if (!change) return 'text-muted-foreground'
    return trend === 'up' ? 'text-green-500' : 'text-red-500'
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {(change !== undefined || description) && (
          <div className="flex items-center gap-1 mt-1">
            {change !== undefined && (
              <span className={cn("flex items-center text-xs", getTrendColor())}>
                {getTrendIcon()}
                {Math.abs(change)}
              </span>
            )}
            {description && (
              <span className="text-xs text-muted-foreground">
                {description}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### Activity Feed Component

```typescript
// components/dashboard/activity-feed.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'
import { Activity, UserPlus, Package, FileText } from 'lucide-react'

interface Activity {
  id: number
  action: string
  table: string
  recordId: string
  user: string
  timestamp: Date
  description: string
}

interface ActivityFeedProps {
  activities: Activity[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const getActivityIcon = (table: string) => {
    switch (table) {
      case 'InventoryItem':
        return <Package className="w-4 h-4" />
      case 'User':
        return <UserPlus className="w-4 h-4" />
      case 'Request':
        return <FileText className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-600'
      case 'UPDATE':
        return 'bg-blue-100 text-blue-600'
      case 'DELETE':
        return 'bg-red-100 text-red-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${getActivityColor(activity.action)}`}>
                  {getActivityIcon(activity.table)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.user} • {formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: th })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
```

### Quick Actions Widget

```typescript
// components/dashboard/quick-actions.tsx
'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Package, Users, BarChart3 } from 'lucide-react'

const actions = [
  {
    label: 'New Request',
    href: '/requests/new',
    icon: FileText,
    color: 'bg-blue-500 hover:bg-blue-600'
  },
  {
    label: 'Add Item',
    href: '/inventory/new',
    icon: Package,
    color: 'bg-green-500 hover:bg-green-600'
  },
  {
    label: 'View Reports',
    href: '/reports',
    icon: BarChart3,
    color: 'bg-purple-500 hover:bg-purple-600'
  },
  {
    label: 'Manage Users',
    href: '/users',
    icon: Users,
    color: 'bg-orange-500 hover:bg-orange-600',
    adminOnly: true
  }
]

interface QuickActionsProps {
  isAdmin?: boolean
}

export function QuickActions({ isAdmin = false }: QuickActionsProps) {
  const visibleActions = actions.filter(a => !a.adminOnly || isAdmin)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {visibleActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Button
                className={`w-full h-auto py-4 flex-col gap-2 ${action.color}`}
              >
                <action.icon className="w-5 h-5" />
                <span className="text-xs">{action.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

### Chart Components

```typescript
// components/dashboard/charts.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface PieChartData {
  name: string
  value: number
  color?: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

export function InventoryPieChart({ data }: { data: PieChartData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Inventory by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function RequestsLineChart({ data }: { data: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Monthly Requests</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#8884d8"
              name="Total"
            />
            <Line
              type="monotone"
              dataKey="approved"
              stroke="#82ca9d"
              name="Approved"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

---

## Dashboard Page Layout

```typescript
// app/(dashboard)/dashboard/page.tsx
import { getDashboardStats, getRecentActivity, getInventoryByCategory, getMonthlyRequests } from '@/lib/actions/dashboard'
import { StatsCard } from '@/components/dashboard/stats-card'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { InventoryPieChart, RequestsLineChart } from '@/components/dashboard/charts'
import { Package, AlertTriangle, FileText, Users, Wrench, Activity } from 'lucide-react'

export default async function DashboardPage() {
  const [stats, activity, categoryData, monthlyData] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(10),
    getInventoryByCategory(),
    getMonthlyRequests(6)
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatsCard
          title="Total Items"
          value={stats.data?.totalItems.value || 0}
          change={stats.data?.totalItems.change}
          trend={stats.data?.totalItems.trend}
          icon={<Package className="w-4 h-4" />}
        />
        <StatsCard
          title="Low Stock"
          value={stats.data?.lowStockCount.value || 0}
          description="Items below minimum"
          icon={<AlertTriangle className="w-4 h-4 text-yellow-500" />}
        />
        <StatsCard
          title="Pending Requests"
          value={stats.data?.pendingRequests.value || 0}
          change={stats.data?.pendingRequests.change}
          trend={stats.data?.pendingRequests.trend}
          icon={<FileText className="w-4 h-4" />}
        />
        <StatsCard
          title="Active Users"
          value={stats.data?.activeUsers.value || 0}
          icon={<Users className="w-4 h-4" />}
        />
        <StatsCard
          title="Maintenance Due"
          value={stats.data?.maintenanceDue.value || 0}
          icon={<Wrench className="w-4 h-4" />}
        />
        <StatsCard
          title="Today's Activity"
          value={stats.data?.todayActivity.value || 0}
          change={stats.data?.todayActivity.change}
          trend={stats.data?.todayActivity.trend}
          icon={<Activity className="w-4 h-4" />}
        />
      </div>

      {/* Charts and Activity */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <InventoryPieChart data={categoryData.data || []} />
        <RequestsLineChart data={monthlyData.data || []} />
        <QuickActions isAdmin={true} />
      </div>

      {/* Activity Feed */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ActivityFeed activities={activity.data || []} />
      </div>
    </div>
  )
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
