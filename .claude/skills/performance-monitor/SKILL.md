---
name: performance-monitor
description: Real-time performance monitoring and metrics collection for HR-IMS | การตรวจสอบประสิทธิภาพแบบเรียลไทม์และการเก็บรวบรวมเมตริกสำหรับ HR-IMS
version: 1.0.0
author: HR-IMS Team
tags: [performance, monitoring, metrics, real-time, optimization]
languages: [en, th]
---

# Performance Monitor / ตัวตรวจสอบประสิทธิภาพ

Real-time performance monitoring and metrics collection for HR-IMS applications.

## Overview / ภาพรวม

**EN**: Comprehensive performance monitoring system for tracking application metrics, API response times, database queries, and user experience indicators.

**TH**: ระบบตรวจสอบประสิทธิภาพที่ครอบคลุมสำหรับติดตามเมตริกของแอปพลิเคชัน เวลาตอบสนอง API การค้นหาฐานข้อมูล และตัวบ่งชี้ประสบการณ์ผู้ใช้

## Core Features / คุณสมบัติหลัก

### 1. Performance Metrics Collection / การเก็บรวบรวมเมตริกประสิทธิภาพ

```typescript
// lib/monitoring/performance-metrics.ts
interface PerformanceMetric {
  id: string
  name: string
  type: 'api' | 'database' | 'render' | 'network' | 'custom'
  value: number
  unit: 'ms' | 'bytes' | 'count' | 'percent'
  timestamp: Date
  metadata?: Record<string, unknown>
}

interface PerformanceThreshold {
  metric: string
  warning: number
  critical: number
  unit: string
}

// Core metrics to track / เมตริกหลักที่ต้องติดตาม
const CORE_THRESHOLDS: PerformanceThreshold[] = [
  { metric: 'api_response_time', warning: 500, critical: 1000, unit: 'ms' },
  { metric: 'database_query_time', warning: 200, critical: 500, unit: 'ms' },
  { metric: 'page_load_time', warning: 2000, critical: 4000, unit: 'ms' },
  { metric: 'memory_usage', warning: 70, critical: 90, unit: 'percent' },
  { metric: 'cpu_usage', warning: 60, critical: 80, unit: 'percent' },
  { metric: 'error_rate', warning: 1, critical: 5, unit: 'percent' },
]

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map()
  private thresholds: Map<string, PerformanceThreshold> = new Map()

  constructor() {
    CORE_THRESHOLDS.forEach(t => this.thresholds.set(t.metric, t))
  }

  // Record a performance metric / บันทึกเมตริกประสิทธิภาพ
  recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): void {
    const id = crypto.randomUUID()
    const fullMetric: PerformanceMetric = {
      ...metric,
      id,
      timestamp: new Date(),
    }

    const existing = this.metrics.get(metric.name) || []
    existing.push(fullMetric)

    // Keep last 1000 entries per metric / เก็บข้อมูลล่าสุด 1000 รายการต่อเมตริก
    if (existing.length > 1000) {
      existing.shift()
    }

    this.metrics.set(metric.name, existing)

    // Check thresholds / ตรวจสอบเกณฑ์
    this.checkThreshold(fullMetric)
  }

  // Check if metric exceeds threshold / ตรวจสอบว่าเมตริกเกินเกณฑ์หรือไม่
  private checkThreshold(metric: PerformanceMetric): void {
    const threshold = this.thresholds.get(metric.name)
    if (!threshold) return

    if (metric.value >= threshold.critical) {
      this.alertCritical(metric, threshold)
    } else if (metric.value >= threshold.warning) {
      this.alertWarning(metric, threshold)
    }
  }

  // Get metric statistics / ดึงสถิติเมตริก
  getStats(metricName: string, periodMinutes: number = 60): {
    avg: number
    min: number
    max: number
    p50: number
    p95: number
    p99: number
    count: number
  } | null {
    const metrics = this.metrics.get(metricName)
    if (!metrics || metrics.length === 0) return null

    const cutoff = new Date(Date.now() - periodMinutes * 60 * 1000)
    const recent = metrics.filter(m => m.timestamp >= cutoff)
      .map(m => m.value)
      .sort((a, b) => a - b)

    if (recent.length === 0) return null

    return {
      avg: recent.reduce((a, b) => a + b, 0) / recent.length,
      min: recent[0],
      max: recent[recent.length - 1],
      p50: recent[Math.floor(recent.length * 0.5)],
      p95: recent[Math.floor(recent.length * 0.95)],
      p99: recent[Math.floor(recent.length * 0.99)],
      count: recent.length,
    }
  }

  private alertWarning(metric: PerformanceMetric, threshold: PerformanceThreshold): void {
    console.warn(`[PERF WARNING] ${metric.name}: ${metric.value}${metric.unit} (threshold: ${threshold.warning})`)
  }

  private alertCritical(metric: PerformanceMetric, threshold: PerformanceThreshold): void {
    console.error(`[PERF CRITICAL] ${metric.name}: ${metric.value}${metric.unit} (threshold: ${threshold.critical})`)
  }
}

export const performanceMonitor = new PerformanceMonitor()
```

