---
name: export-helper
description: Data export to CSV, Excel, and PDF formats with customizable templates
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["export", "download", "csv", "excel", "pdf", "report export"]
  file_patterns: ["*export*", "lib/export/**"]
  context: reporting, data export, documentation
mcp_servers:
  - sequential
personas:
  - backend
  - scribe
---

# Export Helper

## Core Role

Handle data export for HR-IMS:
- CSV export for spreadsheet compatibility
- Excel export with formatting
- PDF export for reports and printing
- Customizable export templates

---

## Export Formats

```yaml
csv:
  extension: .csv
  mime_type: text/csv
  use_case: Data import, spreadsheet editing

excel:
  extension: .xlsx
  mime_type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  use_case: Formatted reports, multi-sheet exports

pdf:
  extension: .pdf
  mime_type: application/pdf
  use_case: Printing, official reports, archival
```

---

## Server Actions

### CSV Export

```typescript
// lib/actions/export.ts
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'

interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf'
  entity: 'inventory' | 'users' | 'requests' | 'audit'
  filters?: Record<string, any>
  fields?: string[]
}

export async function exportData(options: ExportOptions) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const hasPermission = await hasAnyRole(
    parseInt(session.user.id),
    ['admin', 'superadmin', 'auditor']
  )
  if (!hasPermission) {
    return { error: 'Forbidden', code: 'FORBIDDEN' }
  }

  let data: any[]
  let headers: string[]

  // Fetch data based on entity
  switch (options.entity) {
    case 'inventory':
      data = await fetchInventoryData(options.filters)
      headers = ['ID', 'Name', 'Serial Number', 'Category', 'Quantity', 'Status', 'Warehouse']
      break
    case 'users':
      data = await fetchUsersData(options.filters)
      headers = ['ID', 'Name', 'Email', 'Department', 'Position', 'Roles', 'Status']
      break
    case 'requests':
      data = await fetchRequestsData(options.filters)
      headers = ['ID', 'Type', 'Requester', 'Status', 'Created', 'Approved By', 'Items']
      break
    case 'audit':
      data = await fetchAuditData(options.filters)
      headers = ['ID', 'Action', 'Table', 'Record ID', 'User', 'Timestamp', 'Details']
      break
    default:
      return { error: 'Invalid entity', code: 'VALIDATION_ERROR' }
  }

  // Generate export based on format
  switch (options.format) {
    case 'csv':
      return generateCSV(data, headers, options.entity)
    case 'excel':
      return generateExcel(data, headers, options.entity)
    case 'pdf':
      return generatePDF(data, headers, options.entity)
    default:
      return { error: 'Invalid format', code: 'VALIDATION_ERROR' }
  }
}

// Data fetchers
async function fetchInventoryData(filters?: Record<string, any>) {
  return prisma.inventoryItem.findMany({
    where: filters,
    include: {
      category: true,
      warehouse: true,
      stockLevels: true
    },
    orderBy: { name: 'asc' }
  }).then(items => items.map(item => ({
    id: item.id,
    name: item.name,
    serialNumber: item.serialNumber || '',
    category: item.category?.name || '',
    quantity: item.quantity,
    status: item.status,
    warehouse: item.warehouse?.name || ''
  })))
}

async function fetchUsersData(filters?: Record<string, any>) {
  return prisma.user.findMany({
    where: filters,
    include: {
      userRoles: { include: { role: true } }
    },
    orderBy: { name: 'asc' }
  }).then(users => users.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    department: user.department || '',
    position: user.position || '',
    roles: user.userRoles.map(ur => ur.role.name).join(', '),
    status: user.status
  })))
}

async function fetchRequestsData(filters?: Record<string, any>) {
  return prisma.request.findMany({
    where: filters,
    include: {
      requester: true,
      approvedBy: true,
      items: true
    },
    orderBy: { createdAt: 'desc' }
  }).then(requests => requests.map(req => ({
    id: req.id,
    type: req.type,
    requester: req.requester.name,
    status: req.status,
    created: req.createdAt.toISOString(),
    approvedBy: req.approvedBy?.name || '',
    items: req.items.length
  })))
}

async function fetchAuditData(filters?: Record<string, any>) {
  return prisma.auditLog.findMany({
    where: filters,
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 1000
  }).then(logs => logs.map(log => ({
    id: log.id,
    action: log.action,
    table: log.tableName,
    recordId: log.recordId,
    user: log.user?.name || 'System',
    timestamp: log.createdAt.toISOString(),
    details: JSON.stringify({ old: log.oldData, new: log.newData })
  })))
}

// CSV Generator
function generateCSV(data: any[], headers: string[], entity: string) {
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      Object.values(row).map(cell =>
        `"${String(cell ?? '').replace(/"/g, '""')}"`
      ).join(',')
    )
  ]

  const csv = csvRows.join('\n')

  return {
    success: true,
    data: csv,
    filename: `${entity}_export_${new Date().toISOString().split('T')[0]}.csv`,
    mimeType: 'text/csv'
  }
}
```

### Excel Export

```typescript
// Using ExcelJS
import ExcelJS from 'exceljs'

