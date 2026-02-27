---
name: anomaly-detection
description: Intelligent anomaly detection and alert system for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["anomaly", "outlier", "detect", "alert", "unusual", "abnormal"]
  file_patterns: ["*anomaly*", "*outlier*", "*detection*"]
  context: anomaly detection, outlier detection, unusual patterns, alerts
mcp_servers:
  - sequential
personas:
  - backend
  - security
---

# Anomaly Detection

## Core Role

Implement intelligent anomaly detection:
- Statistical anomaly detection
- Pattern analysis
- Threshold monitoring
- Alert generation

---

## Anomaly Detection Service

```typescript
// lib/anomaly/service.ts
import prisma from '@/lib/prisma'
import { subDays, subHours, format } from 'date-fns'

export type AnomalyType =
  | 'UNUSUAL_VOLUME'
  | 'UNUSUAL_PATTERN'
  | 'THRESHOLD_BREACH'
  | 'TREND_CHANGE'
  | 'OUTLIER'

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface Anomaly {
  id: string
  type: AnomalyType
  severity: AnomalySeverity
  title: string
  description: string
  metric: string
  currentValue: number
  expectedValue: number
  deviation: number
  timestamp: Date
  data: Record<string, any>
  acknowledged: boolean
  acknowledgedBy?: number
  acknowledgedAt?: Date
}

export interface AnomalyRule {
  id: string
  name: string
  metric: string
  type: AnomalyType
  threshold?: number
  stdDevMultiplier?: number
  windowHours: number
  enabled: boolean
  severity: AnomalySeverity
}

// Default anomaly rules
const DEFAULT_RULES: AnomalyRule[] = [
  {
    id: 'request-volume-spike',
    name: 'Request Volume Spike',
    metric: 'request_count',
    type: 'UNUSUAL_VOLUME',
    stdDevMultiplier: 3,
    windowHours: 24,
    enabled: true,
    severity: 'MEDIUM'
  },
  {
    id: 'failed-login-spike',
    name: 'Failed Login Spike',
    metric: 'failed_logins',
    type: 'UNUSUAL_VOLUME',
    stdDevMultiplier: 4,
    windowHours: 1,
    enabled: true,
    severity: 'HIGH'
  },
  {
    id: 'stock-threshold',
    name: 'Low Stock Alert',
    metric: 'stock_level',
    type: 'THRESHOLD_BREACH',
    threshold: 10,
    windowHours: 1,
    enabled: true,
    severity: 'MEDIUM'
  },
  {
    id: 'after-hours-activity',
    name: 'After Hours Activity',
    metric: 'activity_count',
    type: 'UNUSUAL_PATTERN',
    stdDevMultiplier: 5,
    windowHours: 1,
    enabled: true,
    severity: 'LOW'
  }
]

// Detect anomalies based on rules
export async function detectAnomalies(): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = []

  for (const rule of DEFAULT_RULES) {
    if (!rule.enabled) continue

    const detected = await applyRule(rule)
    anomalies.push(...detected)
  }

  // Save detected anomalies
  for (const anomaly of anomalies) {
    await saveAnomaly(anomaly)
  }

  return anomalies
}

// Apply anomaly detection rule
async function applyRule(rule: AnomalyRule): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = []
  const now = new Date()
  const windowStart = subHours(now, rule.windowHours)

  switch (rule.metric) {
    case 'request_count':
      const requestAnomalies = await detectRequestVolumeAnomaly(rule, windowStart, now)
      anomalies.push(...requestAnomalies)
      break

    case 'failed_logins':
      const loginAnomalies = await detectFailedLoginAnomaly(rule, windowStart, now)
      anomalies.push(...loginAnomalies)
      break

    case 'stock_level':
      const stockAnomalies = await detectStockThresholdAnomaly(rule)
      anomalies.push(...stockAnomalies)
      break

    case 'activity_count':
      const activityAnomalies = await detectAfterHoursAnomaly(rule, windowStart, now)
      anomalies.push(...activityAnomalies)
      break
  }

  return anomalies
}

// Detect request volume anomaly
async function detectRequestVolumeAnomaly(
  rule: AnomalyRule,
  windowStart: Date,
  now: Date
): Promise<Anomaly[]> {
  // Get historical data (last 30 days)
  const historicalData: { date: string; count: number }[] = []

  for (let i = 30; i > 0; i--) {
    const dayStart = subDays(now, i)
    const dayEnd = subDays(now, i - 1)

    const count = await prisma.request.count({
      where: {
        createdAt: { gte: dayStart, lt: dayEnd }
      }
    })

    historicalData.push({
      date: format(dayStart, 'yyyy-MM-dd'),
      count
    })
  }

  // Calculate statistics
  const counts = historicalData.map(d => d.count)
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length
  const variance = counts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / counts.length
  const stdDev = Math.sqrt(variance)

  // Get current period count
  const currentCount = await prisma.request.count({
    where: {
      createdAt: { gte: windowStart, lte: now }
    }
  })

  const threshold = mean + (rule.stdDevMultiplier || 3) * stdDev

  if (currentCount > threshold) {
    return [{
      id: `request-volume-${Date.now()}`,
      type: rule.type,
      severity: rule.severity,
      title: 'Unusual Request Volume Detected',
      description: `Request count (${currentCount}) exceeds expected threshold (${Math.round(threshold)})`,
      metric: rule.metric,
      currentValue: currentCount,
      expectedValue: Math.round(mean),
      deviation: (currentCount - mean) / stdDev,
      timestamp: now,
      data: { historicalData, mean, stdDev, threshold },
      acknowledged: false
    }]
  }

  return []
}

// Detect failed login anomaly
async function detectFailedLoginAnomaly(
  rule: AnomalyRule,
  windowStart: Date,
  now: Date
): Promise<Anomaly[]> {
  // Get failed login counts by user
  const failedLogins = await prisma.auditLog.groupBy({
    by: ['userId'],
    where: {
      action: 'LOGIN_FAILED',
      createdAt: { gte: windowStart, lte: now }
    },
    _count: { userId: true }
  })

  // Calculate baseline (average failed logins per hour)
  const totalHours = 24 * 7 // 7 days
  const historicalFailed = await prisma.auditLog.count({
    where: {
      action: 'LOGIN_FAILED',
      createdAt: { gte: subDays(now, 7), lt: now }
    }
  })

  const avgPerHour = historicalFailed / totalHours
  const threshold = avgPerHour * (rule.stdDevMultiplier || 4)

  const anomalies: Anomaly[] = []

  for (const login of failedLogins) {
    if (login._count.userId > threshold && login.userId) {
      const user = await prisma.user.findUnique({
        where: { id: login.userId },
        select: { name: true, email: true }
      })

      anomalies.push({
        id: `failed-login-${login.userId}-${Date.now()}`,
        type: rule.type,
        severity: 'HIGH',
        title: 'Suspicious Login Activity',
        description: `User ${user?.name || login.userId} has ${login._count.userId} failed login attempts`,
        metric: rule.metric,
        currentValue: login._count.userId,
        expectedValue: Math.round(avgPerHour),
        deviation: (login._count.userId - avgPerHour) / (avgPerHour || 1),
        timestamp: now,
        data: { userId: login.userId, userName: user?.name, userEmail: user?.email },
        acknowledged: false
      })
    }
  }

  return anomalies
}

// Detect stock threshold anomaly
async function detectStockThresholdAnomaly(
  rule: AnomalyRule
): Promise<Anomaly[]> {
  const lowStockItems = await prisma.stockLevel.findMany({
    where: {
      quantity: { lte: rule.threshold || 10 }
    },
    include: {
      item: { select: { id: true, name: true } },
      warehouse: { select: { id: true, name: true } }
    }
  })

  return lowStockItems.map(stock => ({
    id: `stock-${stock.id}-${Date.now()}`,
    type: 'THRESHOLD_BREACH' as AnomalyType,
    severity: stock.quantity === 0 ? 'CRITICAL' : 'MEDIUM' as AnomalySeverity,
    title: stock.quantity === 0 ? 'Out of Stock' : 'Low Stock Alert',
    description: `${stock.item.name} at ${stock.warehouse.name}: ${stock.quantity} remaining`,
    metric: rule.metric,
    currentValue: stock.quantity,
    expectedValue: rule.threshold || 10,
    deviation: ((rule.threshold || 10) - stock.quantity) / (rule.threshold || 10),
    timestamp: new Date(),
    data: {
      itemId: stock.itemId,
      warehouseId: stock.warehouseId,
      itemName: stock.item.name,
      warehouseName: stock.warehouse.name,
      minQuantity: stock.minQuantity
    },
    acknowledged: false
  }))
}

// Detect after-hours activity anomaly
async function detectAfterHoursAnomaly(
  rule: AnomalyRule,
  windowStart: Date,
  now: Date
): Promise<Anomaly[]> {
  const hour = now.getHours()

  // Define "after hours" as outside 8 AM - 6 PM
  if (hour >= 8 && hour < 18) {
    return []
  }

  // Get activity in current hour
  const currentActivity = await prisma.auditLog.count({
    where: {
      createdAt: { gte: windowStart, lte: now }
    }
  })

  // Get historical after-hours activity
  const afterHoursActivity = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count
    FROM AuditLog
    WHERE createdAt >= datetime('now', '-30 days')
    AND (strftime('%H', createdAt) < '08' OR strftime('%H', createdAt) >= '18')
  `

  const historicalCount = Number(afterHoursActivity[0]?.count || 0)
  const avgPerHour = historicalCount / (30 * 10) // 30 days, ~10 after-hours per day

  const threshold = avgPerHour * (rule.stdDevMultiplier || 5)

  if (currentActivity > threshold) {
    return [{
      id: `after-hours-${Date.now()}`,
      type: rule.type,
      severity: rule.severity,
      title: 'Unusual After-Hours Activity',
      description: `${currentActivity} actions detected outside business hours`,
      metric: rule.metric,
      currentValue: currentActivity,
      expectedValue: Math.round(avgPerHour),
      deviation: (currentActivity - avgPerHour) / (avgPerHour || 1),
      timestamp: now,
      data: { hour, threshold },
      acknowledged: false
    }]
  }

  return []
}

