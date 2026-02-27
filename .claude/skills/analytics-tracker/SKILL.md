---
name: analytics-tracker
description: Analytics and user behavior tracking for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["analytics", "tracking", "metrics", "user behavior", "page view", "event tracking"]
  file_patterns: ["*analytics*", "*tracking*", "lib/analytics*"]
  context: analytics, tracking, metrics, user behavior, page views, events
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# Analytics Tracker

## Core Role

Track user behavior and analytics for HR-IMS:
- Page view tracking
- Event tracking
- User behavior analysis
- Performance metrics

---

## Analytics Service

```typescript
// lib/analytics/tracker.ts

export interface AnalyticsEvent {
  name: string
  category: string
  action: string
  label?: string
  value?: number
  properties?: Record<string, any>
  timestamp: Date
  userId?: number
  sessionId: string
  page: string
  referrer?: string
  userAgent: string
}

export interface PageView {
  path: string
  title: string
  referrer?: string
  timestamp: Date
  userId?: number
  sessionId: string
  duration?: number
}

// Generate session ID
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// Get or create session ID
export function getSessionId(): string {
  if (typeof window === 'undefined') return ''

  const key = 'analytics_session_id'
  const stored = sessionStorage.getItem(key)

  if (stored) return stored

  const sessionId = generateSessionId()
  sessionStorage.setItem(key, sessionId)
  return sessionId
}

// Analytics queue for batching
const eventQueue: AnalyticsEvent[] = []
const pageViewQueue: PageView[] = []
let flushInterval: NodeJS.Timeout | null = null

// Start batch flush interval
function startFlushInterval() {
  if (flushInterval) return

  flushInterval = setInterval(() => {
    flushQueue()
  }, 5000) // Flush every 5 seconds
}

// Flush queue to server
async function flushQueue() {
  if (eventQueue.length === 0 && pageViewQueue.length === 0) return

  const events = [...eventQueue]
  const pageViews = [...pageViewQueue]

  eventQueue.length = 0
  pageViewQueue.length = 0

  try {
    await fetch('/api/analytics/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events, pageViews }),
      keepalive: true
    })
  } catch (error) {
    // Re-add failed events to queue
    eventQueue.unshift(...events)
    pageViewQueue.unshift(...pageViews)
  }
}

// Track event
export function trackEvent(
  name: string,
  options: {
    category?: string
    action?: string
    label?: string
    value?: number
    properties?: Record<string, any>
    userId?: number
  } = {}
): void {
  if (typeof window === 'undefined') return

  const event: AnalyticsEvent = {
    name,
    category: options.category || 'general',
    action: options.action || name,
    label: options.label,
    value: options.value,
    properties: options.properties,
    timestamp: new Date(),
    userId: options.userId,
    sessionId: getSessionId(),
    page: window.location.pathname,
    referrer: document.referrer,
    userAgent: navigator.userAgent
  }

  eventQueue.push(event)
  startFlushInterval()

  // Flush immediately if queue is large
  if (eventQueue.length >= 50) {
    flushQueue()
  }
}

// Track page view
export function trackPageView(
  path: string,
  title: string,
  options: { userId?: number; referrer?: string } = {}
): void {
  if (typeof window === 'undefined') return

  const pageView: PageView = {
    path,
    title,
    referrer: options.referrer || document.referrer,
    timestamp: new Date(),
    userId: options.userId,
    sessionId: getSessionId()
  }

  pageViewQueue.push(pageView)
  startFlushInterval()
}

// Track timing
export function trackTiming(
  category: string,
  variable: string,
  value: number,
  label?: string
): void {
  trackEvent('timing_complete', {
    category,
    action: variable,
    label,
    value,
    properties: { type: 'timing' }
  })
}

// Track error
export function trackError(
  error: Error,
  context?: Record<string, any>
): void {
  trackEvent('exception', {
    category: 'error',
    action: error.name,
    label: error.message,
    properties: {
      stack: error.stack,
      ...context
    }
  })
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushQueue()
  })
}
```

---

## Pre-defined Event Trackers