async function generateExcel(data: any[], headers: string[], entity: string) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(entity.charAt(0).toUpperCase() + entity.slice(1))

  // Add title row
  worksheet.mergeCells('A1:' + String.fromCharCode(64 + headers.length) + '1')
  const titleRow = worksheet.getRow(1)
  titleRow.getCell(1).value = `${entity.toUpperCase()} Export - ${new Date().toLocaleDateString()}`
  titleRow.getCell(1).font = { size: 16, bold: true }
  titleRow.height = 30

  // Add headers
  const headerRow = worksheet.getRow(3)
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1)
    cell.value = header
    cell.font = { bold: true, color: { argb: 'FFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' }
    }
    cell.alignment = { horizontal: 'center' }
  })

  // Add data rows
  data.forEach((row, rowIndex) => {
    const dataRow = worksheet.getRow(rowIndex + 4)
    Object.values(row).forEach((cell, colIndex) => {
      dataRow.getCell(colIndex + 1).value = cell ?? ''
    })
  })

  // Auto-fit columns
  worksheet.columns.forEach((column, index) => {
    let maxLength = headers[index]?.length || 10
    data.forEach(row => {
      const cellValue = Object.values(row)[index]
      if (cellValue) {
        maxLength = Math.max(maxLength, String(cellValue).length)
      }
    })
    column.width = Math.min(maxLength + 2, 50)
  })

  // Add border to all cells
  worksheet.eachRow((row, rowNum) => {
    if (rowNum >= 3) {
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      })
    }
  })

  // Generate buffer
  return workbook.xlsx.writeBuffer().then(buffer => ({
    success: true,
    data: Buffer.from(buffer).toString('base64'),
    filename: `${entity}_export_${new Date().toISOString().split('T')[0]}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }))
}
```

### PDF Export

```typescript
// Using PDFKit
import PDFDocument from 'pdfkit'

async function generatePDF(data: any[], headers: string[], entity: string) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    })

    const chunks: Buffer[] = []
    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks)
      resolve({
        success: true,
        data: buffer.toString('base64'),
        filename: `${entity}_export_${new Date().toISOString().split('T')[0]}.pdf`,
        mimeType: 'application/pdf'
      })
    })

    // Title
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text(`${entity.toUpperCase()} Export Report`, { align: 'center' })

    doc.fontSize(10)
       .font('Helvetica')
       .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' })

    doc.moveDown(2)

    // Table
    const tableTop = doc.y
    const rowHeight = 20
    const colWidth = (doc.page.width - 100) / headers.length

    // Header row
    doc.font('Helvetica-Bold')
       .fontSize(9)
       .fillColor('white')
       .rect(50, tableTop, doc.page.width - 100, rowHeight)
       .fill('#4472C4')

    headers.forEach((header, i) => {
      doc.text(header, 50 + i * colWidth + 5, tableTop + 5, { width: colWidth - 10 })
    })

    // Data rows
    doc.font('Helvetica')
       .fontSize(8)
       .fillColor('black')

    data.slice(0, 30).forEach((row, rowIndex) => {
      const y = tableTop + (rowIndex + 1) * rowHeight

      // Alternate row colors
      if (rowIndex % 2 === 1) {
        doc.rect(50, y, doc.page.width - 100, rowHeight)
           .fill('#F2F2F2')
      }

      Object.values(row).forEach((cell, colIndex) => {
        doc.text(
          String(cell ?? '').slice(0, 30),
          50 + colIndex * colWidth + 5,
          y + 5,
          { width: colWidth - 10 }
        )
      })
    })

    // Footer
    doc.fontSize(8)
       .text(
         `Total records: ${data.length} | Page 1 of 1`,
         50,
         doc.page.height - 40,
         { align: 'center' }
       )

    doc.end()
  })
}
```

---

## Frontend Component

```typescript
// components/export/export-dialog.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { FileSpreadsheet, FileText, FileType } from 'lucide-react'
import { exportData } from '@/lib/actions/export'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entity: 'inventory' | 'users' | 'requests' | 'audit'
  filters?: Record<string, any>
}

export function ExportDialog({ open, onOpenChange, entity, filters }: ExportDialogProps) {
  const [format, setFormat] = useState<'csv' | 'excel' | 'pdf'>('csv')
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)

    try {
      const result = await exportData({ format, entity, filters })

      if (result.success) {
        // Download file
        const blob = format === 'csv'
          ? new Blob([result.data], { type: result.mimeType })
          : Buffer.from(result.data, 'base64')

        const url = URL.createObjectURL(blob as any)
        const a = document.createElement('a')
        a.href = url
        a.download = result.filename
        a.click()
        URL.revokeObjectURL(url)

        onOpenChange(false)
      }
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export {entity}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Format</label>
            <Select value={format} onValueChange={(v) => setFormat(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    CSV (Spreadsheet)
                  </div>
                </SelectItem>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    Excel (.xlsx)
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileType className="w-4 h-4" />
                    PDF Document
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={loading}>
              {loading ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Quick Export Buttons

```typescript
// components/export/quick-export.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { exportData } from '@/lib/actions/export'

interface QuickExportProps {
  entity: 'inventory' | 'users' | 'requests' | 'audit'
  filters?: Record<string, any>
  format?: 'csv' | 'excel' | 'pdf'
}

export function QuickExport({ entity, filters, format = 'csv' }: QuickExportProps) {
  const handleExport = async () => {
    const result = await exportData({ format, entity, filters })

    if (result.success) {
      const blob = new Blob([result.data], { type: result.mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.filename
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="w-4 h-4 mr-2" />
      Export {format.toUpperCase()}
    </Button>
  )
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
