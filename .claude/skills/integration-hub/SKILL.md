---
name: integration-hub
description: External system integration hub for HR-IMS with API connectors
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["integration", "api connector", "external system", "webhook", "sync"]
  file_patterns: ["*integration*", "*connector*", "*webhook*"]
  context: external integrations, API connectors, webhooks, data sync
mcp_servers:
  - sequential
personas:
  - backend
  - architect
---

# Integration Hub

## Core Role

Implement external system integration hub:
- API connectors for external systems
- Webhook management
- Data synchronization
- Integration monitoring

---

## Integration Service

```typescript
// lib/integration/service.ts
import prisma from '@/lib/prisma'
import { AuditAction, createAuditLog } from '@/lib/audit/logger'

export type IntegrationType =
  | 'HR_SYSTEM'
  | 'ACCOUNTING'
  | 'ERP'
  | 'NOTIFICATION'
  | 'STORAGE'
  | 'CUSTOM'

export type SyncStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export interface IntegrationConfig {
  id: string
  name: string
  type: IntegrationType
  endpoint: string
  apiKey?: string
  secret?: string
  headers?: Record<string, string>
  syncInterval?: number // minutes
  enabled: boolean
}

export interface SyncJob {
  id: string
  integrationId: string
  direction: 'IMPORT' | 'EXPORT' | 'BIDIRECTIONAL'
  entityType: string
  status: SyncStatus
  startedAt: Date
  completedAt?: Date
  recordsProcessed: number
  recordsFailed: number
  error?: string
}

// Register integration
export async function registerIntegration(
  config: Omit<IntegrationConfig, 'id'>,
  userId: number
): Promise<IntegrationConfig> {
  const integration = await prisma.integration.create({
    data: {
      name: config.name,
      type: config.type,
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      secret: config.secret,
      headers: config.headers ? JSON.stringify(config.headers) : null,
      syncInterval: config.syncInterval,
      enabled: config.enabled
    }
  })

  await createAuditLog({
    action: AuditAction.CREATE,
    tableName: 'Integration',
    recordId: integration.id,
    userId,
    oldData: null,
    newData: config
  })

  return {
    id: integration.id.toString(),
    ...config
  }
}

// Update integration
export async function updateIntegration(
  id: number,
  config: Partial<IntegrationConfig>,
  userId: number
): Promise<void> {
  const oldIntegration = await prisma.integration.findUnique({
    where: { id }
  })

  await prisma.integration.update({
    where: { id },
    data: {
      name: config.name,
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      secret: config.secret,
      headers: config.headers ? JSON.stringify(config.headers) : undefined,
      syncInterval: config.syncInterval,
      enabled: config.enabled
    }
  })

  await createAuditLog({
    action: AuditAction.UPDATE,
    tableName: 'Integration',
    recordId: id,
    userId,
    oldData: oldIntegration,
    newData: config
  })
}

// Delete integration
export async function deleteIntegration(id: number, userId: number): Promise<void> {
  const integration = await prisma.integration.findUnique({
    where: { id }
  })

  await prisma.integration.delete({
    where: { id }
  })

  await createAuditLog({
    action: AuditAction.DELETE,
    tableName: 'Integration',
    recordId: id,
    userId,
    oldData: integration,
    newData: null
  })
}

// Test integration connection
export async function testIntegration(id: number): Promise<{
  success: boolean
  message: string
  latency?: number
}> {
  const integration = await prisma.integration.findUnique({
    where: { id }
  })

  if (!integration) {
    return { success: false, message: 'Integration not found' }
  }

  const startTime = Date.now()

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(integration.headers ? JSON.parse(integration.headers) : {})
    }

    if (integration.apiKey) {
      headers['Authorization'] = `Bearer ${integration.apiKey}`
    }

    const response = await fetch(integration.endpoint, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(10000)
    })

    const latency = Date.now() - startTime

    if (response.ok) {
      // Update last connected at
      await prisma.integration.update({
        where: { id },
        data: {
          lastConnectedAt: new Date(),
          status: 'CONNECTED'
        }
      })

      return {
        success: true,
        message: 'Connection successful',
        latency
      }
    } else {
      await prisma.integration.update({
        where: { id },
        data: { status: 'ERROR' }
      })

      return {
        success: false,
        message: `Connection failed: ${response.status} ${response.statusText}`,
        latency
      }
    }
  } catch (error) {
    const latency = Date.now() - startTime

    await prisma.integration.update({
      where: { id },
      data: { status: 'ERROR' }
    })

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
      latency
    }
  }
}

// Trigger sync job
export async function triggerSync(
  integrationId: number,
  direction: 'IMPORT' | 'EXPORT' | 'BIDIRECTIONAL',
  entityType: string,
  userId: number
): Promise<{ jobId: number }> {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId }
  })

  if (!integration || !integration.enabled) {
    throw new Error('Integration not found or disabled')
  }

  // Create sync job
  const job = await prisma.syncJob.create({
    data: {
      integrationId,
      direction,
      entityType,
      status: 'PENDING',
      recordsProcessed: 0,
      recordsFailed: 0
    }
  })

  // Start sync in background
  executeSyncJob(job.id, userId).catch(console.error)

  return { jobId: job.id }
}

// Execute sync job
async function executeSyncJob(jobId: number, userId: number): Promise<void> {
  const job = await prisma.syncJob.findUnique({
    where: { id: jobId },
    include: { integration: true }
  })

  if (!job) return

  try {
    // Update status to running
    await prisma.syncJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING', startedAt: new Date() }
    })

    let recordsProcessed = 0
    let recordsFailed = 0

    switch (job.direction) {
      case 'IMPORT':
        const importResult = await executeImport(job)
        recordsProcessed = importResult.processed
        recordsFailed = importResult.failed
        break

      case 'EXPORT':
        const exportResult = await executeExport(job)
        recordsProcessed = exportResult.processed
        recordsFailed = exportResult.failed
        break

      case 'BIDIRECTIONAL':
        const biImportResult = await executeImport(job)
        const biExportResult = await executeExport(job)
        recordsProcessed = biImportResult.processed + biExportResult.processed
        recordsFailed = biImportResult.failed + biExportResult.failed
        break
    }

    // Update job status
    await prisma.syncJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        recordsProcessed,
        recordsFailed
      }
    })

    await createAuditLog({
      action: AuditAction.UPDATE,
      tableName: 'SyncJob',
      recordId: jobId,
      userId,
      oldData: { status: 'PENDING' },
      newData: { status: 'COMPLETED', recordsProcessed, recordsFailed }
    })
  } catch (error) {
    await prisma.syncJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
}

// Execute import
async function executeImport(
  job: any
): Promise<{ processed: number; failed: number }> {
  const integration = job.integration
  let processed = 0
  let failed = 0

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(integration.headers ? JSON.parse(integration.headers) : {})
    }

    if (integration.apiKey) {
      headers['Authorization'] = `Bearer ${integration.apiKey}`
    }

    const response = await fetch(`${integration.endpoint}/${job.entityType.toLowerCase()}`, {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      throw new Error(`Import failed: ${response.status}`)
    }

    const data = await response.json()

    // Process imported data based on entity type
    for (const item of Array.isArray(data) ? data : [data]) {
      try {
        await processImportedItem(job.entityType, item)
        processed++
      } catch (error) {
        console.error('Failed to import item:', error)
        failed++
      }
    }
  } catch (error) {
    console.error('Import error:', error)
    throw error
  }

  return { processed, failed }
}

// Process imported item
async function processImportedItem(entityType: string, item: any): Promise<void> {
  switch (entityType) {
    case 'InventoryItem':
      await prisma.inventoryItem.upsert({
        where: { externalId: item.id },
        create: {
          name: item.name,
          serialNumber: item.serialNumber,
          externalId: item.id,
          // ... map other fields
        },
        update: {
          name: item.name,
          serialNumber: item.serialNumber
        }
      })
      break

    case 'User':
      await prisma.user.upsert({
        where: { email: item.email },
        create: {
          email: item.email,
          name: item.name,
          // ... map other fields
        },
        update: {
          name: item.name
        }
      })
      break

    // Add more entity types as needed
  }
}

// Execute export
async function executeExport(
  job: any
): Promise<{ processed: number; failed: number }> {
  const integration = job.integration
  let processed = 0
  let failed = 0

  try {
    // Get local data to export
    const localData = await getLocalDataForExport(job.entityType)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(integration.headers ? JSON.parse(integration.headers) : {})
    }

    if (integration.apiKey) {
      headers['Authorization'] = `Bearer ${integration.apiKey}`
    }

    for (const item of localData) {
      try {
        const response = await fetch(`${integration.endpoint}/${job.entityType.toLowerCase()}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(item)
        })

        if (response.ok) {
          processed++
        } else {
          failed++
        }
      } catch (error) {
        failed++
      }
    }
  } catch (error) {
    console.error('Export error:', error)
    throw error
  }

  return { processed, failed }
}

