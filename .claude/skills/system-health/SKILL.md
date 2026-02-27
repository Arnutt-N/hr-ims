---
name: system-health
description: System health monitoring and status checks for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["system health", "health check", "system status", "monitoring", "diagnostics"]
  file_patterns: ["*health*", "*monitor*", "*diagnostic*", "lib/health*"]
  context: system health, status monitoring, diagnostics, health checks
mcp_servers:
  - sequential
personas:
  - backend
  - devops
---

# System Health

## Core Role

Monitor system health for HR-IMS:
- Health checks
- System diagnostics
- Status monitoring
- Resource utilization

---

## Health Check Service

```typescript
// lib/health/health-check.ts
import prisma from '@/lib/prisma'
import { exec } from 'child_process'
import { promisify } from 'util'
import { diskusage } from 'diskusage-ng'

const execAsync = promisify(exec)

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: Date
  uptime: number
  version: string
  checks: Record<string, HealthCheck>
}

export interface HealthCheck {
  status: 'pass' | 'warn' | 'fail'
  message: string
  value?: number
  unit?: string
  timestamp: Date
  details?: Record<string, any>
}

// Main health check
export async function getSystemHealth(): Promise<HealthStatus> {
  const checks: Record<string, HealthCheck> = {}
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

  // Run all checks in parallel
  const [
    databaseCheck,
    memoryCheck,
    diskCheck,
    cpuCheck
  ] = await Promise.all([
    checkDatabase(),
    checkMemory(),
    checkDisk(),
    checkCPU()
  ])

  checks.database = databaseCheck
  checks.memory = memoryCheck
  checks.disk = diskCheck
  checks.cpu = cpuCheck

  // Determine overall status
  const checkValues = Object.values(checks)
  if (checkValues.some(c => c.status === 'fail')) {
    overallStatus = 'unhealthy'
  } else if (checkValues.some(c => c.status === 'warn')) {
    overallStatus = 'degraded'
  }

  return {
    status: overallStatus,
    timestamp: new Date(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    checks
  }
}

// Database health check
async function checkDatabase(): Promise<HealthCheck> {
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const responseTime = Date.now() - start

    // Check connection count
    const connectionCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM sqlite_master
    `

    if (responseTime > 1000) {
      return {
        status: 'warn',
        message: 'การเชื่อมต่อฐานข้อมูลช้า / Database connection slow',
        value: responseTime,
        unit: 'ms',
        timestamp: new Date()
      }
    }

    return {
      status: 'pass',
      message: 'ฐานข้อมูลทำงานปกติ / Database healthy',
      value: responseTime,
      unit: 'ms',
      timestamp: new Date()
    }
  } catch (error) {
    return {
      status: 'fail',
      message: 'ไม่สามารถเชื่อมต่อฐานข้อมูล / Database connection failed',
      timestamp: new Date(),
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

// Memory health check
async function checkMemory(): Promise<HealthCheck> {
  const memoryUsage = process.memoryUsage()
  const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024)
  const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024)
  const usagePercent = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)

  let status: 'pass' | 'warn' | 'fail' = 'pass'
  let message = 'หน่วยความจำเพียงพอ / Memory usage normal'

  if (usagePercent > 90) {
    status = 'fail'
    message = 'หน่วยความจำใกล้หมด / Memory critically low'
  } else if (usagePercent > 75) {
    status = 'warn'
    message = 'หน่วยความจำใช้มาก / Memory usage high'
  }

  return {
    status,
    message,
    value: heapUsedMB,
    unit: 'MB',
    timestamp: new Date(),
    details: {
      heapUsed: heapUsedMB,
      heapTotal: heapTotalMB,
      usagePercent,
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    }
  }
}

