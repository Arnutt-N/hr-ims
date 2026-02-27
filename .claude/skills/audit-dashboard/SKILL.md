---
name: audit-dashboard
description: Comprehensive audit dashboard and compliance monitoring for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["audit dashboard", "compliance", "audit report", "audit analytics"]
  file_patterns: ["*audit-dashboard*", "*compliance*"]
  context: audit dashboards, compliance monitoring, audit analytics
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# Audit Dashboard

## Core Role

Implement comprehensive audit dashboard and compliance monitoring:
- Real-time audit visualization
- Compliance score tracking
- Anomaly detection
- Audit trend analysis

---

## Audit Analytics Service

```typescript
// lib/audit/analytics.ts
import prisma from '@/lib/prisma'
import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, format } from 'date-fns'

export interface AuditMetrics {
  totalActions: number
  actionsByType: Record<string, number>
  actionsByUser: Array<{ userId: number; userName: string; count: number }>
  actionsByTable: Record<string, number>
  failedActions: number
  avgActionsPerDay: number
  peakHour: number
  uniqueUsers: number
}

export interface ComplianceScore {
  overall: number
  categories: Array<{
    name: string
    score: number
    status: 'good' | 'warning' | 'critical'
    issues: string[]
  }>
}

export interface AuditTrend {
  date: string
  total: number
  creates: number
  updates: number
  deletes: number
}

export interface AnomalyDetection {
  id: string
  type: 'UNUSUAL_VOLUME' | 'AFTER_HOURS' | 'SENSITIVE_ACCESS' | 'FAILED_ATTEMPTS'
  severity: 'low' | 'medium' | 'high'
  description: string
  timestamp: Date
  details: Record<string, any>
}

// Get audit metrics for date range
export async function getAuditMetrics(
  startDate: Date,
  endDate: Date
): Promise<AuditMetrics> {
  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      user: { select: { id: true, name: true } }
    }
  })

  const actionsByType: Record<string, number> = {}
  const actionsByTable: Record<string, number> = {}
  const userActions: Record<number, { name: string; count: number }> = {}
  let failedActions = 0
  const hourCounts: Record<number, number> = {}

  for (const log of logs) {
    // Count by action type
    actionsByType[log.action] = (actionsByType[log.action] || 0) + 1

    // Count by table
    actionsByTable[log.tableName] = (actionsByTable[log.tableName] || 0) + 1

    // Count by user
    if (log.user) {
      if (!userActions[log.user.id]) {
        userActions[log.user.id] = { name: log.user.name, count: 0 }
      }
      userActions[log.user.id].count++
    }

    // Count failures
    if (log.action === 'LOGIN_FAILED' || log.newData?.includes('error')) {
      failedActions++
    }

    // Count by hour
    const hour = new Date(log.createdAt).getHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  }

  // Find peak hour
  let peakHour = 9
  let maxCount = 0
  for (const [hour, count] of Object.entries(hourCounts)) {
    if (count > maxCount) {
      maxCount = count
      peakHour = parseInt(hour)
    }
  }

  // Calculate average per day
  const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
  const avgActionsPerDay = logs.length / daysDiff

  return {
    totalActions: logs.length,
    actionsByType,
    actionsByUser: Object.entries(userActions)
      .map(([userId, data]) => ({
        userId: parseInt(userId),
        userName: data.name,
        count: data.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    actionsByTable,
    failedActions,
    avgActionsPerDay: Math.round(avgActionsPerDay),
    peakHour,
    uniqueUsers: Object.keys(userActions).length
  }
}

// Get audit trends
export async function getAuditTrends(
  startDate: Date,
  endDate: Date,
  groupBy: 'day' | 'week' | 'month' = 'day'
): Promise<AuditTrend[]> {
  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      createdAt: true,
      action: true
    }
  })

  const grouped: Record<string, { total: number; creates: number; updates: number; deletes: number }> = {}

  for (const log of logs) {
    let key: string
    const date = new Date(log.createdAt)

    switch (groupBy) {
      case 'week':
        key = format(startOfWeek(date), 'yyyy-MM-dd')
        break
      case 'month':
        key = format(startOfMonth(date), 'yyyy-MM')
        break
      default:
        key = format(date, 'yyyy-MM-dd')
    }

    if (!grouped[key]) {
      grouped[key] = { total: 0, creates: 0, updates: 0, deletes: 0 }
    }

    grouped[key].total++

    if (log.action === 'CREATE') grouped[key].creates++
    else if (log.action === 'UPDATE') grouped[key].updates++
    else if (log.action === 'DELETE') grouped[key].deletes++
  }

  return Object.entries(grouped)
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// Calculate compliance score
export async function getComplianceScore(): Promise<ComplianceScore> {
  const now = new Date()
  const thirtyDaysAgo = subDays(now, 30)

  const categories: ComplianceScore['categories'] = []

  // 1. Login Security
  const failedLogins = await prisma.auditLog.count({
    where: {
      action: 'LOGIN_FAILED',
      createdAt: { gte: thirtyDaysAgo }
    }
  })

  const successfulLogins = await prisma.auditLog.count({
    where: {
      action: 'LOGIN',
      createdAt: { gte: thirtyDaysAgo }
    }
  })

  const loginFailureRate = successfulLogins > 0 ? (failedLogins / (failedLogins + successfulLogins)) * 100 : 0

  categories.push({
    name: 'Login Security',
    score: Math.max(0, 100 - loginFailureRate * 2),
    status: loginFailureRate > 20 ? 'critical' : loginFailureRate > 10 ? 'warning' : 'good',
    issues: loginFailureRate > 10 ? [`High login failure rate: ${loginFailureRate.toFixed(1)}%`] : []
  })

  // 2. Data Access Patterns
  const sensitiveAccess = await prisma.auditLog.count({
    where: {
      tableName: { in: ['User', 'AuditLog', 'Settings'] },
      action: 'READ',
      createdAt: { gte: thirtyDaysAgo }
    }
  })

  const totalReads = await prisma.auditLog.count({
    where: {
      action: 'READ',
      createdAt: { gte: thirtyDaysAgo }
    }
  })

  const sensitiveAccessRate = totalReads > 0 ? (sensitiveAccess / totalReads) * 100 : 0

  categories.push({
    name: 'Data Access',
    score: sensitiveAccessRate < 5 ? 100 : sensitiveAccessRate < 10 ? 80 : 60,
    status: sensitiveAccessRate > 10 ? 'warning' : 'good',
    issues: sensitiveAccessRate > 10 ? [`High sensitive data access: ${sensitiveAccessRate.toFixed(1)}%`] : []
  })

  // 3. Deletion Audit
  const deletesWithoutBackup = await prisma.auditLog.count({
    where: {
      action: 'DELETE',
      createdAt: { gte: thirtyDaysAgo },
      // Check if oldData is null (no backup)
      oldData: null
    }
  })

  const totalDeletes = await prisma.auditLog.count({
    where: {
      action: 'DELETE',
      createdAt: { gte: thirtyDaysAgo }
    }
  })

  categories.push({
    name: 'Deletion Audit',
    score: totalDeletes === 0 ? 100 : Math.max(0, 100 - (deletesWithoutBackup / totalDeletes) * 100),
    status: deletesWithoutBackup > 0 ? 'critical' : 'good',
    issues: deletesWithoutBackup > 0 ? [`${deletesWithoutBackup} deletions without backup data`] : []
  })

  // 4. After Hours Activity
  const afterHoursActions = await prisma.auditLog.count({
    where: {
      createdAt: { gte: thirtyDaysAgo },
      // Outside 8 AM - 6 PM
      OR: [
        { createdAt: { gte: thirtyDaysAgo } }
      ]
    }
  })

  // Raw query for hour check
  const afterHours = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count
    FROM AuditLog
    WHERE createdAt >= ${thirtyDaysAgo}
    AND (strftime('%H', createdAt) < '08' OR strftime('%H', createdAt) >= '18')
  `

  const afterHoursCount = Number(afterHours[0]?.count || 0)
  const totalActions = await prisma.auditLog.count({
    where: { createdAt: { gte: thirtyDaysAgo } }
  })

  const afterHoursRate = totalActions > 0 ? (afterHoursCount / totalActions) * 100 : 0

  categories.push({
    name: 'Working Hours',
    score: Math.max(0, 100 - afterHoursRate * 2),
    status: afterHoursRate > 10 ? 'warning' : 'good',
    issues: afterHoursRate > 10 ? [`${afterHoursRate.toFixed(1)}% activity outside working hours`] : []
  })

  // Calculate overall score
  const overall = categories.reduce((sum, cat) => sum + cat.score, 0) / categories.length

  return {
    overall: Math.round(overall),
    categories
  }
}