// Save anomaly to database
async function saveAnomaly(anomaly: Anomaly): Promise<void> {
  // Check if similar anomaly already exists
  const existing = await prisma.anomaly.findFirst({
    where: {
      type: anomaly.type,
      metric: anomaly.metric,
      acknowledged: false,
      createdAt: { gte: subHours(new Date(), 24) }
    }
  })

  if (existing) return

  await prisma.anomaly.create({
    data: {
      type: anomaly.type,
      severity: anomaly.severity,
      title: anomaly.title,
      description: anomaly.description,
      metric: anomaly.metric,
      currentValue: anomaly.currentValue,
      expectedValue: anomaly.expectedValue,
      deviation: anomaly.deviation,
      data: JSON.stringify(anomaly.data),
      acknowledged: false
    }
  })
}

// Get active anomalies
export async function getActiveAnomalies(
  options: { limit?: number; severity?: AnomalySeverity } = {}
): Promise<Anomaly[]> {
  const anomalies = await prisma.anomaly.findMany({
    where: {
      acknowledged: false,
      ...(options.severity && { severity: options.severity })
    },
    orderBy: [
      { severity: 'desc' },
      { createdAt: 'desc' }
    ],
    take: options.limit || 20
  })

  return anomalies.map(a => ({
    id: a.id.toString(),
    type: a.type as AnomalyType,
    severity: a.severity as AnomalySeverity,
    title: a.title,
    description: a.description,
    metric: a.metric,
    currentValue: a.currentValue,
    expectedValue: a.expectedValue,
    deviation: a.deviation,
    timestamp: a.createdAt,
    data: JSON.parse(a.data || '{}'),
    acknowledged: a.acknowledged,
    acknowledgedBy: a.acknowledgedById || undefined,
    acknowledgedAt: a.acknowledgedAt || undefined
  }))
}

