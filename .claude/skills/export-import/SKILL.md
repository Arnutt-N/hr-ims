---
name: export-import
description: Generic data export and import utilities for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["export", "import", " "data export", "data import", "backup", "restore"]
  file_patterns: ["*export*", "*import*", "lib/data-transfer*"]
  context: data export, data import, backup, restore, migration
mcp_servers:
  - sequential
personas:
  - backend
  - frontend
---

# Export/Import

## Core Role

Handle data export and import for HR-IMS:
- Full database backup
- Selective data export
- Data import with validation
- Migration support

---

## Export Service

```typescript
// lib/data-transfer/export.ts
import prisma from '@/lib/prisma'
import { writeFileSync } from 'fs'
import { join } from 'path'

interface ExportOptions {
  tables?: string[]
  format: 'json' | 'sql'
  includeAuditLogs?: boolean
  includeDeleted?: boolean
}

interface ExportResult {
  success: boolean
  filename: string
  recordCount: number
  size: number
  error?: string
}

export async function exportData(options: ExportOptions): Promise<ExportResult> {
  const { tables, format, includeAuditLogs = false, includeDeleted = false } = options

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `hr-ims-export-${timestamp}.${format}`
    const exportDir = join(process.cwd(), 'exports')

    let recordCount = 0
    let content: string

    if (format === 'json') {
      const data: Record<string, any[]> = {}

      // Export users
      if (!tables || tables.includes('users')) {
        data.users = await prisma.user.findMany({
          select: {
            id: true,
            email: true,
            name: true,
            department: true,
            position: true,
            phone: true,
            status: true,
            createdAt: true,
            updatedAt: true
          }
        })
        recordCount += data.users.length
      }

      // Export roles
      if (!tables || tables.includes('roles')) {
        data.roles = await prisma.role.findMany()
        recordCount += data.roles.length
      }

      // Export categories
      if (!tables || tables.includes('categories')) {
        data.categories = await prisma.category.findMany()
        recordCount += data.categories.length
      }

      // Export warehouses
      if (!tables || tables.includes('warehouses')) {
        data.warehouses = await prisma.warehouse.findMany()
        recordCount += data.warehouses.length
      }

      // Export inventory items
      if (!tables || tables.includes('items')) {
        data.items = await prisma.inventoryItem.findMany({
          include: {
            stockLevels: true
          }
        })
        recordCount += data.items.length
      }

      // Export requests
      if (!tables || tables.includes('requests')) {
        data.requests = await prisma.request.findMany({
          include: {
            items: true
          }
        })
        recordCount += data.requests.length
      }

      // Export audit logs if requested
      if (includeAuditLogs && (!tables || tables.includes('auditLogs'))) {
        data.auditLogs = await prisma.auditLog.findMany({
          take: 10000 // Limit to prevent huge exports
        })
        recordCount += data.auditLogs.length
      }

      content = JSON.stringify(data, null, 2)
    } else {
      // SQL format
      content = await generateSQLExport(tables, includeAuditLogs)
      recordCount = content.split('\n').filter(l => l.startsWith('INSERT')).length
    }

    writeFileSync(join(exportDir, filename), content, 'utf-8')

    return {
      success: true,
      filename,
      recordCount,
      size: Buffer.byteLength(content, 'utf8')
    }
  } catch (error) {
    return {
      success: false,
      filename: '',
      recordCount: 0,
      size: 0,
      error: error instanceof Error ? error.message : 'Export failed'
    }
  }
}

async function generateSQLExport(
  tables?: string[],
  includeAuditLogs?: boolean
): Promise<string> {
  const lines: string[] = []
  lines.push('-- HR-IMS Data Export')
  lines.push(`-- Generated: ${new Date().toISOString()}`)
  lines.push('')

  // Users
  if (!tables || tables.includes('users')) {
    const users = await prisma.user.findMany()
    users.forEach(user => {
      lines.push(`INSERT INTO users (id, email, name, department, position, phone, status) VALUES (${user.id}, '${user.email}', '${user.name}', ${user.department ? `'${user.department}'` : 'NULL'}, ${user.position ? `'${user.position}'` : 'NULL'}, ${user.phone ? `'${user.phone}'` : 'NULL'}, '${user.status}');`)
    })
    lines.push('')
  }

  // Add more tables as needed...

  return lines.join('\n')
}
```

---

## Import Service

```typescript
// lib/data-transfer/import.ts
import prisma from '@/lib/prisma'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { hash } from 'bcrypt'
import { z } from 'zod'

interface ImportOptions {
  filename: string
  mode: 'merge' | 'replace' | 'validate-only'
  skipDuplicates?: boolean
}

interface ImportResult {
  success: boolean
  imported: Record<string, number>
  skipped: Record<string, number>
  errors: Array<{ table: string; row: number; error: string }>
}

const importSchemas = {
  user: z.object({
    email: z.string().email(),
    name: z.string().min(2),
    department: z.string().optional(),
    position: z.string().optional(),
    phone: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE')
  }),
  role: z.object({
    name: z.string(),
    slug: z.string(),
    description: z.string().optional()
  }),
  category: z.object({
    name: z.string(),
    description: z.string().optional(),
    parentId: z.number().optional()
  }),
  warehouse: z.object({
    name: z.string(),
    code: z.string(),
    location: z.string().optional()
  }),
  item: z.object({
    code: z.string().optional(),
    name: z.string(),
    unit: z.string(),
    minStock: z.number().default(0),
    maxStock: z.number().optional(),
    price: z.number().optional(),
    status: z.string().default('AVAILABLE')
  })
}

export async function importData(options: ImportOptions): Promise<ImportResult> {
  const { filename, mode, skipDuplicates = true } = options

  const result: ImportResult = {
    success: true,
    imported: {},
    skipped: {},
    errors: []
  }

  try {
    const filePath = join(process.cwd(), 'imports', filename)

    if (!existsSync(filePath)) {
      return { ...result, success: false, errors: [{ table: 'file', row: 0, error: 'File not found' }] }
    }

    const content = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content)

    // Process in transaction
    await prisma.$transaction(async (tx) => {
      // Import users
      if (data.users) {
        result.imported.users = 0
        result.skipped.users = 0

        for (let i = 0; i < data.users.length; i++) {
        const userData = data.users[i]

        try {
          const validated = importSchemas.user.parse(userData)

          // Check if exists
          const existing = await tx.user.findUnique({
            where: { email: validated.email }
          })

          if (existing) {
            if (skipDuplicates) {
              result.skipped.users!++
              continue
            }

            if (mode === 'replace') {
              await tx.user.update({
                where: { email: validated.email },
                data: validated
              })
              result.imported.users!++
            } else if (mode === 'merge') {
              result.skipped.users!++
            }
 else {
            // Create new user
            await tx.user.create({
              data: {
                ...validated,
                password: await hash('tempPassword123', 10)
              }
            })
            result.imported.users!++
          }
        } catch (error) {
          result.errors.push({
            table: 'users',
            row: i + 1,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
        }
      }

      // Import categories
      if (data.categories) {
        result.imported.categories = 0
        result.skipped.categories = 0

        for (let i = 0; i < data.categories.length; i++) {
        const categoryData = data.categories[i]

        try {
          const validated = importSchemas.category.parse(categoryData)

          const existing = await tx.category.findFirst({
            where: { name: validated.name }
          })

          if (existing) {
            if (skipDuplicates) {
              result.skipped.categories!++
              continue
            }
          await tx.category.create({ data: validated })
          result.imported.categories!++
        } catch (error) {
          result.errors.push({
            table: 'categories',
            row: i + 1,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      // Import warehouses
      if (data.warehouses) {
        result.imported.warehouses = 0
        result.skipped.warehouses = 0

        for (let i = 0; i < data.warehouses.length; i++) {
        const warehouseData = data.warehouses[i]

        try {
          const validated = importSchemas.warehouse.parse(warehouseData)
          const existing = await tx.warehouse.findFirst({
            where: { code: validated.code }
          })

          if (existing) {
            if (skipDuplicates) {
              result.skipped.warehouses!++
            continue
            }
          await tx.warehouse.create({ data: validated })
          result.imported.warehouses!++
        } catch (error) {
          result.errors.push({
            table: 'warehouses',
            row: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      // Import items (more complex - need category and warehouse mapping)
      if (data.items) {
        result.imported.items = 0
        result.skipped.items = 0

        for (let i = 0; i < data.items.length; i++) {
        const itemData = data.items[i]

        try {
          const validated = importSchemas.item.parse(itemData)
          // Map category name to ID if provided
          let categoryId: number | undefined
          if (itemData.categoryName) {
            const category = await tx.category.findFirst({
              where: { name: itemData.categoryName }
            })
            categoryId = category?.id
          }
          // Create item
          await tx.inventoryItem.create({
            data: {
              ...validated,
              categoryId
            }
          })
          result.imported.items!++

          // Create stock levels if provided
          if (itemData.stockLevels) {
            for (const stock of itemData.stockLevels) {
              const warehouse = await tx.warehouse.findFirst({
                where: { name: stock.warehouseName }
              })
              if (warehouse) {
                await tx.stockLevel.create({
              data: {
                itemId: validated.id,
                warehouseId: warehouse.id,
                quantity: stock.quantity || 0
              }
              })
            }
          }
        } catch (error) {
          result.errors.push({
            table: 'items',
            row: i + 1,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    })

    if (result.errors.length > 0) {
      result.success = false
    }

    return result
  } catch (error) {
    return {
      success: false,
      imported: {},
      skipped: {},
      errors: [{ table: 'general', row: 0, error: error instanceof Error ? error.message : 'Unknown error' }]
 }
  }
}
```

---

## Export/Import Dialog Component

```typescript
// components/admin/export-import-dialog.tsx
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Download, Upload, AlertCircle, CheckCircle } from 'lucide-react'

interface ExportImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

 export function ExportImportDialog({ open, onOpenChange }: ExportImportDialogProps) {
  const [mode, setMode] = useState<'export' | 'import'>('export')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success?: boolean
    message?: string
    data?: any
  } | null>(null)

  const handleExport = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
          format: 'json',
          includeAuditLogs: false
        })
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        // Download file
        window.location.href = `/api/admin/download/${data.filename}`
      }
    } catch (error) {
      setResult({ success: false, message: 'Export failed' })
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async (file: File) => {
    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/import', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ success: false, message: 'Import failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ส่งออก/นำเข้าข้อมูล / Export/Import Data</DialogTitle>
          <DialogDescription>
            ส่งออกหรือนำเข้าข้อมูลระบบ HR-IMS
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Selection */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'export' ? 'default' : 'outline'}
              onClick={() => setMode('export')}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              ส่งออก / Export
            </Button>
            <Button
              variant={mode === 'import' ? 'default' : 'outline'}
              onClick={() => setMode('import')}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              นำเข้า / Import
            </Button>
          </div>

          {/* Export Options */}
          {mode === 'export' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">รูปแบบ / Format</label>
                <select className="w-full border rounded p-2 mt-1">
                  <option value="json">JSON</option>
                  <option value="sql">SQL</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="auditLogs" />
                <label htmlFor="auditLogs" className="text-sm">
                  รวม Audit Logs
                </label>
              </div>
            </div>
          )}

          {/* Import Options */}
          {mode === 'import' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">เลือกไฟล์ / Select File</label>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImport(file)
                  }}
                  className="w-full border rounded p-2 mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">โหมด / Mode</label>
                <select className="w-full border rounded p-2 mt-1">
                  <option value="merge">ผสาน / Merge</option>
                  <option value="replace">แทนที่ / Replace</option>
                </select>
              </div>
            </div>
          )}

          {/* Progress */}
          {loading && (
            <div className="space-y-2">
              <Progress value={50} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">
                กำลังดำเนินการ...
              </p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={result.success ? 'text-green-800' : 'text-red-800'}>
                  {result.message || (result.success ? 'สำเร็จ / Success' : 'ล้มเหลว / Failed')}
                </span>
              </div>
              {result.data && (
                <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ปิด / Close
          </Button>
          {mode === 'export' && !loading && (
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              ดาวน์โหลด / Download
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## API Routes

```typescript
// app/api/admin/export/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { exportData } from '@/lib/data-transfer/export'
import { auth } from '@/auth'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const result = await exportData(body)

  return NextResponse.json(result)
}

// app/api/admin/import/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { importData } from '@/lib/data-transfer/import'
import { auth } from '@/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File
  const mode = (formData.get('mode') as string) || 'merge'

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Save uploaded file temporarily
  const importDir = join(process.cwd(), 'imports')
  if (!existsSync(importDir)) {
    await mkdir(importDir, { recursive: true })
  }

  const filename = `import-${Date.now()}.json`
  const filepath = join(importDir, filename)
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filepath, buffer)

  // Process import
  const result = await importData({ filename, mode: mode as any })

  return NextResponse.json(result)
}
```

---

## Usage Examples

```typescript
// Example 1: Export all data
const result = await exportData({
  format: 'json',
  includeAuditLogs: false
})

// Example 2: Export specific tables
const result = await exportData({
  tables: ['users', 'categories', 'warehouses'],
  format: 'json'
})

// Example 3: Import with merge mode
const result = await importData({
  filename: 'backup-2024-01-15.json',
  mode: 'merge',
  skipDuplicates: true
})

// Example 4: Import with replace mode
const result = await importData({
  filename: 'backup-2024-01-15.json',
  mode: 'replace'
})
```

---

*Version: 1.0.0 | For HR-IMS Project*