// Disk health check
async function checkDisk(): Promise<HealthCheck> {
  try {
    const path = process.cwd()

    // For Windows, use wmic command
    // For Linux/Mac, use df command
    let diskInfo: { available: number; total: number; used: number }

    if (process.platform === 'win32') {
      const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption')
      const lines = stdout.trim().split('\n').slice(1)

      // Find the drive containing the current path
      const driveLetter = path.charAt(0).toUpperCase()
      const driveLine = lines.find(line => line.trim().startsWith(driveLetter))

      if (driveLine) {
        const parts = driveLine.trim().split(/\s+/)
        const freeSpace = parseInt(parts[1])
        const totalSize = parseInt(parts[2])

        diskInfo = {
          available: freeSpace,
          total: totalSize,
          used: totalSize - freeSpace
        }
      } else {
        throw new Error('Drive not found')
      }
    } else {
      const { stdout } = await execAsync(`df -k "${path}" | tail -1`)
      const parts = stdout.trim().split(/\s+/)
      const total = parseInt(parts[1]) * 1024
      const used = parseInt(parts[2]) * 1024
      const available = parseInt(parts[3]) * 1024

      diskInfo = { total, used, available }
    }

    const usagePercent = Math.round((diskInfo.used / diskInfo.total) * 100)
    const availableGB = Math.round(diskInfo.available / 1024 / 1024 / 1024)
    const totalGB = Math.round(diskInfo.total / 1024 / 1024 / 1024)

    let status: 'pass' | 'warn' | 'fail' = 'pass'
    let message = 'พื้นที่ดิสก์เพียงพอ / Disk space sufficient'

    if (usagePercent > 95) {
      status = 'fail'
      message = 'พื้นที่ดิสก์ใกล้หมด / Disk critically low'
    } else if (usagePercent > 85) {
      status = 'warn'
      message = 'พื้นที่ดิสก์เหลือน้อย / Disk space low'
    }

    return {
      status,
      message,
      value: availableGB,
      unit: 'GB',
      timestamp: new Date(),
      details: {
        available: availableGB,
        total: totalGB,
        used: totalGB - availableGB,
        usagePercent
      }
    }
  } catch (error) {
    return {
      status: 'warn',
      message: 'ไม่สามารถตรวจสอบพื้นที่ดิสก์ / Unable to check disk space',
      timestamp: new Date()
    }
  }
}

// CPU health check
async function checkCPU(): Promise<HealthCheck> {
  const cpus = process.cpuUsage()
  const loadAvg = process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0]

  const cpuCount = require('os').cpus().length
  const load1Min = loadAvg[0] / cpuCount
  const load5Min = loadAvg[1] / cpuCount
  const load15Min = loadAvg[2] / cpuCount

  let status: 'pass' | 'warn' | 'fail' = 'pass'
  let message = 'CPU ทำงานปกติ / CPU usage normal'

  if (load1Min > 0.9) {
    status = 'fail'
    message = 'CPU ใช้งานหนักมาก / CPU critically high'
  } else if (load1Min > 0.7) {
    status = 'warn'
    message = 'CPU ใช้งานมาก / CPU usage high'
  }

  return {
    status,
    message,
    value: Math.round(load1Min * 100),
    unit: '%',
    timestamp: new Date(),
    details: {
      cpuCount,
      load1Min: Math.round(load1Min * 100),
      load5Min: Math.round(load5Min * 100),
      load15Min: Math.round(load15Min * 100),
      userCPU: cpus.user,
      systemCPU: cpus.system
    }
  }
}

// Quick health check (lightweight)
export async function quickHealthCheck(): Promise<{ status: string; timestamp: Date }> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'ok', timestamp: new Date() }
  } catch {
    return { status: 'error', timestamp: new Date() }
  }
}

