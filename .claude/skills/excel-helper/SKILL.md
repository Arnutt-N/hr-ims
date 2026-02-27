---
name: excel-helper
description: Excel file handling for import/export in HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["excel", "xlsx", "spreadsheet", "import excel", "export excel"]
  file_patterns: ["*excel*", "*xlsx*", "lib/excel/**"]
  context: Excel import/export, spreadsheet operations
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# Excel Helper

## Core Role

Handle Excel file operations for HR-IMS:
- Export data to Excel
- Import data from Excel
- Template generation
- Data validation during import

---

## Install Dependencies

```bash
npm install xlsx
npm install @types/xlsx -D
```

---

## Excel Export Utilities

```typescript
// lib/excel/export.ts
import * as XLSX from 'xlsx'

interface ExportOptions {
  filename: string
  sheetName?: string
  headerRow?: string[]
}

export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: Array<{ key: keyof T; header: string; width?: number }>,
  options: ExportOptions
): void {
  const { filename, sheetName = 'Sheet1' } = options

  // Transform data
  const rows = data.map(item => {
    const row: Record<string, any> = {}
    columns.forEach(col => {
      row[col.header] = item[col.key]
    })
    return row
  })

  // Create workbook
  const wb = XLSX.utils.book_new()

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(rows, { header: columns.map(c => c.header) })

  // Set column widths
  const colWidths = columns.map(c => ({ wch: c.width || 15 }))
  ws['!cols'] = colWidths

  // Add to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  // Download
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

// Multi-sheet export
export function exportMultiSheetExcel(
  sheets: Array<{
    name: string
    data: Record<string, any>[]
    columns: Array<{ key: string; header: string }>
  }>,
  filename: string
): void {
  const wb = XLSX.utils.book_new()

  sheets.forEach(sheet => {
    const rows = sheet.data.map(item => {
      const row: Record<string, any> = {}
      sheet.columns.forEach(col => {
        row[col.header] = item[col.key]
      })
      return row
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, sheet.name)
  })

  XLSX.writeFile(wb, `${filename}.xlsx`)
}
```

---

## Inventory Export

```typescript
// lib/excel/inventory-export.ts
import * as XLSX from 'xlsx'
import prisma from '@/lib/prisma'

interface InventoryExportRow {
  code: string
  name: string
  category: string
  quantity: number
  unit: string
  minStock: number
  maxStock: number
  status: string
  warehouse: string
  location: string
  price: number
  createdAt: Date
}

export async function exportInventoryToExcel(): Promise<void> {
  const items = await prisma.inventoryItem.findMany({
    include: {
      category: true,
      stockLevels: {
        include: { warehouse: true }
      }
    }
  })

  const data: InventoryExportRow[] = items.map(item => ({
    code: item.code || '',
    name: item.name,
    category: item.category?.name || '',
    quantity: item.stockLevels.reduce((sum, sl) => sum + sl.quantity, 0),
    unit: item.unit,
    minStock: item.minStock,
    maxStock: item.maxStock,
    status: item.status,
    warehouse: item.stockLevels.map(sl => sl.warehouse.name).join(', '),
    location: item.location || '',
    price: item.price?.toNumber() || 0,
    createdAt: item.createdAt
  }))

  const columns = [
    { key: 'code' as const, header: 'รหัส / Code', width: 15 },
    { key: 'name' as const, header: 'ชื่อ / Name', width: 30 },
    { key: 'category' as const, header: 'หมวดหมู่ / Category', width: 20 },
    { key: 'quantity' as const, header: 'จำนวน / Qty', width: 10 },
    { key: 'unit' as const, header: 'หน่วย / Unit', width: 10 },
    { key: 'minStock' as const, header: 'Min Stock', width: 10 },
    { key: 'maxStock' as const, header: 'Max Stock', width: 10 },
    { key: 'status' as const, header: 'สถานะ / Status', width: 15 },
    { key: 'warehouse' as const, header: 'คลัง / Warehouse', width: 20 },
    { key: 'location' as const, header: 'ตำแหน่ง / Location', width: 15 },
    { key: 'price' as const, header: 'ราคา / Price', width: 12 },
    { key: 'createdAt' as const, header: 'วันที่สร้าง / Created', width: 15 }
  ]

  exportToExcel(data, columns, {
    filename: `inventory-${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Inventory'
  })
}
```

---

## Excel Import Utilities

```typescript
// lib/excel/import.ts
import * as XLSX from 'xlsx'
import { z } from 'zod'