```typescript
// lib/analytics/events.ts
import { trackEvent, trackTiming } from './tracker'

// Inventory events
export const inventoryAnalytics = {
  itemView: (itemId: number, itemName: string) => {
    trackEvent('view_item', {
      category: 'inventory',
      action: 'view',
      label: itemName,
      properties: { itemId }
    })
  },

  itemCreate: (itemId: number, itemName: string) => {
    trackEvent('create_item', {
      category: 'inventory',
      action: 'create',
      label: itemName,
      properties: { itemId }
    })
  },

  itemUpdate: (itemId: number, itemName: string, fields: string[]) => {
    trackEvent('update_item', {
      category: 'inventory',
      action: 'update',
      label: itemName,
      properties: { itemId, fields }
    })
  },

  itemDelete: (itemId: number, itemName: string) => {
    trackEvent('delete_item', {
      category: 'inventory',
      action: 'delete',
      label: itemName,
      properties: { itemId }
    })
  },

  stockAdjust: (itemId: number, quantity: number, reason: string) => {
    trackEvent('adjust_stock', {
      category: 'inventory',
      action: 'adjust',
      value: quantity,
      properties: { itemId, reason }
    })
  },

  search: (query: string, resultsCount: number) => {
    trackEvent('search_inventory', {
      category: 'inventory',
      action: 'search',
      label: query,
      value: resultsCount
    })
  }
}

// Request events
export const requestAnalytics = {
  requestCreate: (requestId: number, type: string, itemCount: number) => {
    trackEvent('create_request', {
      category: 'request',
      action: 'create',
      label: type,
      value: itemCount,
      properties: { requestId, type }
    })
  },

  requestApprove: (requestId: number, approvedBy: number) => {
    trackEvent('approve_request', {
      category: 'request',
      action: 'approve',
      properties: { requestId, approvedBy }
    })
  },

  requestReject: (requestId: number, rejectedBy: number, reason?: string) => {
    trackEvent('reject_request', {
      category: 'request',
      action: 'reject',
      properties: { requestId, rejectedBy, reason }
    })
  },

  requestComplete: (requestId: number, duration: number) => {
    trackEvent('complete_request', {
      category: 'request',
      action: 'complete',
      value: duration,
      properties: { requestId, durationDays: duration }
    })
  }
}

// User events
export const userAnalytics = {
  login: (userId: number, method: string = 'credentials') => {
    trackEvent('login', {
      category: 'user',
      action: 'login',
      label: method,
      userId
    })
  },

  logout: (userId: number) => {
    trackEvent('logout', {
      category: 'user',
      action: 'logout',
      userId
    })
  },

  register: (userId: number) => {
    trackEvent('register', {
      category: 'user',
      action: 'register',
      userId
    })
  },

  profileUpdate: (userId: number, fields: string[]) => {
    trackEvent('update_profile', {
      category: 'user',
      action: 'update',
      properties: { userId, fields }
    })
  },

  passwordChange: (userId: number) => {
    trackEvent('change_password', {
      category: 'user',
      action: 'change_password',
      userId
    })
  }
}

// Export events
export const exportAnalytics = {
  exportStart: (format: string, recordCount: number, filters?: any) => {
    trackEvent('export_start', {
      category: 'export',
      action: 'start',
      label: format,
      value: recordCount,
      properties: { format, recordCount, filters }
    })
  },

  exportComplete: (format: string, recordCount: number, duration: number) => {
    trackEvent('export_complete', {
      category: 'export',
      action: 'complete',
      label: format,
      value: recordCount,
      properties: { format, recordCount, durationMs: duration }
    })

    trackTiming('export', format, duration)
  },

  exportError: (format: string, error: string) => {
    trackEvent('export_error', {
      category: 'export',
      action: 'error',
      label: format,
      properties: { format, error }
    })
  }
}

// Performance tracking
export const performanceAnalytics = {
  pageLoad: (pageName: string, loadTime: number) => {
    trackTiming('performance', 'page_load', loadTime, pageName)
  },

  apiCall: (endpoint: string, duration: number, status: number) => {
    trackEvent('api_call', {
      category: 'performance',
      action: 'api_call',
      label: endpoint,
      value: duration,
      properties: { endpoint, duration, status }
    })
  },

  serverAction: (action: string, duration: number, success: boolean) => {
    trackEvent('server_action', {
      category: 'performance',
      action: 'server_action',
      label: action,
      value: duration,
      properties: { action, duration, success }
    })
  }
}
```

---

## Analytics Hook