// Acknowledge anomaly
export async function acknowledgeAnomaly(
  anomalyId: number,
  userId: number,
  notes?: string
): Promise<void> {
  await prisma.anomaly.update({
    where: { id: anomalyId },
    data: {
      acknowledged: true,
      acknowledgedById: userId,
      acknowledgedAt: new Date(),
      notes
    }
  })
}

// Get anomaly statistics
export async function getAnomalyStats(): Promise<{
  total: number
  byType: Record<AnomalyType, number>
  bySeverity: Record<AnomalySeverity, number>
  acknowledged: number
  unacknowledged: number
  trend: Array<{ date: string; count: number }>
}> {
  const thirtyDaysAgo = subDays(new Date(), 30)

  const anomalies = await prisma.anomaly.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo }
    }
  })

  const byType: Record<AnomalyType, number> = {
    UNUSUAL_VOLUME: 0,
    UNUSUAL_PATTERN: 0,
    THRESHOLD_BREACH: 0,
    TREND_CHANGE: 0,
    OUTLIER: 0
  }

  const bySeverity: Record<AnomalySeverity, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0
  }

  let acknowledged = 0
  let unacknowledged = 0

  const trendMap: Record<string, number> = {}

  for (const anomaly of anomalies) {
    byType[anomaly.type as AnomalyType]++
    bySeverity[anomaly.severity as AnomalySeverity]++

    if (anomaly.acknowledged) {
      acknowledged++
    } else {
      unacknowledged++
    }

    const date = format(anomaly.createdAt, 'yyyy-MM-dd')
    trendMap[date] = (trendMap[date] || 0) + 1
  }

  const trend = Object.entries(trendMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    total: anomalies.length,
    byType,
    bySeverity,
    acknowledged,
    unacknowledged,
    trend
  }
}