// Detect anomalies
export async function detectAnomalies(
  startDate: Date,
  endDate: Date
): Promise<AnomalyDetection[]> {
  const anomalies: AnomalyDetection[] = []

  // 1. Unusual Volume Detection
  const dailyCounts = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
    SELECT date(createdAt) as date, COUNT(*) as count
    FROM AuditLog
    WHERE createdAt >= ${startDate} AND createdAt <= ${endDate}
    GROUP BY date(createdAt)
    ORDER BY date(createdAt)
  `

  const counts = dailyCounts.map(d => Number(d.count))
  const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length
  const stdDev = Math.sqrt(
    counts.reduce((sum, c) => sum + Math.pow(c - avgCount, 2), 0) / counts.length
  )

  for (const day of dailyCounts) {
    const count = Number(day.count)
    if (count > avgCount + 2 * stdDev) {
      anomalies.push({
        id: `volume-${day.date}`,
        type: 'UNUSUAL_VOLUME',
        severity: count > avgCount + 3 * stdDev ? 'high' : 'medium',
        description: `Unusual activity on ${day.date}: ${count} actions (avg: ${Math.round(avgCount)})`,
        timestamp: new Date(day.date),
        details: { date: day.date, count, average: avgCount, stdDev }
      })
    }
  }

  // 2. After Hours Sensitive Access
  const afterHoursSensitive = await prisma.$queryRaw<
    Array<{ id: number; userId: number; tableName: string; createdAt: Date }>
  >`
    SELECT id, userId, tableName, createdAt
    FROM AuditLog
    WHERE createdAt >= ${startDate} AND createdAt <= ${endDate}
    AND (strftime('%H', createdAt) < '06' OR strftime('%H', createdAt) >= '22')
    AND tableName IN ('User', 'Settings', 'Role')
    AND action IN ('UPDATE', 'DELETE')
  `

  for (const log of afterHoursSensitive) {
    anomalies.push({
      id: `after-hours-${log.id}`,
      type: 'AFTER_HOURS',
      severity: 'high',
      description: `Sensitive ${log.tableName} access at ${new Date(log.createdAt).toLocaleTimeString()}`,
      timestamp: new Date(log.createdAt),
      details: { userId: log.userId, tableName: log.tableName }
    })
  }

  // 3. Failed Login Attempts
  const failedLoginsByUser = await prisma.auditLog.groupBy({
    by: ['userId'],
    where: {
      action: 'LOGIN_FAILED',
      createdAt: { gte: startDate, lte: endDate }
    },
    _count: true
  })

  for (const group of failedLoginsByUser) {
    if (group._count >= 5) {
      anomalies.push({
        id: `failed-login-${group.userId}`,
        type: 'FAILED_ATTEMPTS',
        severity: group._count >= 10 ? 'high' : 'medium',
        description: `${group._count} failed login attempts`,
        timestamp: new Date(),
        details: { userId: group.userId, count: group._count }
      })
    }
  }

  return anomalies.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

// Get user activity summary
export async function getUserActivitySummary(
  userId: number,
  days: number = 30
): Promise<{
  totalActions: number
  actionBreakdown: Record<string, number>
  lastActive: Date | null
  mostActiveDay: string | null
  tablesAccessed: string[]
}> {
  const startDate = subDays(new Date(), days)

  const logs = await prisma.auditLog.findMany({
    where: {
      userId,
      createdAt: { gte: startDate }
    },
    select: {
      action: true,
      tableName: true,
      createdAt: true
    }
  })

  const actionBreakdown: Record<string, number> = {}
  const dayCounts: Record<string, number> = {}
  const tablesAccessed = new Set<string>()
  let lastActive: Date | null = null

  for (const log of logs) {
    actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1
    tablesAccessed.add(log.tableName)

    const day = format(new Date(log.createdAt), 'yyyy-MM-dd')
    dayCounts[day] = (dayCounts[day] || 0) + 1

    if (!lastActive || new Date(log.createdAt) > lastActive) {
      lastActive = new Date(log.createdAt)
    }
  }

  let mostActiveDay: string | null = null
  let maxCount = 0
  for (const [day, count] of Object.entries(dayCounts)) {
    if (count > maxCount) {
      maxCount = count
      mostActiveDay = day
    }
  }

  return {
    totalActions: logs.length,
    actionBreakdown,
    lastActive,
    mostActiveDay,
    tablesAccessed: Array.from(tablesAccessed)
  }
}

// Export audit data
export async function exportAuditData(
  startDate: Date,
  endDate: Date,
  format: 'csv' | 'json' = 'csv'
): Promise<string> {
  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate }
    },
    include: {
      user: { select: { id: true, name: true, email: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  if (format === 'json') {
    return JSON.stringify(logs, null, 2)
  }

  // CSV format
  const headers = ['ID', 'Timestamp', 'User', 'Action', 'Table', 'Record ID', 'IP Address']
  const rows = logs.map(log => [
    log.id,
    log.createdAt.toISOString(),
    log.user?.name || 'System',
    log.action,
    log.tableName,
    log.recordId?.toString() || '',
    log.ipAddress || ''
  ])

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
}
```

---

## Audit Dashboard Component

```typescript
// components/audit/audit-dashboard.tsx
'use client'

import { useI18n } from '@/hooks/use-i18n'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Activity,
  Shield,
  AlertTriangle,
  TrendingUp,
  Users,
  Clock,
  Download,
  BarChart3
} from 'lucide-react'
import {
  getAuditMetrics,
  getComplianceScore,
  getAuditTrends,
  detectAnomalies
} from '@/lib/audit/analytics'
import { AuditMetricsCard } from './audit-metrics-card'
import { ComplianceScoreCard } from './compliance-score-card'
import { AuditTrendChart } from './audit-trend-chart'
import { AnomalyList } from './anomaly-list'
import { AuditActionsTable } from './audit-actions-table'

interface AuditDashboardProps {
  startDate?: Date
  endDate?: Date
}

export function AuditDashboard({
  startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  endDate = new Date()
}: AuditDashboardProps) {
  const { locale } = useI18n()

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['audit-metrics', startDate, endDate],
    queryFn: () => getAuditMetrics(startDate, endDate)
  })

  const { data: compliance, isLoading: complianceLoading } = useQuery({
    queryKey: ['compliance-score'],
    queryFn: () => getComplianceScore()
  })

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['audit-trends', startDate, endDate],
    queryFn: () => getAuditTrends(startDate, endDate, 'day')
  })

  const { data: anomalies, isLoading: anomaliesLoading } = useQuery({
    queryKey: ['audit-anomalies', startDate, endDate],
    queryFn: () => detectAnomalies(startDate, endDate)
  })

  const criticalAnomalies = anomalies?.filter(a => a.severity === 'high').length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {locale === 'th' ? 'แดชบอร์ดการตรวจสอบ' : 'Audit Dashboard'}
          </h1>
          <p className="text-muted-foreground">
            {locale === 'th'
              ? 'ติดตามและวิเคราะห์กิจกรรมในระบบ'
              : 'Monitor and analyze system activities'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {criticalAnomalies > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {criticalAnomalies} {locale === 'th' ? 'ปัญหา' : 'Issues'}
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {locale === 'th' ? 'กิจกรรมทั้งหมด' : 'Total Actions'}
                </p>
                <p className="text-2xl font-bold">
                  {metrics?.totalActions.toLocaleString() || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {locale === 'th' ? 'ผู้ใช้ที่ใช้งาน' : 'Active Users'}
                </p>
                <p className="text-2xl font-bold">
                  {metrics?.uniqueUsers || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {locale === 'th' ? 'คะแนนปฏิบัติตาม' : 'Compliance'}
                </p>
                <p className="text-2xl font-bold">
                  {compliance?.overall || '-'}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {locale === 'th' ? 'เฉลี่ย/วัน' : 'Avg/Day'}
                </p>
                <p className="text-2xl font-bold">
                  {metrics?.avgActionsPerDay || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            {locale === 'th' ? 'ภาพรวม' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="compliance">
            {locale === 'th' ? 'การปฏิบัติตาม' : 'Compliance'}
          </TabsTrigger>
          <TabsTrigger value="anomalies">
            {locale === 'th' ? 'ความผิดปกติ' : 'Anomalies'}
            {anomalies && anomalies.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {anomalies.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="actions">
            {locale === 'th' ? 'กิจกรรม' : 'Actions'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {locale === 'th' ? 'แนวโน้มกิจกรรม' : 'Activity Trend'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AuditTrendChart data={trends || []} loading={trendsLoading} />
              </CardContent>
            </Card>

            {/* Top Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {locale === 'th' ? 'ผู้ใช้ที่มีกิจกรรมมากที่สุด' : 'Top Active Users'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-3">
                    {metrics?.actionsByUser.map((user, index) => (
                      <div
                        key={user.userId}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground w-6">
                            #{index + 1}
                          </span>
                          <span className="font-medium">{user.userName}</span>
                        </div>
                        <Badge variant="secondary">
                          {user.count.toLocaleString()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Actions by Type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {locale === 'th' ? 'กิจกรรมตามประเภท' : 'Actions by Type'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(metrics?.actionsByType || {}).map(([action, count]) => (
                  <div key={action} className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold">{count.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{action}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceScoreCard
            data={compliance}
            loading={complianceLoading}
          />
        </TabsContent>

        <TabsContent value="anomalies">
          <AnomalyList
            anomalies={anomalies || []}
            loading={anomaliesLoading}
          />
        </TabsContent>

        <TabsContent value="actions">
          <AuditActionsTable
            startDate={startDate}
            endDate={endDate}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

---

## Compliance Score Card

```typescript
// components/audit/compliance-score-card.tsx
'use client'

import { useI18n } from '@/hooks/use-i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { ComplianceScore } from '@/lib/audit/analytics'

interface ComplianceScoreCardProps {
  data: ComplianceScore | undefined
  loading: boolean
}

export function ComplianceScoreCard({ data, loading }: ComplianceScoreCardProps) {
  const { locale } = useI18n()

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle>
            {locale === 'th' ? 'คะแนนปฏิบัติตามโดยรวม' : 'Overall Compliance Score'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="relative">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="16"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${(data.overall / 100) * 553} 553`}
                  className={getStatusColor(data.overall)}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className={`text-5xl font-bold ${getStatusColor(data.overall)}`}>
                    {data.overall}%
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {locale === 'th' ? 'คะแนนรวม' : 'Score'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.categories.map((category, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  {getStatusIcon(category.status)}
                  <h3 className="font-semibold">{category.name}</h3>
                </div>
                <Badge
                  variant={
                    category.status === 'good'
                      ? 'default'
                      : category.status === 'warning'
                      ? 'secondary'
                      : 'destructive'
                  }
                >
                  {category.score}%
                </Badge>
              </div>

              <Progress value={category.score} className="mb-3" />

              {category.issues.length > 0 && (
                <div className="space-y-1">
                  {category.issues.map((issue, i) => (
                    <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-500 shrink-0" />
                      {issue}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

---

## Anomaly List Component

```typescript
// components/audit/anomaly-list.tsx
'use client'

import { useI18n } from '@/hooks/use-i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertTriangle, Clock, Shield, Activity, Loader2 } from 'lucide-react'
import type { AnomalyDetection } from '@/lib/audit/analytics'

interface AnomalyListProps {
  anomalies: AnomalyDetection[]
  loading: boolean
}

export function AnomalyList({ anomalies, loading }: AnomalyListProps) {
  const { locale } = useI18n()

  const typeIcons = {
    UNUSUAL_VOLUME: <Activity className="h-4 w-4" />,
    AFTER_HOURS: <Clock className="h-4 w-4" />,
    SENSITIVE_ACCESS: <Shield className="h-4 w-4" />,
    FAILED_ATTEMPTS: <AlertTriangle className="h-4 w-4" />
  }

  const typeLabels = {
    UNUSUAL_VOLUME: { en: 'Unusual Volume', th: 'ปริมาณผิดปกติ' },
    AFTER_HOURS: { en: 'After Hours', th: 'นอกเวลาทำงาน' },
    SENSITIVE_ACCESS: { en: 'Sensitive Access', th: 'เข้าถึงข้อมูลสำคัญ' },
    FAILED_ATTEMPTS: { en: 'Failed Attempts', th: 'พยายามล้มเหลว' }
  }

  const severityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (anomalies.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Shield className="h-12 w-12 text-green-500 mb-4" />
          <p className="text-lg font-medium">
            {locale === 'th' ? 'ไม่พบความผิดปกติ' : 'No Anomalies Detected'}
          </p>
          <p className="text-muted-foreground">
            {locale === 'th'
              ? 'ระบบทำงานตามปกติในช่วงเวลาที่เลือก'
              : 'System is operating normally in the selected period'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {locale === 'th' ? 'รายการความผิดปกติ' : 'Anomaly List'}
          <Badge variant="secondary">{anomalies.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {anomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className="flex items-start gap-3 p-3 border rounded-lg"
              >
                <div className="mt-0.5">
                  {typeIcons[anomaly.type]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">
                      {locale === 'th'
                        ? typeLabels[anomaly.type].th
                        : typeLabels[anomaly.type].en}
                    </span>
                    <Badge className={severityColors[anomaly.severity]}>
                      {anomaly.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {anomaly.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(anomaly.timestamp).toLocaleString(
                      locale === 'th' ? 'th-TH' : 'en-US'
                    )}
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

---

## Usage Examples

```tsx
// Example 1: Audit dashboard page
import { AuditDashboard } from '@/components/audit/audit-dashboard'

export default function AuditPage() {
  return (
    <div className="container mx-auto py-6">
      <AuditDashboard />
    </div>
  )
}

// Example 2: Get metrics for specific date range
import { getAuditMetrics, getComplianceScore } from '@/lib/audit/analytics'

async function generateAuditReport() {
  const startDate = new Date('2024-01-01')
  const endDate = new Date('2024-01-31')

  const metrics = await getAuditMetrics(startDate, endDate)
  const compliance = await getComplianceScore()

  console.log('Total actions:', metrics.totalActions)
  console.log('Compliance score:', compliance.overall)
}

// Example 3: Detect and alert on anomalies
import { detectAnomalies } from '@/lib/audit/analytics'

async function checkForAnomalies() {
  const anomalies = await detectAnomalies(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
    new Date()
  )

  const critical = anomalies.filter(a => a.severity === 'high')

  if (critical.length > 0) {
    // Send alert to administrators
    await sendAlert({
      type: 'CRITICAL_ANOMALY',
      count: critical.length,
      details: critical
    })
  }
}

// Example 4: Export audit data
import { exportAuditData } from '@/lib/audit/analytics'

async function downloadAuditReport() {
  const csv = await exportAuditData(
    new Date('2024-01-01'),
    new Date('2024-01-31'),
    'csv'
  )

  // Download file
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  // ... trigger download
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