```typescript
// hooks/use-analytics.ts
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { trackPageView, trackEvent, trackTiming } from '@/lib/analytics/tracker'
import { useSession } from 'next-auth/react'

// Auto page view tracking
export function usePageViews() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const prevPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (pathname === prevPathRef.current) return

    prevPathRef.current = pathname

    const search = searchParams.toString()
    const fullPath = search ? `${pathname}?${search}` : pathname

    trackPageView(fullPath, document.title, {
      userId: session?.user?.id ? parseInt(session.user.id) : undefined
    })
  }, [pathname, searchParams, session])
}

// Performance tracking hook
export function usePerformanceTracking(pageName: string) {
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    startTimeRef.current = performance.now()

    return () => {
      const loadTime = performance.now() - startTimeRef.current
      trackTiming('performance', 'page_render', loadTime, pageName)
    }
  }, [pageName])
}

// Click tracking hook
export function useClickTracking(category: string) {
  return useCallback((
    action: string,
    label?: string,
    value?: number,
    properties?: Record<string, any>
  ) => {
    trackEvent(action, {
      category,
      action,
      label,
      value,
      properties
    })
  }, [category])
}

// Form tracking hook
export function useFormTracking(formName: string) {
  const startTimeRef = useRef<number>(0)

  const trackStart = useCallback(() => {
    startTimeRef.current = Date.now()
    trackEvent('form_start', {
      category: 'form',
      action: 'start',
      label: formName
    })
  }, [formName])

  const trackComplete = useCallback((data?: any) => {
    const duration = Date.now() - startTimeRef.current
    trackEvent('form_complete', {
      category: 'form',
      action: 'complete',
      label: formName,
      value: duration,
      properties: { data }
    })
  }, [formName])

  const trackError = useCallback((field: string, error: string) => {
    trackEvent('form_error', {
      category: 'form',
      action: 'error',
      label: formName,
      properties: { field, error }
    })
  }, [formName])

  const trackAbandon = useCallback(() => {
    trackEvent('form_abandon', {
      category: 'form',
      action: 'abandon',
      label: formName
    })
  }, [formName])

  return {
    trackStart,
    trackComplete,
    trackError,
    trackAbandon
  }
}
```

---

## Analytics Dashboard Component

```typescript
// components/admin/analytics-dashboard.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { format, subDays } from 'date-fns'
import { th } from 'date-fns/locale'

interface AnalyticsData {
  pageViews: Array<{ date: string; views: number }>
  events: Array<{ name: string; count: number }>
  topPages: Array<{ path: string; views: number }>
  usersByDevice: Array<{ device: string; count: number }>
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('7d')

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/analytics?range=${dateRange}`)
      const analyticsData = await response.json()
      setData(analyticsData)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

  if (loading) {
    return <div className="text-center py-8">กำลังโหลด... / Loading...</div>
  }

  if (!data) {
    return <div className="text-center py-8">ไม่มีข้อมูล / No data available</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="7d">7 วันที่ผ่านมา / Last 7 days</option>
          <option value="30d">30 วันที่ผ่านมา / Last 30 days</option>
          <option value="90d">90 วันที่ผ่านมา / Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Summary Cards */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Page Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {data.pageViews.reduce((sum, d) => sum + d.views, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {data.events.reduce((sum, e) => sum + e.count, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Top Page
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium truncate">
              {data.topPages[0]?.path || '-'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Top Device
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">
              {data.usersByDevice[0]?.device || '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Page Views Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Page Views / ยอดเข้าชมหน้าเว็บ</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.pageViews}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => format(new Date(d), 'dd/MM', { locale: th })}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(d) => format(new Date(d), 'dd MMM yyyy', { locale: th })}
                />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="#8884d8"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Events */}
        <Card>
          <CardHeader>
            <CardTitle>Top Events / เหตุการณ์ยอดนิยม</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.events.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Top Pages / หน้ายอดนิยม</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topPages.slice(0, 10).map((page, index) => (
                <div key={page.path} className="flex items-center justify-between">
                  <span className="text-sm truncate flex-1">
                    {index + 1}. {page.path}
                  </span>
                  <span className="text-sm font-medium ml-4">
                    {page.views.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Device Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Devices / อุปกรณ์</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.usersByDevice}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ device, percent }) => `${device} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.usersByDevice.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

---

## Analytics API Routes

```typescript
// app/api/analytics/batch/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { events, pageViews } = body

  try {
    // Store events
    if (events?.length > 0) {
      await prisma.analyticsEvent.createMany({
        data: events.map((e: any) => ({
          name: e.name,
          category: e.category,
          action: e.action,
          label: e.label,
          value: e.value,
          properties: e.properties,
          userId: e.userId,
          sessionId: e.sessionId,
          page: e.page,
          referrer: e.referrer,
          userAgent: e.userAgent,
          createdAt: new Date(e.timestamp)
        }))
      })
    }

    // Store page views
    if (pageViews?.length > 0) {
      await prisma.pageView.createMany({
        data: pageViews.map((pv: any) => ({
          path: pv.path,
          title: pv.title,
          referrer: pv.referrer,
          userId: pv.userId,
          sessionId: pv.sessionId,
          duration: pv.duration,
          createdAt: new Date(pv.timestamp)
        }))
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics batch error:', error)
    return NextResponse.json({ error: 'Failed to store analytics' }, { status: 500 })
  }
}

// app/api/admin/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { subDays, format } from 'date-fns'
import { auth } from '@/auth'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const range = searchParams.get('range') || '7d'

  const days = range === '30d' ? 30 : range === '90d' ? 90 : 7
  const startDate = subDays(new Date(), days)

  try {
    // Page views over time
    const pageViewsRaw = await prisma.pageView.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: startDate } },
      _count: { id: true }
    })

    const pageViews = Array.from({ length: days }, (_, i) => {
      const date = subDays(new Date(), days - i - 1)
      const dateStr = format(date, 'yyyy-MM-dd')
      const match = pageViewsRaw.find(pv =>
        format(pv.createdAt, 'yyyy-MM-dd') === dateStr
      )
      return {
        date: dateStr,
        views: match?._count.id || 0
      }
    })

    // Top events
    const events = await prisma.analyticsEvent.groupBy({
      by: ['name'],
      where: { createdAt: { gte: startDate } },
      _count: { name: true },
      orderBy: { _count: { name: 'desc' } },
      take: 10
    })

    // Top pages
    const topPages = await prisma.pageView.groupBy({
      by: ['path'],
      where: { createdAt: { gte: startDate } },
      _count: { path: true },
      orderBy: { _count: { path: 'desc' } },
      take: 10
    })

    // Device distribution (simplified from user agent)
    const allEvents = await prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: startDate } },
      select: { userAgent: true }
    })

    const deviceCounts = { Desktop: 0, Mobile: 0, Tablet: 0 }
    allEvents.forEach(e => {
      const ua = e.userAgent.toLowerCase()
      if (ua.includes('mobile')) deviceCounts.Mobile++
      else if (ua.includes('tablet')) deviceCounts.Tablet++
      else deviceCounts.Desktop++
    })

    const usersByDevice = Object.entries(deviceCounts)
      .filter(([_, count]) => count > 0)
      .map(([device, count]) => ({ device, count }))

    return NextResponse.json({
      pageViews,
      events: events.map(e => ({ name: e.name, count: e._count.name })),
      topPages: topPages.map(p => ({ path: p.path, views: p._count.path })),
      usersByDevice
    })
  } catch (error) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