// Database statistics
export async function getDatabaseStats(): Promise<{
  users: number
  items: number
  requests: number
  warehouses: number
  auditLogs: number
}> {
  const [users, items, requests, warehouses, auditLogs] = await Promise.all([
    prisma.user.count(),
    prisma.inventoryItem.count(),
    prisma.request.count(),
    prisma.warehouse.count(),
    prisma.auditLog.count()
  ])

  return { users, items, requests, warehouses, auditLogs }
}
```

---

## System Metrics Collector

```typescript
// lib/health/metrics.ts
import prisma from '@/lib/prisma'

export interface SystemMetrics {
  timestamp: Date
  cpu: CPUMetrics
  memory: MemoryMetrics
  database: DatabaseMetrics
  requests: RequestMetrics
  errors: ErrorMetrics
}

export interface CPUMetrics {
  usage: number
  loadAverage: number[]
}

export interface MemoryMetrics {
  heapUsed: number
  heapTotal: number
  rss: number
  external: number
}

export interface DatabaseMetrics {
  connections: number
  queries: number
  slowQueries: number
  size: number
}

export interface RequestMetrics {
  total: number
  successful: number
  failed: number
  averageResponseTime: number
}

export interface ErrorMetrics {
  total: number
  byType: Record<string, number>
}

// Collect current metrics
export function collectMetrics(): SystemMetrics {
  const memoryUsage = process.memoryUsage()
  const os = require('os')

  return {
    timestamp: new Date(),
    cpu: {
      usage: process.cpuUsage().user / 1000, // Convert to ms
      loadAverage: os.loadavg()
    },
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    },
    database: {
      connections: 1, // SQLite
      queries: 0,
      slowQueries: 0,
      size: 0
    },
    requests: {
      total: 0,
      successful: 0,
      failed: 0,
      averageResponseTime: 0
    },
    errors: {
      total: 0,
      byType: {}
    }
  }
}

// Store metrics in database (for historical tracking)
export async function storeMetrics(metrics: SystemMetrics): Promise<void> {
  // Could store in a dedicated metrics table or external service
  // For simplicity, we'll just log it
  console.log('Metrics collected:', JSON.stringify(metrics, null, 2))
}

// Get metrics history
export async function getMetricsHistory(
  startDate: Date,
  endDate: Date
): Promise<SystemMetrics[]> {
  // Return from storage
  return []
}
```

---

## Health Dashboard Component

```typescript
// components/admin/health-dashboard.tsx
'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Activity,
  Database,
  HardDrive,
  Cpu,
  MemoryStick,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw
} from 'lucide-react'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  checks: Record<string, HealthCheck>
}

interface HealthCheck {
  status: 'pass' | 'warn' | 'fail'
  message: string
  value?: number
  unit?: string
  details?: Record<string, any>
}