// Get local data for export
async function getLocalDataForExport(entityType: string): Promise<any[]> {
  switch (entityType) {
    case 'InventoryItem':
      return prisma.inventoryItem.findMany({
        where: { syncStatus: 'PENDING' },
        take: 100
      })

    case 'User':
      return prisma.user.findMany({
        where: { syncStatus: 'PENDING' },
        take: 100
      })

    default:
      return []
  }
}

// Get sync job status
export async function getSyncJobStatus(jobId: number): Promise<SyncJob | null> {
  const job = await prisma.syncJob.findUnique({
    where: { id: jobId }
  })

  if (!job) return null

  return {
    id: job.id.toString(),
    integrationId: job.integrationId.toString(),
    direction: job.direction as 'IMPORT' | 'EXPORT' | 'BIDIRECTIONAL',
    entityType: job.entityType,
    status: job.status as SyncStatus,
    startedAt: job.startedAt,
    completedAt: job.completedAt || undefined,
    recordsProcessed: job.recordsProcessed,
    recordsFailed: job.recordsFailed,
    error: job.error || undefined
  }
}

// Get integration logs
export async function getIntegrationLogs(
  integrationId: number,
  limit: number = 50
): Promise<Array<{
  id: number
  action: string
  status: string
  recordsProcessed: number
  createdAt: Date
  error?: string
}>> {
  const jobs = await prisma.syncJob.findMany({
    where: { integrationId },
    orderBy: { createdAt: 'desc' },
    take: limit
  })

  return jobs.map(job => ({
    id: job.id,
    action: `${job.direction} ${job.entityType}`,
    status: job.status,
    recordsProcessed: job.recordsProcessed,
    createdAt: job.createdAt,
    error: job.error || undefined
  }))
}