### 2. API Performance Tracking / การติดตามประสิทธิภาพ API

```typescript
// lib/monitoring/api-tracker.ts
import { performanceMonitor } from './performance-metrics'

// Higher-order function to track API performance / ฟังก์ชันควอร์ดออร์เดอร์สำหรับติดตามประสิทธิภาพ API
export function withPerformanceTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  handler: T,
  endpoint: string
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = performance.now()
    const startMemory = process.memoryUsage?.()?.heapUsed || 0

    try {
      const result = await handler(...args)

      const endTime = performance.now()
      const endMemory = process.memoryUsage?.()?.heapUsed || 0

      performanceMonitor.recordMetric({
        name: 'api_response_time',
        type: 'api',
        value: endTime - startTime,
        unit: 'ms',
        metadata: {
          endpoint,
          status: 'success',
          memoryDelta: endMemory - startMemory,
        },
      })

      return result
    } catch (error) {
      const endTime = performance.now()

      performanceMonitor.recordMetric({
        name: 'api_response_time',
        type: 'api',
        value: endTime - startTime,
        unit: 'ms',
        metadata: {
          endpoint,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })

      throw error
    }
  }) as T
}

// Usage in Server Actions / การใช้งานใน Server Actions
// export const getInventory = withPerformanceTracking(
//   async () => { ... },
//   '/api/inventory'
// )
```

### 3. Database Query Monitoring / การตรวจสอบการค้นหาฐานข้อมูล

```typescript
// lib/monitoring/db-monitor.ts
import { Prisma } from '@prisma/client'
import { performanceMonitor } from './performance-metrics'

// Prisma middleware for query monitoring / Prisma middleware สำหรับตรวจสอบการค้นหา
export const performanceMiddleware: Prisma.Middleware = async (params, next) => {
  const startTime = performance.now()

  const result = await next(params)

  const endTime = performance.now()
  const duration = endTime - startTime

  performanceMonitor.recordMetric({
    name: 'database_query_time',
    type: 'database',
    value: duration,
    unit: 'ms',
    metadata: {
      model: params.model,
      action: params.action,
      args: JSON.stringify(params.args).slice(0, 500), // Truncate large args
    },
  })

  // Log slow queries / บันทึกการค้นหาที่ช้า
  if (duration > 200) {
    console.warn(`[SLOW QUERY] ${params.model}.${params.action} took ${duration.toFixed(2)}ms`)
  }

  return result
}

// Apply to Prisma client / นำไปใช้กับ Prisma client
// const prisma = new PrismaClient()
// prisma.$use(performanceMiddleware)
```

### 4. Frontend Performance Components / คอมโพเนนต์ประสิทธิภาพ Frontend