interface ImportResult<T> {
  success: boolean
  data: T[]
  errors: Array<{ row: number; field: string; message: string }>
  totalRows: number
  successCount: number
  errorCount: number
}

export function parseExcelFile<T>(
  file: File,
  schema: z.ZodSchema<T>,
  columnMapping: Record<string, keyof T>
): Promise<ImportResult<T>> {
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[]

        const results: T[] = []
        const errors: Array<{ row: number; field: string; message: string }> = []

        jsonData.forEach((row, index) => {
          const mappedData: Record<string, any> = {}

          // Map columns
          Object.entries(columnMapping).forEach(([excelCol, schemaKey]) => {
            mappedData[schemaKey] = row[excelCol]
          })

          // Validate
          const result = schema.safeParse(mappedData)

          if (result.success) {
            results.push(result.data)
          } else {
            result.error.errors.forEach(err => {
              errors.push({
                row: index + 2, // +2 for header and 0-indexing
                field: err.path.join('.'),
                message: err.message
              })
            })
          }
        })

        resolve({
          success: errors.length === 0,
          data: results,
          errors,
          totalRows: jsonData.length,
          successCount: results.length,
          errorCount: errors.length
        })
      } catch (error) {
        resolve({
          success: false,
          data: [],
          errors: [{ row: 0, field: 'file', message: 'Failed to parse Excel file' }],
          totalRows: 0,
          successCount: 0,
          errorCount: 1
        })
      }
    }

    reader.readAsArrayBuffer(file)
  })
}
```

---

## User Import from Excel

```typescript
// lib/excel/user-import.ts
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { hash } from 'bcrypt'
import { parseExcelFile } from './import'

const userImportSchema = z.object({
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
  name: z.string().min(2, 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร'),
  department: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
  roles: z.string().optional() // Comma-separated role slugs
})

type UserImportData = z.infer<typeof userImportSchema>

const columnMapping = {
  'อีเมล / Email': 'email',
  'ชื่อ / Name': 'name',
  'แผนก / Department': 'department',
  'ตำแหน่ง / Position': 'position',
  'โทรศัพท์ / Phone': 'phone',
  'บทบาท / Roles': 'roles'
}

export async function importUsersFromExcel(
  file: File
): Promise<ImportResult<UserImportData> & { importedIds?: number[] }> {
  const result = await parseExcelFile(file, userImportSchema, columnMapping)

  if (result.errorCount > 0) {
    return result
  }

  const importedIds: number[] = []

  // Import users
  for (const userData of result.data) {
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        password: await hash('defaultPassword123', 10),
        department: userData.department,
        position: userData.position,
        phone: userData.phone,
        emailVerified: new Date(),
        status: 'ACTIVE'
      }
    })

    // Assign roles
    if (userData.roles) {
      const roleSlugs = userData.roles.split(',').map(r => r.trim())
      const roles = await prisma.role.findMany({
        where: { slug: { in: roleSlugs } }
      })

      await prisma.userRole.createMany({
        data: roles.map(role => ({
          userId: user.id,
          roleId: role.id
        }))
      })
    }

    importedIds.push(user.id)
  }

  return { ...result, importedIds }
}
```

---

## Inventory Import from Excel

```typescript
// lib/excel/inventory-import.ts
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { parseExcelFile } from './import'

const inventoryImportSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, 'ต้องระบุชื่อสินค้า'),
  category: z.string().optional(),
  quantity: z.number().min(0).default(0),
  unit: z.string().default('ชิ้น'),
  minStock: z.number().min(0).default(0),
  maxStock: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
  warehouse: z.string().optional(),
  location: z.string().optional(),
  serialNumber: z.string().optional(),
  description: z.string().optional()
})

type InventoryImportData = z.infer<typeof inventoryImportSchema>

const columnMapping = {
  'รหัส / Code': 'code',
  'ชื่อ / Name': 'name',
  'หมวดหมู่ / Category': 'category',
  'จำนวน / Quantity': 'quantity',
  'หน่วย / Unit': 'unit',
  'Min Stock': 'minStock',
  'Max Stock': 'maxStock',
  'ราคา / Price': 'price',
  'คลัง / Warehouse': 'warehouse',
  'ตำแหน่ง / Location': 'location',
  'Serial Number': 'serialNumber',
  'รายละเอียด / Description': 'description'
}

