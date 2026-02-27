---
name: backup-manager
description: Database backup and restore utilities for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["backup", "restore", "database backup", "data backup", "disaster recovery"]
  file_patterns: ["*backup*", "*restore*", "lib/backup*"]
  context: database backup, data restore, disaster recovery, data safety
mcp_servers:
  - sequential
personas:
  - backend
  - devops
---

# Backup Manager

## Core Role

Manage database backups for HR-IMS:
- Automated backups
- Manual backups
- Restore operations
- Backup rotation

---

## Backup Service

```typescript
// lib/backup/backup-service.ts
import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, createReadStream } from 'fs'
import { join } from 'path'
import { createGzip, createGunzip } from 'zlib'
import { pipeline } from 'stream/promises'
import { createReadStream as fsCreateReadStream, createWriteStream } from 'fs'

const execAsync = promisify(exec)

export interface BackupOptions {
  name?: string
  description?: string
  includeAuditLogs?: boolean
  compress?: boolean
}

export interface BackupInfo {
  id: string
  filename: string
  size: number
  createdAt: Date
  description?: string
  type: 'manual' | 'scheduled'
  compressed: boolean
}

export interface RestoreOptions {
  backupId: string
  overwriteExisting?: boolean
  dryRun?: boolean
}

// Backup directory
function getBackupDir(): string {
  const backupDir = join(process.cwd(), 'backups')
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true })
  }
  return backupDir
}

// Create database backup
export async function createBackup(options: BackupOptions = {}): Promise<BackupInfo> {
  const {
    name,
    description,
    includeAuditLogs = true,
    compress = true
  } = options

  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '')
  const backupId = name || `backup-${timestamp}`
  const backupDir = getBackupDir()
  const filename = `${backupId}.sql${compress ? '.gz' : ''}`
  const filepath = join(backupDir, filename)

  try {
    // Get database path from environment
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/dev.db'

    if (!existsSync(dbPath)) {
      throw new Error(`Database file not found: ${dbPath}`)
    }

    // Create SQL dump using sqlite3
    const sqlDump = await execAsync(`sqlite3 "${dbPath}" .dump`)

    // Filter out audit logs if not included
    let dumpContent = sqlDump.stdout
    if (!includeAuditLogs) {
      const lines = dumpContent.split('\n')
      dumpContent = lines.filter(line =>
        !line.includes('AuditLog') &&
        !line.includes('INSERT INTO "AuditLog"')
      ).join('\n')
    }

    // Write backup
    if (compress) {
      await pipeline(
        require('stream').Readable.from(dumpContent),
        createGzip(),
        createWriteStream(filepath)
      )
    } else {
      require('fs').writeFileSync(filepath, dumpContent, 'utf-8')
    }

    const stats = statSync(filepath)

    return {
      id: backupId,
      filename,
      size: stats.size,
      createdAt: new Date(),
      description,
      type: 'manual',
      compressed: compress
    }
  } catch (error) {
    throw new Error(`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// List all backups
export async function listBackups(): Promise<BackupInfo[]> {
  const backupDir = getBackupDir()
  const files = readdirSync(backupDir)
    .filter(f => f.endsWith('.sql') || f.endsWith('.sql.gz'))
    .sort((a, b) => {
      const statA = statSync(join(backupDir, a))
      const statB = statSync(join(backupDir, b))
      return statB.mtimeMs - statA.mtimeMs
    })

  return files.map(filename => {
    const filepath = join(backupDir, filename)
    const stats = statSync(filepath)

    return {
      id: filename.replace(/\.(sql(\.gz)?)$/, ''),
      filename,
      size: stats.size,
      createdAt: stats.mtime,
      type: filename.includes('scheduled') ? 'scheduled' : 'manual',
      compressed: filename.endsWith('.gz')
    }
  })
}

// Get backup info
export async function getBackupInfo(backupId: string): Promise<BackupInfo | null> {
  const backups = await listBackups()
  return backups.find(b => b.id === backupId) || null
}