// Run scheduled anomaly detection
export async function runAnomalyDetection(): Promise<{
  detected: number
  anomalies: Anomaly[]
}> {
  const anomalies = await detectAnomalies()

  // Send alerts for critical anomalies
  const criticalAnomalies = anomalies.filter(a => a.severity === 'CRITICAL')

  for (const anomaly of criticalAnomalies) {
    await sendAnomalyAlert(anomaly)
  }

  return {
    detected: anomalies.length,
    anomalies
  }
}

// Send anomaly alert
async function sendAnomalyAlert(anomaly: Anomaly): Promise<void> {
  // Get admin users
  const admins = await prisma.user.findMany({
    where: {
      userRoles: {
        some: {
          role: { slug: { in: ['admin', 'superadmin'] } }
        }
      },
      status: 'ACTIVE'
    }
  })

  // Create notifications
  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: 'ANOMALY',
        title: `🚨 ${anomaly.title}`,
        message: anomaly.description,
        data: JSON.stringify({
          anomalyId: anomaly.id,
          severity: anomaly.severity,
          type: anomaly.type
        }),
        read: false
      }
    })
  }
}
```

---

## Anomaly Dashboard Component

```typescript
// components/anomaly/anomaly-dashboard.tsx
'use client'

import { useI18n } from '@/hooks/use-i18n'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Bell,
  Loader2,
  XCircle
} from 'lucide-react'
import {
  getActiveAnomalies,
  getAnomalyStats,
  acknowledgeAnomaly
} from '@/lib/anomaly/service'
import { formatDistanceToNow } from 'date-fns'
import { th, enUS } from 'date-fns/locale'

interface AnomalyDashboardProps {
  userId: number
}