```typescript
// components/monitoring/performance-display.tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface PerformanceStats {
  apiAvg: number
  dbAvg: number
  pageLoad: number
  errorRate: number
}

export function PerformanceDashboard() {
  const [stats, setStats] = useState<PerformanceStats | null>(null)

  useEffect(() => {
    // Fetch performance stats from API / ดึงสถิติประสิทธิภาพจาก API
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/performance')
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch performance stats:', error)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Update every 30s

    return () => clearInterval(interval)
  }, [])

  if (!stats) return <div>Loading...</div>

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            API Response Time
            <br />
            เวลาตอบสนอง API
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.apiAvg.toFixed(0)}ms</div>
          <Progress
            value={Math.min((stats.apiAvg / 1000) * 100, 100)}
            className={stats.apiAvg > 500 ? 'bg-yellow-100' : 'bg-green-100'}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Database Query Time
            <br />
            เวลาค้นหาฐานข้อมูล
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.dbAvg.toFixed(0)}ms</div>
          <Progress
            value={Math.min((stats.dbAvg / 500) * 100, 100)}
            className={stats.dbAvg > 200 ? 'bg-yellow-100' : 'bg-green-100'}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Page Load Time
            <br />
            เวลาโหลดหน้า
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pageLoad.toFixed(0)}ms</div>
          <Progress
            value={Math.min((stats.pageLoad / 4000) * 100, 100)}
            className={stats.pageLoad > 2000 ? 'bg-yellow-100' : 'bg-green-100'}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Error Rate
            <br />
            อัตราข้อผิดพลาด
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.errorRate.toFixed(2)}%</div>
          <Progress
            value={stats.errorRate}
            className={stats.errorRate > 1 ? 'bg-red-100' : 'bg-green-100'}
          />
        </CardContent>
      </Card>
    </div>
  )
}
```

### 5. Web Vitals Tracking / การติดตาม Web Vitals

```typescript
// lib/monitoring/web-vitals.ts
import { onCLS, onFID, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals'

interface WebVitalMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: number
}

// Send vitals to analytics / ส่ง vitals ไปยัง analytics
function sendToAnalytics(metric: WebVitalMetric): void {
  // Use navigator.sendBeacon for reliability / ใช้ navigator.sendBeacon เพื่อความน่าเชื่อถือ
  const url = '/api/analytics/web-vitals'
  const data = JSON.stringify(metric)

  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, data)
  } else {
    fetch(url, {
      method: 'POST',
      body: data,
      keepalive: true,
    }).catch(console.error)
  }
}

// Get rating based on thresholds / กำหนด rating ตามเกณฑ์
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, [number, number]> = {
    LCP: [2500, 4000],    // ms
    FID: [100, 300],      // ms
    CLS: [0.1, 0.25],     // score
    FCP: [1800, 3000],    // ms
    TTFB: [800, 1800],    // ms
  }

  const [good, poor] = thresholds[name] || [0, 0]

  if (value <= good) return 'good'
  if (value <= poor) return 'needs-improvement'
  return 'poor'
}

// Initialize Web Vitals tracking / เริ่มต้นการติดตาม Web Vitals
export function initWebVitals(): void {
  if (typeof window === 'undefined') return

  const handleMetric = (metric: Metric) => {
    const vital: WebVitalMetric = {
      name: metric.name,
      value: metric.value,
      rating: getRating(metric.name, metric.value),
      timestamp: Date.now(),
    }

    sendToAnalytics(vital)

    // Log poor metrics / บันทึกเมตริกที่แย่
    if (vital.rating === 'poor') {
      console.warn(`[WEB VITAL POOR] ${metric.name}: ${metric.value}`)
    }
  }

  onLCP(handleMetric)
  onFID(handleMetric)
  onCLS(handleMetric)
  onFCP(handleMetric)
  onTTFB(handleMetric)
}
```

### 6. Performance Report Generation / การสร้างรายงานประสิทธิภาพ