// Restore database from backup
export async function restoreBackup(options: RestoreOptions): Promise<{
  success: boolean
  message: string
  warnings?: string[]
}> {
  const { backupId, dryRun = false } = options
  const backupDir = getBackupDir()
  const backups = await listBackups()
  const backup = backups.find(b => b.id === backupId)

  if (!backup) {
    return {
      success: false,
      message: `ไม่พบ backup: ${backupId} / Backup not found: ${backupId}`
    }
  }

  const filepath = join(backupDir, backup.filename)

  if (!existsSync(filepath)) {
    return {
      success: false,
      message: `ไม่พบไฟล์ backup: ${backup.filename} / Backup file not found`
    }
  }

  if (dryRun) {
    return {
      success: true,
      message: `Dry run: จะกู้คืนจาก ${backup.filename} / Would restore from ${backup.filename}`
    }
  }

  try {
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/dev.db'

    // Create a backup of current database before restore
    const currentBackup = `${dbPath}.before-restore-${Date.now()}`
    if (existsSync(dbPath)) {
      require('fs').copyFileSync(dbPath, currentBackup)
    }

    // Read backup content
    let sqlContent: string

    if (backup.compressed) {
      // Decompress
      const chunks: Buffer[] = []
      await pipeline(
        createReadStream(filepath),
        createGunzip(),
        require('stream').Writable({
          write(chunk, encoding, callback) {
            chunks.push(chunk)
            callback()
          }
        })
      )
      sqlContent = Buffer.concat(chunks).toString('utf-8')
    } else {
      sqlContent = require('fs').readFileSync(filepath, 'utf-8')
    }

    // Create new database from dump
    // First, delete the old database
    if (existsSync(dbPath)) {
      unlinkSync(dbPath)
    }

    // Restore using sqlite3
    await execAsync(`sqlite3 "${dbPath}"`, { input: sqlContent })

    return {
      success: true,
      message: `กู้คืนข้อมูลสำเร็จจาก ${backup.filename} / Successfully restored from ${backup.filename}`
    }
  } catch (error) {
    return {
      success: false,
      message: `การกู้คืนล้มเหลว: ${error instanceof Error ? error.message : 'Unknown error'} / Restore failed`
    }
  }
}

// Delete backup
export async function deleteBackup(backupId: string): Promise<{
  success: boolean
  message: string
}> {
  const backupDir = getBackupDir()
  const backups = await listBackups()
  const backup = backups.find(b => b.id === backupId)

  if (!backup) {
    return {
      success: false,
      message: `ไม่พบ backup: ${backupId} / Backup not found`
    }
  }

  const filepath = join(backupDir, backup.filename)

  try {
    if (existsSync(filepath)) {
      unlinkSync(filepath)
    }

    return {
      success: true,
      message: `ลบ backup สำเร็จ / Backup deleted successfully`
    }
  } catch (error) {
    return {
      success: false,
      message: `ลบ backup ล้มเหลว: ${error instanceof Error ? error.message : 'Unknown error'} / Failed to delete backup`
    }
  }
}

// Rotate old backups (keep last N)
export async function rotateBackups(keepCount: number = 10): Promise<{
  deleted: string[]
  kept: string[]
}> {
  const backups = await listBackups()
  const toDelete = backups.slice(keepCount)
  const toKeep = backups.slice(0, keepCount)

  const deleted: string[] = []

  for (const backup of toDelete) {
    const result = await deleteBackup(backup.id)
    if (result.success) {
      deleted.push(backup.id)
    }
  }

  return {
    deleted,
    kept: toKeep.map(b => b.id)
  }
}

// Get backup download URL
export function getBackupDownloadUrl(backupId: string): string {
  return `/api/admin/backup/download/${backupId}`
}
```

---

## Scheduled Backup Job

```typescript
// lib/backup/scheduled-backup.ts
import { createBackup, rotateBackups, BackupInfo } from './backup-service'

export interface ScheduledBackupConfig {
  enabled: boolean
  schedule: 'hourly' | 'daily' | 'weekly'
  keepCount: number
  includeAuditLogs: boolean
  compress: boolean
}

// Default config
const defaultConfig: ScheduledBackupConfig = {
  enabled: true,
  schedule: 'daily',
  keepCount: 7, // Keep last 7 backups
  includeAuditLogs: false,
  compress: true
}

// Run scheduled backup
export async function runScheduledBackup(
  config: ScheduledBackupConfig = defaultConfig
): Promise<BackupInfo | null> {
  if (!config.enabled) {
    console.log('Scheduled backups are disabled')
    return null
  }

  try {
    const backup = await createBackup({
      name: `scheduled-${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}`,
      description: `Scheduled backup - ${config.schedule}`,
      includeAuditLogs: config.includeAuditLogs,
      compress: config.compress
    })

    // Rotate old backups
    const rotation = await rotateBackups(config.keepCount)
    console.log(`Backup rotation: deleted ${rotation.deleted.length}, kept ${rotation.kept.length}`)

    return backup
  } catch (error) {
    console.error('Scheduled backup failed:', error)
    throw error
  }
}

