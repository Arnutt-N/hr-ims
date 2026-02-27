---
name: chart-builder
description: Chart and graph components for data visualization in HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["chart", "graph", "visualization", "recharts", "pie chart", "bar chart", "line chart"]
  file_patterns: ["*chart*", "components/charts/**"]
  context: data visualization, analytics, statistics, graphs
mcp_servers:
  - sequential
personas:
  - frontend
---

# Chart Builder

## Core Role

Build charts and data visualizations for HR-IMS:
- Bar charts for comparisons
- Line charts for trends
- Pie charts for distributions
- Area charts for cumulative data

---

## Recharts Setup

```bash
npm install recharts
```

### Basic Chart Wrapper

```typescript
// components/charts/chart-wrapper.tsx
'use client'

import {
  ResponsiveContainer,
  ResponsiveContainerProps
} from 'recharts'
import { cn } from '@/lib/utils'

interface ChartWrapperProps extends ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
}

export function ChartWrapper({
  children,
  className,
  height = 300,
  ...props
}: ChartWrapperProps) {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height} {...props}>
        {children}
      </ResponsiveContainer>
    </div>
  )
}
```

### Chart Colors

```typescript
// lib/charts/colors.ts
export const chartColors = {
  // Primary palette
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  accent: 'hsl(var(--accent))',
  muted: 'hsl(var(--muted))',

  // Status colors
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
  info: '#3b82f6',

  // Chart palette (10 colors)
  palette: [
    '#3b82f6', // Blue
    '#22c55e', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#6366f1'  // Indigo
  ]
}

export function getChartColor(index: number): string {
  return chartColors.palette[index % chartColors.palette.length]
}
```

---

## Bar Chart

```typescript
// components/charts/bar-chart.tsx
'use client'

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { ChartWrapper } from './chart-wrapper'
import { chartColors } from '@/lib/charts/colors'

interface BarChartProps {
  data: Record<string, any>[]
  dataKeys: Array<{
    key: string
    name: string
    color?: string
  }>
  xAxisKey: string
  showGrid?: boolean
  showLegend?: boolean
  height?: number
  layout?: 'horizontal' | 'vertical'
}

export function BarChart({
  data,
  dataKeys,
  xAxisKey,
  showGrid = true,
  showLegend = true,
  height = 300,
  layout = 'horizontal'
}: BarChartProps) {
  return (
    <ChartWrapper height={height}>
      <RechartsBarChart data={data} layout={layout}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
        {layout === 'horizontal' ? (
          <>
            <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
          </>
        ) : (
          <>
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey={xAxisKey} type="category" tick={{ fontSize: 12 }} width={100} />
          </>
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
        />
        {showLegend && <Legend />}
        {dataKeys.map((dk, index) => (
          <Bar
            key={dk.key}
            dataKey={dk.key}
            name={dk.name}
            fill={dk.color || chartColors.palette[index]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ChartWrapper>
  )
}
```

### Inventory by Category Chart

```typescript
// components/charts/inventory-category-chart.tsx
import { BarChart } from './bar-chart'

interface CategoryData {
  category: string
  count: number
  value: number
}

interface InventoryCategoryChartProps {
  data: CategoryData[]
}

export function InventoryCategoryChart({ data }: InventoryCategoryChartProps) {
  const chartData = data.map(item => ({
    name: item.category,
    จำนวน: item.count,
    Count: item.count,
    มูลค่า: item.value,
    Value: item.value
  }))

  return (
    <BarChart
      data={chartData}
      xAxisKey="name"
      dataKeys={[
        { key: 'จำนวน', name: 'จำนวน / Count', color: '#3b82f6' },
        { key: 'มูลค่า', name: 'มูลค่า / Value', color: '#22c55e' }
      ]}
      height={350}
    />
  )
}
```

---

## Line Chart

```typescript
// components/charts/line-chart.tsx
'use client'

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { ChartWrapper } from './chart-wrapper'
import { chartColors } from '@/lib/charts/colors'

interface LineChartProps {
  data: Record<string, any>[]
  dataKeys: Array<{
    key: string
    name: string
    color?: string
    dashed?: boolean
  }>
  xAxisKey: string
  showGrid?: boolean
  showLegend?: boolean
  showDots?: boolean
  height?: number
}

export function LineChart({
  data,
  dataKeys,
  xAxisKey,
  showGrid = true,
  showLegend = true,
  showDots = true,
  height = 300
}: LineChartProps) {
  return (
    <ChartWrapper height={height}>
      <RechartsLineChart data={data}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
        <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
        />
        {showLegend && <Legend />}
        {dataKeys.map((dk, index) => (
          <Line
            key={dk.key}
            type="monotone"
            dataKey={dk.key}
            name={dk.name}
            stroke={dk.color || chartColors.palette[index]}
            strokeWidth={2}
            dot={showDots}
            strokeDasharray={dk.dashed ? '5 5' : undefined}
          />
        ))}
      </RechartsLineChart>
    </ChartWrapper>
  )
}
```