export function AnomalyDashboard({ userId }: AnomalyDashboardProps) {
  const { locale } = useI18n()
  const queryClient = useQueryClient()
  const dateLocale = locale === 'th' ? th : enUS

  const { data: anomalies, isLoading: anomaliesLoading } = useQuery({
    queryKey: ['anomalies', 'active'],
    queryFn: () => getActiveAnomalies({ limit: 50 })
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['anomalies', 'stats'],
    queryFn: getAnomalyStats
  })

  const acknowledgeMutation = useMutation({
    mutationFn: ({ anomalyId, notes }: { anomalyId: number; notes?: string }) =>
      acknowledgeAnomaly(anomalyId, userId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] })
    }
  })

  const severityColors: Record<string, string> = {
    LOW: 'bg-blue-100 text-blue-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    CRITICAL: 'bg-red-100 text-red-800'
  }

  const severityIcons: Record<string, React.ReactNode> = {
    LOW: <AlertCircle className="h-4 w-4" />,
    MEDIUM: <AlertTriangle className="h-4 w-4" />,
    HIGH: <AlertTriangle className="h-4 w-4" />,
    CRITICAL: <XCircle className="h-4 w-4" />
  }

  const typeLabels: Record<string, { en: string; th: string }> = {
    UNUSUAL_VOLUME: { en: 'Unusual Volume', th: 'ปริมาณผิดปกติ' },
    UNUSUAL_PATTERN: { en: 'Unusual Pattern', th: 'รูปแบบผิดปกติ' },
    THRESHOLD_BREACH: { en: 'Threshold Breach', th: 'เกินขีดจำกัด' },
    TREND_CHANGE: { en: 'Trend Change', th: 'แนวโน้มเปลี่ยนแปลง' },
    OUTLIER: { en: 'Outlier', th: 'ค่านอกขอบเขต' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
            {locale === 'th' ? 'ตรวจจับความผิดปกติ' : 'Anomaly Detection'}
          </h1>
          <p className="text-muted-foreground">
            {locale === 'th'
              ? 'ติดตามและจัดการความผิดปกติในระบบ'
              : 'Monitor and manage system anomalies'}
          </p>
        </div>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['anomalies'] })}>
          <Clock className="h-4 w-4 mr-2" />
          {locale === 'th' ? 'รีเฟรช' : 'Refresh'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {locale === 'th' ? 'รอดำเนินการ' : 'Unacknowledged'}
                </p>
                <p className="text-2xl font-bold">{stats?.unacknowledged || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {locale === 'th' ? 'ดำเนินการแล้ว' : 'Acknowledged'}
                </p>
                <p className="text-2xl font-bold">{stats?.acknowledged || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {locale === 'th' ? 'ระดับสูง' : 'High Severity'}
                </p>
                <p className="text-2xl font-bold">{stats?.bySeverity.HIGH || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {locale === 'th' ? '30 วันที่ผ่านมา' : 'Last 30 Days'}
                </p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Anomalies List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {locale === 'th' ? 'ความผิดปกติที่รอดำเนินการ' : 'Active Anomalies'}
          </CardTitle>
          <CardDescription>
            {locale === 'th'
              ? 'รายการความผิดปกติที่ยังไม่ได้รับการยืนยัน'
              : 'Anomalies waiting for acknowledgment'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {anomaliesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : anomalies && anomalies.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {anomalies.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className="flex items-start gap-4 p-4 border rounded-lg"
                  >
                    <div className={`p-2 rounded-lg ${
                      anomaly.severity === 'CRITICAL' ? 'bg-red-100' :
                      anomaly.severity === 'HIGH' ? 'bg-orange-100' :
                      anomaly.severity === 'MEDIUM' ? 'bg-yellow-100' :
                      'bg-blue-100'
                    }`}>
                      {severityIcons[anomaly.severity]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{anomaly.title}</h4>
                        <Badge className={severityColors[anomaly.severity]}>
                          {anomaly.severity}
                        </Badge>
                        <Badge variant="outline">
                          {typeLabels[anomaly.type]
                            ? locale === 'th'
                              ? typeLabels[anomaly.type].th
                              : typeLabels[anomaly.type].en
                            : anomaly.type}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">
                        {anomaly.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          {locale === 'th' ? 'ค่าปัจจุบัน' : 'Current'}: {anomaly.currentValue}
                        </span>
                        <span>
                          {locale === 'th' ? 'ค่าคาดหวัง' : 'Expected'}: {anomaly.expectedValue}
                        </span>
                        <span>
                          {locale === 'th' ? 'ส่วนเบี่ยงเบน' : 'Deviation'}: {anomaly.deviation.toFixed(2)}σ
                        </span>
                        <span>
                          {formatDistanceToNow(new Date(anomaly.timestamp), {
                            addSuffix: true,
                            locale: dateLocale
                          })}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => acknowledgeMutation.mutate({
                        anomalyId: parseInt(anomaly.id)
                      })}
                      disabled={acknowledgeMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {locale === 'th' ? 'ยืนยัน' : 'Acknowledge'}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg font-medium">
                {locale === 'th' ? 'ไม่พบความผิดปกติ' : 'No Anomalies Detected'}
              </p>
              <p className="text-muted-foreground">
                {locale === 'th'
                  ? 'ระบบทำงานตามปกติ'
                  : 'System is operating normally'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Prisma Schema

```prisma
// Anomaly
model Anomaly {
  id              Int       @id @default(autoincrement())
  type            String
  severity        String
  title           String
  description     String
  metric          String
  currentValue    Float
  expectedValue   Float
  deviation       Float
  data            String?   // JSON
  acknowledged    Boolean   @default(false)
  acknowledgedById Int?
  acknowledgedAt  DateTime?
  notes           String?
  createdAt       DateTime  @default(now())

  acknowledgedBy  User?     @relation(fields: [acknowledgedById], references: [id])

  @@index([type])
  @@index([severity])
  @@index([acknowledged])
  @@index([createdAt])
}
```

---

## Usage Examples

```tsx
// Example 1: Anomaly detection cron job
// lib/cron/anomaly-detection.ts
import { runAnomalyDetection } from '@/lib/anomaly/service'

export async function hourlyAnomalyCheck() {
  const result = await runAnomalyDetection()

  console.log(`Detected ${result.detected} anomalies`)

  // Log critical anomalies
  const critical = result.anomalies.filter(a => a.severity === 'CRITICAL')
  if (critical.length > 0) {
    // Send email to admins
    await sendCriticalAlert(critical)
  }
}

// Example 2: Display anomaly dashboard
import { AnomalyDashboard } from '@/components/anomaly/anomaly-dashboard'

export default function AnomaliesPage() {
  const session = useSession()

  return (
    <div className="container mx-auto py-6">
      <AnomalyDashboard userId={parseInt(session.user.id)} />
    </div>
  )
}

// Example 3: Quick anomaly badge in header
import { getActiveAnomalies } from '@/lib/anomaly/service'

async function AnomalyBadge() {
  const anomalies = await getActiveAnomalies({ severity: 'HIGH' })

  if (anomalies.length === 0) return null

  return (
    <Badge variant="destructive" className="gap-1">
      <AlertTriangle className="h-3 w-3" />
      {anomalies.length}
    </Badge>
  )
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