export function HealthDashboard() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchHealth = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/health')
      const data = await response.json()
      setHealth(data)
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to fetch health:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'degraded':
      case 'warn':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'unhealthy':
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Activity className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      healthy: 'bg-green-100 text-green-800',
      degraded: 'bg-yellow-100 text-yellow-800',
      unhealthy: 'bg-red-100 text-red-800',
      pass: 'bg-green-100 text-green-800',
      warn: 'bg-yellow-100 text-yellow-800',
      fail: 'bg-red-100 text-red-800'
    }

    const labels: Record<string, string> = {
      healthy: 'ปกติ / Healthy',
      degraded: 'ช้าลง / Degraded',
      unhealthy: 'มีปัญหา / Unhealthy',
      pass: 'ผ่าน / Pass',
      warn: 'เตือน / Warning',
      fail: 'ล้มเหลว / Failed'
    }

    return (
      <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {labels[status] || status}
      </Badge>
    )
  }

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">สถานะระบบ / System Health</h2>
          <p className="text-muted-foreground">
            อัปเดตล่าสุด: {format(lastRefresh, 'dd/MM/yyyy HH:mm:ss', { locale: th })}
          </p>
        </div>
        <Button onClick={fetchHealth} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรช / Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getStatusIcon(health?.status || '')}
              <div>
                <h3 className="text-lg font-semibold">สถานะโดยรวม / Overall Status</h3>
                <p className="text-muted-foreground">
                  Uptime: {formatUptime(health?.uptime || 0)} | Version: {health?.version}
                </p>
              </div>
            </div>
            {getStatusBadge(health?.status || '')}
          </div>
        </CardContent>
      </Card>

      {/* Individual Checks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Database */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              ฐานข้อมูล / Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            {health?.checks.database && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  {getStatusIcon(health.checks.database.status)}
                  {getStatusBadge(health.checks.database.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {health.checks.database.message}
                </p>
                {health.checks.database.value !== undefined && (
                  <p className="text-2xl font-bold">
                    {health.checks.database.value} {health.checks.database.unit}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Memory */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MemoryStick className="h-4 w-4" />
              หน่วยความจำ / Memory
            </CardTitle>
          </CardHeader>
          <CardContent>
            {health?.checks.memory && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  {getStatusIcon(health.checks.memory.status)}
                  {getStatusBadge(health.checks.memory.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {health.checks.memory.message}
                </p>
                {health.checks.memory.details && (
                  <>
                    <p className="text-2xl font-bold">
                      {health.checks.memory.value} {health.checks.memory.unit}
                    </p>
                    <Progress
                      value={health.checks.memory.details.usagePercent}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      {health.checks.memory.details.usagePercent}% ใช้งาน
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disk */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              ดิสก์ / Disk
            </CardTitle>
          </CardHeader>
          <CardContent>
            {health?.checks.disk && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  {getStatusIcon(health.checks.disk.status)}
                  {getStatusBadge(health.checks.disk.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {health.checks.disk.message}
                </p>
                {health.checks.disk.details && (
                  <>
                    <p className="text-2xl font-bold">
                      {health.checks.disk.value} {health.checks.disk.unit} เหลือ
                    </p>
                    <Progress
                      value={health.checks.disk.details.usagePercent}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      {health.checks.disk.details.used} / {health.checks.disk.details.total} GB
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CPU */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              CPU
            </CardTitle>
          </CardHeader>
          <CardContent>
            {health?.checks.cpu && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  {getStatusIcon(health.checks.cpu.status)}
                  {getStatusBadge(health.checks.cpu.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {health.checks.cpu.message}
                </p>
                {health.checks.cpu.details && (
                  <>
                    <p className="text-2xl font-bold">
                      {health.checks.cpu.value}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {health.checks.cpu.details.cpuCount} cores
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      {health?.checks && (
        <Card>
          <CardHeader>
            <CardTitle>รายละเอียด / Details</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded overflow-auto">
              {JSON.stringify(health.checks, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

---

## Health API Routes

```typescript
// app/api/admin/health/route.ts
import { NextResponse } from 'next/server'
import { getSystemHealth, quickHealthCheck } from '@/lib/health/health-check'
import { auth } from '@/auth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const quick = searchParams.get('quick') === 'true'

  // Quick health check (no auth required for load balancers)
  if (quick) {
    const result = await quickHealthCheck()
    return NextResponse.json(result)
  }

  // Full health check (requires admin auth)
  const session = await auth()
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const health = await getSystemHealth()
  return NextResponse.json(health)
}
```

---

## Usage Examples

```typescript
// Example 1: Quick health check endpoint
// GET /api/admin/health?quick=true
// Response: { "status": "ok", "timestamp": "2024-01-15T10:30:00.000Z" }

// Example 2: Full health check
const health = await getSystemHealth()
console.log(health.status) // 'healthy', 'degraded', or 'unhealthy'

// Example 3: Check specific component
const dbCheck = await checkDatabase()
if (dbCheck.status === 'fail') {
  // Alert administrators
}

// Example 4: Get database stats
const stats = await getDatabaseStats()
console.log(`Users: ${stats.users}, Items: ${stats.items}`)
```

---

*Version: 1.0.0 | For HR-IMS Project*