```typescript
// lib/monitoring/performance-report.ts
import { performanceMonitor } from './performance-metrics'

interface PerformanceReport {
  generatedAt: Date
  period: { start: Date; end: Date }
  summary: {
    apiResponseTime: { avg: number; p95: number; status: string }
    dbQueryTime: { avg: number; p95: number; status: string }
    errorRate: { value: number; status: string }
    webVitals: {
      lcp: number
      fid: number
      cls: number
    }
  }
  recommendations: string[]
  alerts: Array<{ level: string; message: string; timestamp: Date }>
}

export async function generatePerformanceReport(
  periodMinutes: number = 60
): Promise<PerformanceReport> {
  const end = new Date()
  const start = new Date(end.getTime() - periodMinutes * 60 * 1000)

  const apiStats = performanceMonitor.getStats('api_response_time', periodMinutes)
  const dbStats = performanceMonitor.getStats('database_query_time', periodMinutes)
  const errorStats = performanceMonitor.getStats('error_rate', periodMinutes)

  const recommendations: string[] = []

  // Generate recommendations based on metrics / สร้างคำแนะนำตามเมตริก
  if (apiStats && apiStats.p95 > 1000) {
    recommendations.push('API response time is high. Consider implementing caching.')
    recommendations.push('เวลาตอบสนอง API สูง ควรพิจารณาใช้ caching')
  }

  if (dbStats && dbStats.p95 > 500) {
    recommendations.push('Database queries are slow. Review indexes and query patterns.')
    recommendations.push('การค้นหาฐานข้อมูลช้า ตรวจสอบ indexes และรูปแบบการค้นหา')
  }

  if (errorStats && errorStats.avg > 5) {
    recommendations.push('High error rate detected. Review error logs immediately.')
    recommendations.push('ตรวจพบอัตราข้อผิดพลาดสูง ตรวจสอบ error logs ทันที')
  }

  return {
    generatedAt: new Date(),
    period: { start, end },
    summary: {
      apiResponseTime: {
        avg: apiStats?.avg || 0,
        p95: apiStats?.p95 || 0,
        status: getStatus(apiStats?.avg || 0, 500, 1000),
      },
      dbQueryTime: {
        avg: dbStats?.avg || 0,
        p95: dbStats?.p95 || 0,
        status: getStatus(dbStats?.avg || 0, 200, 500),
      },
      errorRate: {
        value: errorStats?.avg || 0,
        status: getStatus(errorStats?.avg || 0, 1, 5),
      },
      webVitals: {
        lcp: 0, // Would be populated from actual data
        fid: 0,
        cls: 0,
      },
    },
    recommendations,
    alerts: [], // Would be populated from alert history
  }
}

function getStatus(value: number, warning: number, critical: number): string {
  if (value <= warning) return 'good'
  if (value <= critical) return 'warning'
  return 'critical'
}
```

## Usage Examples / ตัวอย่างการใช้งาน

### Basic Setup / การตั้งค่าพื้นฐาน

```typescript
// app/layout.tsx
import { initWebVitals } from '@/lib/monitoring/web-vitals'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initWebVitals()
  }, [])

  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

### Track Custom Metrics / ติดตามเมตริกที่กำหนดเอง

```typescript
import { performanceMonitor } from '@/lib/monitoring/performance-metrics'

// Track inventory import time / ติดตามเวลานำเข้าสินค้าคงคลัง
const startTime = performance.now()
await importInventoryItems(csvData)
performanceMonitor.recordMetric({
  name: 'inventory_import_time',
  type: 'custom',
  value: performance.now() - startTime,
  unit: 'ms',
  metadata: { itemCount: csvData.length },
})
```

## Best Practices / แนวทางปฏิบัติ

1. **Set Realistic Thresholds**: Adjust based on your application's baseline
   - **ตั้งเกณฑ์ที่สมจริง**: ปรับตามพื้นฐานของแอปพลิเคชัน

2. **Monitor Trends**: Focus on trends, not just absolute values
   - **ติดตามแนวโน้ม**: เน้นที่แนวโน้ม ไม่ใช่แค่ค่าสัมบูรณ์

3. **Alert Appropriately**: Don't create alert fatigue
   - **แจ้งเตือนอย่างเหมาะสม**: อย่าสร้างการแจ้งเตือนมากเกินไป

4. **Act on Data**: Use insights to drive optimizations
   - **ดำเนินการตามข้อมูล**: ใช้ข้อมูลเชิงลึกเพื่อขับเคลื่อนการปรับปรุง

## Related Skills / Skills ที่เกี่ยวข้อง

- `query-optimizer` - Database query optimization
- `caching-optimizer` - Cache strategies
- `bundle-optimizer` - Frontend bundle optimization
- `anomaly-detection` - Detect performance anomalies