### Request Trend Chart

```typescript
// components/charts/request-trend-chart.tsx
import { LineChart } from './line-chart'

interface TrendData {
  date: string
  requests: number
  approved: number
  rejected: number
}

interface RequestTrendChartProps {
  data: TrendData[]
}

export function RequestTrendChart({ data }: RequestTrendChartProps) {
  const chartData = data.map(item => ({
    date: item.date,
    'คำขอทั้งหมด': item.requests,
    'Total Requests': item.requests,
    'อนุมัติ': item.approved,
    'Approved': item.approved,
    'ปฏิเสธ': item.rejected,
    'Rejected': item.rejected
  }))

  return (
    <LineChart
      data={chartData}
      xAxisKey="date"
      dataKeys={[
        { key: 'คำขอทั้งหมด', name: 'คำขอทั้งหมด / Total', color: '#3b82f6' },
        { key: 'อนุมัติ', name: 'อนุมัติ / Approved', color: '#22c55e' },
        { key: 'ปฏิเสธ', name: 'ปฏิเสธ / Rejected', color: '#ef4444' }
      ]}
      height={350}
    />
  )
}
```

---

## Pie Chart

```typescript
// components/charts/pie-chart.tsx
'use client'

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { ChartWrapper } from './chart-wrapper'
import { chartColors, getChartColor } from '@/lib/charts/colors'

interface PieChartProps {
  data: Array<{
    name: string
    value: number
    color?: string
  }>
  showLegend?: boolean
  showLabels?: boolean
  height?: number
  innerRadius?: number
}

export function PieChart({
  data,
  showLegend = true,
  showLabels = true,
  height = 300,
  innerRadius = 0
}: PieChartProps) {
  return (
    <ChartWrapper height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
          label={showLabels ? ({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)` : false}
          labelLine={showLabels}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || getChartColor(index)}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
          formatter={(value: number) => [value.toLocaleString(), '']}
        />
        {showLegend && <Legend />}
      </RechartsPieChart>
    </ChartWrapper>
  )
}
```

### Status Distribution Chart

```typescript
// components/charts/status-distribution-chart.tsx
import { PieChart } from './pie-chart'

interface StatusData {
  status: string
  count: number
}

interface StatusDistributionChartProps {
  data: StatusData[]
  type: 'inventory' | 'requests' | 'users'
}

const statusColors: Record<string, string> = {
  // Inventory
  ACTIVE: '#22c55e',
  INACTIVE: '#eab308',
  DISPOSED: '#ef4444',

  // Requests
  PENDING: '#eab308',
  APPROVED: '#22c55e',
  REJECTED: '#ef4444',
  PROCESSING: '#3b82f6',
  COMPLETED: '#14b8a6',

  // Users
  ACTIVE: '#22c55e',
  INACTIVE: '#6b7280',
  SUSPENDED: '#ef4444'
}

const statusLabels: Record<string, { th: string; en: string }> = {
  ACTIVE: { th: 'ใช้งาน', en: 'Active' },
  INACTIVE: { th: 'ไม่ใช้งาน', en: 'Inactive' },
  DISPOSED: { th: 'จำหน่าย', en: 'Disposed' },
  PENDING: { th: 'รออนุมัติ', en: 'Pending' },
  APPROVED: { th: 'อนุมัติ', en: 'Approved' },
  REJECTED: { th: 'ปฏิเสธ', en: 'Rejected' },
  PROCESSING: { th: 'กำลังดำเนินการ', en: 'Processing' },
  COMPLETED: { th: 'เสร็จสิ้น', en: 'Completed' },
  SUSPENDED: { th: 'ระงับ', en: 'Suspended' }
}

export function StatusDistributionChart({ data, type }: StatusDistributionChartProps) {
  const chartData = data.map(item => {
    const label = statusLabels[item.status] || { th: item.status, en: item.status }
    return {
      name: `${label.th} / ${label.en}`,
      value: item.count,
      color: statusColors[item.status] || '#6b7280'
    }
  })

  return <PieChart data={chartData} height={300} />
}
```

---

## Area Chart

```typescript
// components/charts/area-chart.tsx
'use client'

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { ChartWrapper } from './chart-wrapper'
import { chartColors } from '@/lib/charts/colors'

interface AreaChartProps {
  data: Record<string, any>[]
  dataKeys: Array<{
    key: string
    name: string
    color?: string
  }>
  xAxisKey: string
  showGrid?: boolean
  showLegend?: boolean
  stacked?: boolean
  height?: number
}

export function AreaChart({
  data,
  dataKeys,
  xAxisKey,
  showGrid = true,
  showLegend = true,
  stacked = false,
  height = 300
}: AreaChartProps) {
  return (
    <ChartWrapper height={height}>
      <RechartsAreaChart data={data}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
        <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
        />
        {showLegend && <Legend />}
        {dataKeys.map((dk, index) => (
          <Area
            key={dk.key}
            type="monotone"
            dataKey={dk.key}
            name={dk.name}
            stroke={dk.color || chartColors.palette[index]}
            fill={dk.color || chartColors.palette[index]}
            fillOpacity={0.3}
            stackId={stacked ? 'stack' : undefined}
          />
        ))}
      </RechartsAreaChart>
    </ChartWrapper>
  )
}
```

### Stock Level Trend Chart

```typescript
// components/charts/stock-trend-chart.tsx
import { AreaChart } from './area-chart'