export async function importInventoryFromExcel(
  file: File,
  warehouseId: number
): Promise<ImportResult<InventoryImportData>> {
  const result = await parseExcelFile(file, inventoryImportSchema, columnMapping)

  if (result.errorCount > 0) {
    return result
  }

  // Get or create default category
  let defaultCategory = await prisma.category.findFirst()
  if (!defaultCategory) {
    defaultCategory = await prisma.category.create({
      data: { name: 'ทั่วไป', description: 'Default category' }
    })
  }

  // Import items
  for (const itemData of result.data) {
    // Find or create category
    let category = defaultCategory
    if (itemData.category) {
      category = await prisma.category.upsert({
        where: { name: itemData.category },
        create: { name: itemData.category },
        update: {}
      })
    }

    // Create item
    const item = await prisma.inventoryItem.create({
      data: {
        code: itemData.code,
        name: itemData.name,
        categoryId: category.id,
        unit: itemData.unit,
        minStock: itemData.minStock,
        maxStock: itemData.maxStock,
        price: itemData.price,
        serialNumber: itemData.serialNumber,
        location: itemData.location,
        description: itemData.description,
        status: 'AVAILABLE'
      }
    })

    // Create stock level
    await prisma.stockLevel.create({
      data: {
        itemId: item.id,
        warehouseId,
        quantity: itemData.quantity
      }
    })
  }

  return result
}
```

---

## Excel Template Generator

```typescript
// lib/excel/templates.ts
import * as XLSX from 'xlsx'

export function generateUserImportTemplate(): void {
  const wb = XLSX.utils.book_new()

  // Template data with headers
  const templateData = [
    {
      'อีเมล / Email': 'example@moj.go.th',
      'ชื่อ / Name': 'ชื่อ นามสกุล',
      'แผนก / Department': 'แผนกตัวอย่าง',
      'ตำแหน่ง / Position': 'เจ้าหน้าที่',
      'โทรศัพท์ / Phone': '02-xxx-xxxx',
      'บทบาท / Roles': 'user,approver'
    }
  ]

  const ws = XLSX.utils.json_to_sheet(templateData)

  // Set column widths
  ws['!cols'] = [
    { wch: 25 }, // Email
    { wch: 20 }, // Name
    { wch: 20 }, // Department
    { wch: 15 }, // Position
    { wch: 15 }, // Phone
    { wch: 20 }  // Roles
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Users')
  XLSX.writeFile(wb, 'user-import-template.xlsx')
}

export function generateInventoryImportTemplate(): void {
  const wb = XLSX.utils.book_new()

  const templateData = [
    {
      'รหัส / Code': 'INV-001',
      'ชื่อ / Name': 'ชื่อสินค้า',
      'หมวดหมู่ / Category': 'หมวดหมู่',
      'จำนวน / Quantity': 10,
      'หน่วย / Unit': 'ชิ้น',
      'Min Stock': 5,
      'Max Stock': 100,
      'ราคา / Price': 100.00,
      'คลัง / Warehouse': 'คลังหลัก',
      'ตำแหน่ง / Location': 'A-01',
      'Serial Number': '',
      'รายละเอียด / Description': 'รายละเอียดสินค้า'
    }
  ]

  const ws = XLSX.utils.json_to_sheet(templateData)

  ws['!cols'] = [
    { wch: 12 }, // Code
    { wch: 30 }, // Name
    { wch: 15 }, // Category
    { wch: 10 }, // Quantity
    { wch: 10 }, // Unit
    { wch: 10 }, // Min Stock
    { wch: 10 }, // Max Stock
    { wch: 10 }, // Price
    { wch: 15 }, // Warehouse
    { wch: 12 }, // Location
    { wch: 15 }, // Serial
    { wch: 30 }  // Description
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Inventory')
  XLSX.writeFile(wb, 'inventory-import-template.xlsx')
}
```

---

## Excel Import Component

```typescript
// components/excel/excel-import-dialog.tsx
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, CheckCircle2, XCircle, Download } from 'lucide-react'

interface ImportResult {
  success: boolean
  totalRows: number
  successCount: number
  errorCount: number
  errors: Array<{ row: number; field: string; message: string }>
}

interface ExcelImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  onImport: (file: File) => Promise<ImportResult>
  onDownloadTemplate: () => void
}