// Cron job handler
export async function handleBackupCron(): Promise<Response> {
  try {
    const backup = await runScheduledBackup()

    return Response.json({
      success: true,
      backup: backup ? {
        id: backup.id,
        size: backup.size,
        createdAt: backup.createdAt
      } : null
    })
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
```

---

## Backup API Routes

```typescript
// app/api/admin/backup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createBackup, listBackups, BackupOptions } from '@/lib/backup/backup-service'
import { auth } from '@/auth'

// List backups
export async function GET() {
  const session = await auth()
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const backups = await listBackups()
  return NextResponse.json({ backups })
}

// Create backup
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const options: BackupOptions = {
    name: body.name,
    description: body.description,
    includeAuditLogs: body.includeAuditLogs ?? true,
    compress: body.compress ?? true
  }

  try {
    const backup = await createBackup(options)
    return NextResponse.json({ success: true, backup })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Backup failed'
    }, { status: 500 })
  }
}

// app/api/admin/backup/restore/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { restoreBackup } from '@/lib/backup/backup-service'
import { auth } from '@/auth'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const result = await restoreBackup({
    backupId: body.backupId,
    dryRun: body.dryRun
  })

  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}

// app/api/admin/backup/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { deleteBackup, getBackupInfo } from '@/lib/backup/backup-service'
import { auth } from '@/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session || session.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await deleteBackup(params.id)
  return NextResponse.json(result)
}

// app/api/admin/backup/download/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getBackupInfo } from '@/lib/backup/backup-service'
import { createReadStream, existsSync } from 'fs'
import { join } from 'path'
import { auth } from '@/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const backup = await getBackupInfo(params.id)
  if (!backup) {
    return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
  }

  const backupDir = join(process.cwd(), 'backups')
  const filepath = join(backupDir, backup.filename)

  if (!existsSync(filepath)) {
    return NextResponse.json({ error: 'Backup file not found' }, { status: 404 })
  }

  const fileStream = createReadStream(filepath)

  return new NextResponse(fileStream as any, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${backup.filename}"`,
      'Content-Length': backup.size.toString()
    }
  })
}