interface StockTrendData {
  date: string
  incoming: number
  outgoing: number
  balance: number
}

interface StockTrendChartProps {
  data: StockTrendData[]
}

export function StockTrendChart({ data }: StockTrendChartProps) {
  const chartData = data.map(item => ({
    date: item.date,
    'รับเข้า': item.incoming,
    'Incoming': item.incoming,
    'เบิกออก': item.outgoing,
    'Outgoing': item.outgoing,
    'คงเหลือ': item.balance,
    'Balance': item.balance
  }))

  return (
    <AreaChart
      data={chartData}
      xAxisKey="date"
      dataKeys={[
        { key: 'รับเข้า', name: 'รับเข้า / Incoming', color: '#22c55e' },
        { key: 'เบิกออก', name: 'เบิกออก / Outgoing', color: '#ef4444' },
        { key: 'คงเหลือ', name: 'คงเหลือ / Balance', color: '#3b82f6' }
      ]}
      height={350}
    />
  )
}
```

---

## Stats Card with Sparkline

```typescript
// components/charts/stats-card.tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Sparklines, SparklinesLine } from 'react-sparklines'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  sparklineData?: number[]
  icon?: React.ReactNode
  className?: string
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel = 'vs last period',
  sparklineData,
  icon,
  className
}: StatsCardProps) {
  const trendIcon = change
    ? change > 0
      ? <TrendingUp className="h-4 w-4" />
      : <TrendingDown className="h-4 w-4" />
    : <Minus className="h-4 w-4" />

  const trendColor = change
    ? change > 0
      ? 'text-green-500'
      : 'text-red-500'
    : 'text-muted-foreground'

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            {change !== undefined && (
              <div className={cn('flex items-center gap-1 text-sm', trendColor)}>
                {trendIcon}
                <span>{Math.abs(change)}%</span>
                <span className="text-muted-foreground">{changeLabel}</span>
              </div>
            )}
          </div>
          {icon && (
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              {icon}
            </div>
          )}
        </div>

        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-4 h-12">
            <Sparklines data={sparklineData} width={200} height={48}>
              <SparklinesLine
                color="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.2}
              />
            </Sparklines>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## Dashboard Charts Example

```typescript
// components/dashboard/dashboard-charts.tsx
'use client'

import { InventoryCategoryChart } from '@/components/charts/inventory-category-chart'
import { RequestTrendChart } from '@/components/charts/request-trend-chart'
import { StatusDistributionChart } from '@/components/charts/status-distribution-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DashboardChartsProps {
  categoryData: Array<{ category: string; count: number; value: number }>
  trendData: Array<{ date: string; requests: number; approved: number; rejected: number }>
  statusData: Array<{ status: string; count: number }>
}

export function DashboardCharts({ categoryData, trendData, statusData }: DashboardChartsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>สินค้าตามหมวดหมู่ / Inventory by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <InventoryCategoryChart data={categoryData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>สถานะคำขอ / Request Status</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusDistributionChart data={statusData} type="requests" />
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>แนวโน้มคำขอ / Request Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <RequestTrendChart data={trendData} />
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Server Action for Chart Data

```typescript
// lib/actions/charts.ts
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { subDays, format } from 'date-fns'

export async function getInventoryByCategory() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  const data = await prisma.inventoryItem.groupBy({
    by: ['categoryId'],
    _count: { id: true },
    _sum: { price: true },
    where: { status: 'ACTIVE' }
  })

  const categories = await prisma.category.findMany({
    where: { id: { in: data.map(d => d.categoryId).filter(Boolean) as number[] } }
  })

  const categoryMap = new Map(categories.map(c => [c.id, c.name]))

  return {
    success: true,
    data: data.map(item => ({
      category: categoryMap.get(item.categoryId!) || 'Unknown',
      count: item._count.id,
      value: item._sum.price || 0
    }))
  }
}

export async function getRequestTrend(days: number = 30) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  const startDate = subDays(new Date(), days)

  const requests = await prisma.request.findMany({
    where: {
      createdAt: { gte: startDate }
    },
    select: {
      createdAt: true,
      status: true
    }
  })

  // Group by date
  const grouped = requests.reduce((acc, request) => {
    const date = format(request.createdAt, 'yyyy-MM-dd')
    if (!acc[date]) {
      acc[date] = { date, requests: 0, approved: 0, rejected: 0 }
    }
    acc[date].requests++
    if (request.status === 'APPROVED') acc[date].approved++
    if (request.status === 'REJECTED') acc[date].rejected++
    return acc
  }, {} as Record<string, any>)

  return {
    success: true,
    data: Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date))
  }
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