export function ExcelImportDialog({
  open,
  onOpenChange,
  title,
  onImport,
  onDownloadTemplate
}: ExcelImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleImport = async () => {
    if (!file) return

    setLoading(true)
    try {
      const importResult = await onImport(file)
      setResult(importResult)
    } catch (error) {
      setResult({
        success: false,
        totalRows: 0,
        successCount: 0,
        errorCount: 1,
        errors: [{ row: 0, field: 'file', message: 'Import failed' }]
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setResult(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template download */}
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadTemplate}
          >
            <Download className="h-4 w-4 mr-2" />
            ดาวน์โหลด Template / Download Template
          </Button>

          {/* File input */}
          <div>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              รองรับไฟล์ .xlsx, .xls
            </p>
          </div>

          {/* Result */}
          {result && (
            <div className="space-y-2">
              {result.success ? (
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription>
                    นำเข้าสำเร็จ {result.successCount} รายการ
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      พบข้อผิดพลาด {result.errorCount} รายการ
                    </AlertDescription>
                  </Alert>

                  {/* Error list */}
                  {result.errors.length > 0 && (
                    <div className="max-h-40 overflow-auto border rounded p-2 text-sm">
                      {result.errors.slice(0, 10).map((error, i) => (
                        <div key={i} className="text-red-600">
                          แถว {error.row}: {error.field} - {error.message}
                        </div>
                      ))}
                      {result.errors.length > 10 && (
                        <div className="text-muted-foreground">
                          ... และอีก {result.errors.length - 10} ข้อผิดพลาด
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            ปิด / Close
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || loading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {loading ? 'กำลังนำเข้า...' : 'นำเข้า / Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Server Actions

```typescript
// lib/actions/excel.ts
'use server'

import { exportInventoryToExcel } from '@/lib/excel/inventory-export'
import { importUsersFromExcel, importInventoryFromExcel } from '@/lib/excel'
import { generateUserImportTemplate, generateInventoryImportTemplate } from '@/lib/excel/templates'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function exportInventoryAction() {
  const session = await auth()
  if (!session) return { error: 'Unauthorized' }

  try {
    await exportInventoryToExcel()
    return { success: true }
  } catch (error) {
    return { error: 'Export failed' }
  }
}

export async function importUsersAction(formData: FormData) {
  const session = await auth()
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return { error: 'Unauthorized' }
  }

  const file = formData.get('file') as File
  if (!file) return { error: 'No file provided' }

  const result = await importUsersFromExcel(file)
  revalidatePath('/users')

  return result
}

export async function importInventoryAction(formData: FormData) {
  const session = await auth()
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return { error: 'Unauthorized' }
  }

  const file = formData.get('file') as File
  const warehouseId = parseInt(formData.get('warehouseId') as string)

  if (!file) return { error: 'No file provided' }

  const result = await importInventoryFromExcel(file, warehouseId)
  revalidatePath('/inventory')

  return result
}

export async function downloadTemplateAction(type: 'user' | 'inventory') {
  if (type === 'user') {
    generateUserImportTemplate()
  } else {
    generateInventoryImportTemplate()
  }
  return { success: true }
}
```

---

## Usage Examples

```typescript
// Example 1: Export inventory to Excel
<Button onClick={exportInventoryAction}>
  <Download className="h-4 w-4 mr-2" />
  ส่งออก Excel / Export Excel
</Button>

// Example 2: Import users from Excel
<ExcelImportDialog
  open={importOpen}
  onOpenChange={setImportOpen}
  title="นำเข้าผู้ใช้ / Import Users"
  onImport={(file) => importUsersAction(new FormData().append('file', file))}
  onDownloadTemplate={() => downloadTemplateAction('user')}
/>

// Example 3: Multi-sheet export
<Button onClick={() => {
  exportMultiSheetExcel([
    { name: 'Inventory', data: items, columns: itemColumns },
    { name: 'Requests', data: requests, columns: requestColumns },
    { name: 'Users', data: users, columns: userColumns }
  ], 'hr-ims-full-export')
}}>
  ส่งออกทั้งหมด / Export All
</Button>
```

---

*Version: 1.0.0 | For HR-IMS Project*