```

---

## Usage Examples

```typescript
// Example 1: Auto page view tracking
import { usePageViews } from '@/hooks/use-analytics'

function App() {
  usePageViews() // Automatically tracks page views
  return <MainContent />
}

// Example 2: Event tracking
import { inventoryAnalytics } from '@/lib/analytics/events'

function InventoryDetail({ item }) {
  useEffect(() => {
    inventoryAnalytics.itemView(item.id, item.name)
  }, [item.id, item.name])

  const handleDelete = async () => {
    await deleteItem(item.id)
    inventoryAnalytics.itemDelete(item.id, item.name)
  }

  return <div>...</div>
}

// Example 3: Form tracking
import { useFormTracking } from '@/hooks/use-analytics'

function RequestForm() {
  const { trackStart, trackComplete, trackError } = useFormTracking('request_form')

  useEffect(() => {
    trackStart()
  }, [])

  const handleSubmit = async (data) => {
    try {
      await createRequest(data)
      trackComplete({ itemCount: data.items.length })
    } catch (error) {
      trackError('submit', error.message)
    }
  }

  return <form onSubmit={handleSubmit}>...</form>
}

// Example 4: Performance tracking
import { performanceAnalytics } from '@/lib/analytics/events'

// In API wrapper or server action
export async function withTracking<T>(
  action: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  try {
    const result = await fn()
    performanceAnalytics.serverAction(action, Date.now() - start, true)
    return result
  } catch (error) {
    performanceAnalytics.serverAction(action, Date.now() - start, false)
    throw error
  }
}

// Example 5: Click tracking
import { useClickTracking } from '@/hooks/use-analytics'

function Toolbar() {
  const trackClick = useClickTracking('toolbar')

  return (
    <div>
      <button onClick={() => trackClick('click', 'export')}>
        Export
      </button>
      <button onClick={() => trackClick('click', 'print')}>
        Print
      </button>
    </div>
  )
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