// Webhook handling
export async function handleWebhook(
  integrationId: number,
  payload: any,
  signature?: string
): Promise<{ success: boolean; message: string }> {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId }
  })

  if (!integration) {
    return { success: false, message: 'Integration not found' }
  }

  // Verify webhook signature if secret exists
  if (integration.secret && signature) {
    const crypto = await import('crypto')
    const expectedSignature = crypto
      .createHmac('sha256', integration.secret)
      .update(JSON.stringify(payload))
      .digest('hex')

    if (signature !== expectedSignature) {
      return { success: false, message: 'Invalid signature' }
    }
  }

  // Process webhook payload
  try {
    await processWebhookPayload(integration, payload)

    // Log webhook
    await prisma.webhookLog.create({
      data: {
        integrationId,
        payload: JSON.stringify(payload),
        status: 'PROCESSED'
      }
    })

    return { success: true, message: 'Webhook processed' }
  } catch (error) {
    await prisma.webhookLog.create({
      data: {
        integrationId,
        payload: JSON.stringify(payload),
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    return { success: false, message: 'Webhook processing failed' }
  }
}

// Process webhook payload
async function processWebhookPayload(
  integration: any,
  payload: any
): Promise<void> {
  // Handle different webhook event types
  const eventType = payload.event || payload.type

  switch (eventType) {
    case 'item.created':
    case 'item.updated':
      await processImportedItem('InventoryItem', payload.data)
      break

    case 'user.created':
    case 'user.updated':
      await processImportedItem('User', payload.data)
      break

    // Add more event types as needed
  }
}

// Get all integrations
export async function getIntegrations(): Promise<IntegrationConfig[]> {
  const integrations = await prisma.integration.findMany({
    orderBy: { name: 'asc' }
  })

  return integrations.map(i => ({
    id: i.id.toString(),
    name: i.name,
    type: i.type as IntegrationType,
    endpoint: i.endpoint,
    syncInterval: i.syncInterval || undefined,
    enabled: i.enabled
  }))
}
```

---

## Integration Dashboard Component

```typescript
// components/integration/integration-dashboard.tsx
'use client'

import { useI18n } from '@/hooks/use-i18n'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  RefreshCw,
  Plus,
  Plug,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'
import { getIntegrations, testIntegration, triggerSync, getIntegrationLogs } from '@/lib/integration/service'
import { formatDistanceToNow } from 'date-fns'
import { th, enUS } from 'date-fns/locale'

interface IntegrationDashboardProps {
  onAddIntegration?: () => void
}

export function IntegrationDashboard({ onAddIntegration }: IntegrationDashboardProps) {
  const { locale } = useI18n()
  const queryClient = useQueryClient()
  const dateLocale = locale === 'th' ? th : enUS

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: getIntegrations
  })

  const testMutation = useMutation({
    mutationFn: testIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
    }
  })

  const syncMutation = useMutation({
    mutationFn: ({ id, direction, entityType }: { id: number; direction: any; entityType: string }) =>
      triggerSync(id, direction, entityType, 1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] })
    }
  })

  const typeLabels: Record<string, { en: string; th: string }> = {
    HR_SYSTEM: { en: 'HR System', th: 'ระบบ HR' },
    ACCOUNTING: { en: 'Accounting', th: 'ระบบบัญชี' },
    ERP: { en: 'ERP', th: 'ERP' },
    NOTIFICATION: { en: 'Notification', th: 'ระบบแจ้งเตือน' },
    STORAGE: { en: 'Storage', th: 'พื้นที่จัดเก็บ' },
    CUSTOM: { en: 'Custom', th: 'กำหนดเอง' }
  }

  const statusColors: Record<string, string> = {
    CONNECTED: 'bg-green-500',
    DISCONNECTED: 'bg-gray-500',
    ERROR: 'bg-red-500',
    PENDING: 'bg-yellow-500'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Plug className="h-6 w-6" />
            {locale === 'th' ? 'ศูนย์รวมระบบ' : 'Integration Hub'}
          </h1>
          <p className="text-muted-foreground">
            {locale === 'th'
              ? 'จัดการการเชื่อมต่อกับระบบภายนอก'
              : 'Manage connections to external systems'}
          </p>
        </div>
        <Button onClick={onAddIntegration}>
          <Plus className="h-4 w-4 mr-2" />
          {locale === 'th' ? 'เพิ่มการเชื่อมต่อ' : 'Add Integration'}
        </Button>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations?.map((integration) => (
          <Card key={integration.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{integration.name}</CardTitle>
                <Switch checked={integration.enabled} />
              </div>
              <CardDescription>
                {typeLabels[integration.type]
                  ? locale === 'th'
                    ? typeLabels[integration.type].th
                    : typeLabels[integration.type].en
                  : integration.type}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {integration.endpoint}
                  </span>
                </div>

                {integration.syncInterval && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {locale === 'th'
                        ? `ซิงค์ทุก ${integration.syncInterval} นาที`
                        : `Sync every ${integration.syncInterval} min`}
                    </span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testMutation.mutate(parseInt(integration.id))}
                    disabled={testMutation.isPending}
                  >
                    {testMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {locale === 'th' ? 'ทดสอบ' : 'Test'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      syncMutation.mutate({
                        id: parseInt(integration.id),
                        direction: 'BIDIRECTIONAL',
                        entityType: 'InventoryItem'
                      })
                    }
                    disabled={syncMutation.isPending}
                  >
                    {locale === 'th' ? 'ซิงค์' : 'Sync'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Sync Logs */}
      <Card>
        <CardHeader>
          <CardTitle>
            {locale === 'th' ? 'ประวัติการซิงค์' : 'Sync History'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SyncLogsList />
        </CardContent>
      </Card>
    </div>
  )
}

// Sync Logs List Component
function SyncLogsList() {
  const { locale } = useI18n()

  const { data: logs, isLoading } = useQuery({
    queryKey: ['sync-logs'],
    queryFn: () => getIntegrationLogs(1, 10) // Get logs for first integration
  })

  const statusIcons = {
    COMPLETED: <CheckCircle className="h-4 w-4 text-green-500" />,
    FAILED: <XCircle className="h-4 w-4 text-red-500" />,
    RUNNING: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
    PENDING: <Clock className="h-4 w-4 text-yellow-500" />
  }

  if (isLoading) {
    return <div className="py-4 text-center text-muted-foreground">Loading...</div>
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        {locale === 'th' ? 'ไม่มีประวัติการซิงค์' : 'No sync history'}
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{locale === 'th' ? 'การดำเนินการ' : 'Action'}</TableHead>
          <TableHead>{locale === 'th' ? 'สถานะ' : 'Status'}</TableHead>
          <TableHead>{locale === 'th' ? 'รายการ' : 'Records'}</TableHead>
          <TableHead>{locale === 'th' ? 'เวลา' : 'Time'}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell>{log.action}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {statusIcons[log.status as keyof typeof statusIcons]}
                <span>{log.status}</span>
              </div>
            </TableCell>
            <TableCell>{log.recordsProcessed}</TableCell>
            <TableCell className="text-muted-foreground">
              {formatDistanceToNow(new Date(log.createdAt), {
                addSuffix: true,
                locale: locale === 'th' ? th : enUS
              })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

---

## Prisma Schema

```prisma
// Integration
model Integration {
  id              Int       @id @default(autoincrement())
  name            String
  type            String
  endpoint        String
  apiKey          String?
  secret          String?
  headers         String?   // JSON
  syncInterval    Int?      // minutes
  enabled         Boolean   @default(true)
  status          String    @default("DISCONNECTED")
  lastConnectedAt DateTime?
  lastSyncAt      DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  syncJobs        SyncJob[]
  webhookLogs     WebhookLog[]

  @@index([type])
  @@index([enabled])
}

// Sync Job
model SyncJob {
  id                Int       @id @default(autoincrement())
  integrationId     Int
  direction         String    // IMPORT, EXPORT, BIDIRECTIONAL
  entityType        String
  status            String    @default("PENDING")
  startedAt         DateTime?
  completedAt       DateTime?
  recordsProcessed  Int       @default(0)
  recordsFailed     Int       @default(0)
  error             String?
  createdAt         DateTime  @default(now())

  integration       Integration @relation(fields: [integrationId], references: [id], onDelete: Cascade)

  @@index([integrationId])
  @@index([status])
  @@index([createdAt])
}

// Webhook Log
model WebhookLog {
  id            Int      @id @default(autoincrement())
  integrationId Int
  payload       String   // JSON
  status        String   // PROCESSED, FAILED
  error         String?
  createdAt     DateTime @default(now())

  integration   Integration @relation(fields: [integrationId], references: [id], onDelete: Cascade)

  @@index([integrationId])
  @@index([createdAt])
}

// Add to existing models
model InventoryItem {
  // ... existing fields
  externalId  String?   @unique
  syncStatus  String?   @default("SYNCED")
}

model User {
  // ... existing fields
  externalId  String?   @unique
  syncStatus  String?   @default("SYNCED")
}
```

---

## Usage Examples

```tsx
// Example 1: Register new integration
import { registerIntegration, triggerSync } from '@/lib/integration/service'

async function setupHRIntegration(userId: number) {
  const integration = await registerIntegration({
    name: 'HR System',
    type: 'HR_SYSTEM',
    endpoint: 'https://hr.company.com/api',
    apiKey: 'your-api-key',
    syncInterval: 60,
    enabled: true
  }, userId)

  // Trigger initial sync
  await triggerSync(
    parseInt(integration.id),
    'IMPORT',
    'User',
    userId
  )
}

// Example 2: Handle webhook endpoint
// app/api/webhooks/[integrationId]/route.ts
import { handleWebhook } from '@/lib/integration/service'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { integrationId: string } }
) {
  const payload = await request.json()
  const signature = request.headers.get('x-webhook-signature')

  const result = await handleWebhook(
    parseInt(params.integrationId),
    payload,
    signature || undefined
  )

  return NextResponse.json(result)
}

// Example 3: Display integration dashboard
import { IntegrationDashboard } from '@/components/integration/integration-dashboard'

export default function IntegrationsPage() {
  return (
    <div className="container mx-auto py-6">
      <IntegrationDashboard
        onAddIntegration={() => {
          // Open add integration dialog
        }}
      />
    </div>
  )
}

// Example 4: Scheduled sync job
// lib/cron/sync-integrations.ts
import { getIntegrations, triggerSync } from '@/lib/integration/service'

export async function runScheduledSyncs() {
  const integrations = await getIntegrations()

  for (const integration of integrations) {
    if (integration.enabled && integration.syncInterval) {
      await triggerSync(
        parseInt(integration.id),
        'BIDIRECTIONAL',
        'InventoryItem',
        1 // System user
      )
    }
  }
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