// Cron endpoint for scheduled backups
// app/api/cron/backup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { runScheduledBackup } from '@/lib/backup/scheduled-backup'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const backup = await runScheduledBackup()
    return NextResponse.json({
      success: true,
      backup: backup ? {
        id: backup.id,
        size: backup.size,
        createdAt: backup.createdAt
      } : null
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
```

---

## Backup Manager Component

```typescript
// components/admin/backup-manager.tsx
'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Download,
  Trash2,
  RefreshCw,
  Plus,
  RotateCcw,
  AlertTriangle,
  HardDrive,
  CheckCircle
} from 'lucide-react'

interface Backup {
  id: string
  filename: string
  size: number
  createdAt: string
  description?: string
  type: 'manual' | 'scheduled'
  compressed: boolean
}

export function BackupManager() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Create backup dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newBackupName, setNewBackupName] = useState('')
  const [includeAuditLogs, setIncludeAuditLogs] = useState(false)

  // Restore confirmation dialog
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null)

  const fetchBackups = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/backup')
      const data = await response.json()
      setBackups(data.backups || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBackups()
  }, [])

  const createBackup = async () => {
    setCreating(true)
    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBackupName || undefined,
          description: 'Manual backup',
          includeAuditLogs,
          compress: true
        })
      })

      const data = await response.json()
      if (data.success) {
        fetchBackups()
        setShowCreateDialog(false)
        setNewBackupName('')
      } else {
        alert(data.error || 'Failed to create backup')
      }
    } finally {
      setCreating(false)
    }
  }

  const restoreBackup = async (backupId: string) => {
    setRestoring(backupId)
    try {
      const response = await fetch('/api/admin/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId })
      })

      const data = await response.json()
      if (data.success) {
        alert(data.message)
        window.location.reload() // Reload to ensure data consistency
      } else {
        alert(data.message || 'Restore failed')
      }
    } finally {
      setRestoring(null)
      setShowRestoreDialog(false)
    }
  }

  const deleteBackup = async (backupId: string) => {
    if (!confirm('ยืนยันการลบ backup? / Confirm delete backup?')) return

    setDeleting(backupId)
    try {
      const response = await fetch(`/api/admin/backup/${backupId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        fetchBackups()
      } else {
        alert(data.message || 'Delete failed')
      }
    } finally {
      setDeleting(null)
    }
  }

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  const totalSize = backups.reduce((sum, b) => sum + b.size, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <HardDrive className="h-8 w-8 text-primary" />
              <div>
                <h2 className="text-xl font-bold">จัดการ Backup / Backup Manager</h2>
                <p className="text-muted-foreground">
                  {backups.length} backups | รวม {formatSize(totalSize)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchBackups} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                รีเฟรช / Refresh
              </Button>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                สร้าง Backup / Create Backup
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup List */}
      <Card>
        <CardHeader>
          <CardTitle>รายการ Backup / Backup List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              กำลังโหลด... / Loading...
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ไม่มี backup / No backups available
            </div>
          ) : (
            <div className="divide-y">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="py-4 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{backup.id}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted">
                        {backup.type === 'scheduled' ? 'อัตโนมัติ' : 'ด้วยมือ'}
                      </span>
                      {backup.compressed && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                          บีบอัด
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(backup.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: th })}
                      {' • '}
                      {formatSize(backup.size)}
                    </p>
                    {backup.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {backup.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/api/admin/backup/download/${backup.id}`, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBackup(backup)
                        setShowRestoreDialog(true)
                      }}
                      disabled={!!restoring}
                    >
                      {restoring === backup.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteBackup(backup.id)}
                      disabled={!!deleting}
                    >
                      {deleting === backup.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Backup Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>สร้าง Backup ใหม่ / Create New Backup</DialogTitle>
            <DialogDescription>
              สร้างสำเนาข้อมูลฐานข้อมูลปัจจุบัน
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">ชื่อ Backup (ไม่บังคับ)</label>
              <Input
                value={newBackupName}
                onChange={(e) => setNewBackupName(e.target.value)}
                placeholder="backup-name"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="includeAuditLogs"
                checked={includeAuditLogs}
                onCheckedChange={(checked) => setIncludeAuditLogs(checked as boolean)}
              />
              <label htmlFor="includeAuditLogs" className="text-sm">
                รวม Audit Logs (ไฟล์จะใหญ่ขึ้น)
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              ยกเลิก / Cancel
            </Button>
            <Button onClick={createBackup} disabled={creating}>
              {creating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              สร้าง / Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              ยืนยันการกู้คืน / Confirm Restore
            </DialogTitle>
            <DialogDescription>
              การกู้คืนจะเขียนทับข้อมูลปัจจุบันทั้งหมด การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>

          {selectedBackup && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-medium">{selectedBackup.id}</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(selectedBackup.createdAt), 'dd/MM/yyyy HH:mm:ss')} • {formatSize(selectedBackup.size)}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              ยกเลิก / Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedBackup && restoreBackup(selectedBackup.id)}
              disabled={!!restoring}
            >
              {restoring ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              กู้คืน / Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

---

## Usage Examples

```typescript
// Example 1: Create manual backup
import { createBackup } from '@/lib/backup/backup-service'

const backup = await createBackup({
  name: 'before-migration',
  description: 'Backup before database migration',
  includeAuditLogs: false,
  compress: true
})
console.log(`Backup created: ${backup.id}, Size: ${backup.size} bytes`)

// Example 2: List and rotate backups
import { listBackups, rotateBackups } from '@/lib/backup/backup-service'

const backups = await listBackups()
console.log(`Found ${backups.length} backups`)

// Keep only last 7 backups
const result = await rotateBackups(7)
console.log(`Deleted: ${result.deleted.length}, Kept: ${result.kept.length}`)

// Example 3: Restore from backup
import { restoreBackup } from '@/lib/backup/backup-service'

// Dry run first
const dryRunResult = await restoreBackup({
  backupId: 'backup-20240115000000',
  dryRun: true
})

if (dryRunResult.success) {
  // Actual restore
  const result = await restoreBackup({
    backupId: 'backup-20240115000000'
  })
  console.log(result.message)
}

// Example 4: Scheduled backup (cron)
// Configure cron job to call: GET /api/cron/backup
// With header: Authorization: Bearer YOUR_CRON_SECRET
```

---

*Version: 1.0.0 | For HR-IMS Project*
