---
name: pdf-generator
description: PDF generation and manipulation for reports and documents in HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["pdf", "generate pdf", "create pdf", "pdf report", "document generation"]
  file_patterns: ["*pdf*", "lib/pdf*", "components/pdf/**"]
  context: PDF generation, document export, report generation
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# PDF Generator

## Core Role

Generate PDF documents for HR-IMS:
- Inventory reports
- Request approval forms
- Asset labels with QR codes
- Transaction receipts
- Audit logs

---

## Install Dependencies

```bash
npm install jspdf jspdf-autotable qrcode
npm install @types/jspdf -D
```

---

## Basic PDF Generator

```typescript
// lib/pdf/generator.ts
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface PDFOptions {
  title: string
  subtitle?: string
  orientation?: 'portrait' | 'landscape'
  format?: 'a4' | 'letter'
  fontSize?: number
}

export function createPDF(options: PDFOptions): jsPDF {
  const {
    title,
    subtitle,
    orientation = 'portrait',
    format = 'a4',
    fontSize = 12
  } = options

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format
  })

  // Add Thai font (requires font file)
  // doc.addFont('/fonts/THSarabunNew.ttf', 'THSarabun', 'normal')

  // Header
  doc.setFontSize(18)
  doc.text(title, 14, 20)

  if (subtitle) {
    doc.setFontSize(12)
    doc.setTextColor(100)
    doc.text(subtitle, 14, 28)
    doc.setTextColor(0)
  }

  // Date
  doc.setFontSize(10)
  doc.text(`วันที่: ${new Date().toLocaleDateString('th-TH')}`, 14, 36)

  return doc
}

// Add footer to each page
export function addFooter(doc: jsPDF, pageNumber: number, totalPages: number) {
  const pageHeight = doc.internal.pageSize.height

  doc.setFontSize(9)
  doc.setTextColor(128)
  doc.text(
    `หน้า ${pageNumber} จาก ${totalPages}`,
    doc.internal.pageSize.width / 2,
    pageHeight - 10,
    { align: 'center' }
  )
  doc.text(
    'HR-IMS - ระบบบริหารจัดการทรัพยากรบุคคลและคลังวัสดุ',
    doc.internal.pageSize.width / 2,
    pageHeight - 5,
    { align: 'center' }
  )
  doc.setTextColor(0)
}
```

---

## Inventory Report PDF

```typescript
// lib/pdf/inventory-report.ts
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { createPDF, addFooter } from './generator'

interface InventoryItem {
  id: number
  name: string
  serialNumber?: string
  category: string
  quantity: number
  unit: string
  status: string
  warehouse: string
}

export function generateInventoryReportPDF(items: InventoryItem[]): jsPDF {
  const doc = createPDF({
    title: 'รายงานสินค้าคงคลัง',
    subtitle: 'Inventory Report',
    orientation: 'landscape'
  })

  // Summary section
  const totalItems = items.length
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)

  doc.setFontSize(11)
  doc.text(`จำนวนรายการทั้งหมด: ${totalItems} รายการ`, 14, 45)
  doc.text(`จำนวนรวม: ${totalQuantity} หน่วย`, 14, 52)

  // Table
  const tableData = items.map((item, index) => [
    index + 1,
    item.name,
    item.serialNumber || '-',
    item.category,
    `${item.quantity} ${item.unit}`,
    item.status,
    item.warehouse
  ])

  autoTable(doc, {
    startY: 60,
    head: [[
      'ลำดับ',
      'ชื่อสินค้า / Name',
      'Serial No.',
      'หมวดหมู่ / Category',
      'จำนวน / Qty',
      'สถานะ / Status',
      'คลัง / Warehouse'
    ]],
    body: tableData,
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 50 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
      6: { cellWidth: 30 }
    }
  })

  // Add footer to all pages
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    addFooter(doc, i, pageCount)
  }

  return doc
}

// Server Action to download PDF
export async function downloadInventoryReport() {
  'use server'

  const items = await prisma.inventoryItem.findMany({
    include: {
      category: true,
      stockLevels: {
        include: { warehouse: true }
      }
    }
  })

  const formattedItems = items.map(item => ({
    id: item.id,
    name: item.name,
    serialNumber: item.serialNumber || undefined,
    category: item.category?.name || '-',
    quantity: item.stockLevels.reduce((sum, sl) => sum + sl.quantity, 0),
    unit: item.unit,
    status: item.status,
    warehouse: item.stockLevels.map(sl => sl.warehouse.name).join(', ') || '-'
  }))

  const doc = generateInventoryReportPDF(formattedItems)
  return doc.output('base64')
}
```

---

## Request Approval Form PDF

```typescript
// lib/pdf/request-form.ts
import jsPDF from 'jspdf'
import { createPDF, addFooter } from './generator'

interface RequestFormData {
  id: number
  type: 'BORROW' | 'WITHDRAW' | 'RETURN'
  requester: string
  department: string
  createdAt: Date
  status: string
  items: Array<{
    name: string
    quantity: number
    unit: string
    notes?: string
  }>
  approvedBy?: string
  approvedAt?: Date
  notes?: string
}

export function generateRequestFormPDF(request: RequestFormData): jsPDF {
  const doc = createPDF({
    title: `ใบ${getTypeLabel(request.type)}`,
    subtitle: `Request #${request.id}`
  })

  let y = 45

  // Request info
  doc.setFontSize(11)
  doc.text(`ผู้ขอ / Requester: ${request.requester}`, 14, y)
  y += 7
  doc.text(`แผนก / Department: ${request.department}`, 14, y)
  y += 7
  doc.text(`วันที่ขอ / Request Date: ${request.createdAt.toLocaleDateString('th-TH')}`, 14, y)
  y += 7
  doc.text(`สถานะ / Status: ${request.status}`, 14, y)
  y += 15

  // Items table
  doc.setFontSize(10)
  doc.text('รายการที่ขอ / Requested Items:', 14, y)
  y += 5

  // Simple table
  const colWidths = [10, 80, 30, 50]
  const startX = 14
  const rowHeight = 7

  // Header
  doc.setFillColor(41, 128, 185)
  doc.setTextColor(255)
  doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F')
  doc.text('ลำดับ', startX + 2, y + 5)
  doc.text('รายการ / Item', startX + 12, y + 5)
  doc.text('จำนวน / Qty', startX + 92, y + 5)
  doc.text('หมายเหตุ / Notes', startX + 122, y + 5)
  doc.setTextColor(0)
  y += rowHeight

  // Rows
  request.items.forEach((item, index) => {
    if (y > 270) {
      doc.addPage()
      y = 20
    }

    doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowHeight)
    doc.text(String(index + 1), startX + 2, y + 5)
    doc.text(item.name.substring(0, 40), startX + 12, y + 5)
    doc.text(`${item.quantity} ${item.unit}`, startX + 92, y + 5)
    doc.text((item.notes || '-').substring(0, 25), startX + 122, y + 5)
    y += rowHeight
  })

  y += 15

  // Approval section
  if (request.approvedBy) {
    doc.text(`ผู้อนุมัติ / Approved by: ${request.approvedBy}`, 14, y)
    y += 7
    doc.text(`วันที่อนุมัติ / Approved Date: ${request.approvedAt?.toLocaleDateString('th-TH')}`, 14, y)
    y += 15
  }

  // Signature section
  y = Math.max(y, 220)

  // Signature boxes
  const sigWidth = 50
  const sigSpacing = 20
  const sigStartX = 14

  // Requester signature
  doc.rect(sigStartX, y, sigWidth, 30)
  doc.text('ผู้ขอ / Requester', sigStartX + sigWidth / 2, y + 35, { align: 'center' })
  doc.text('วันที่ / Date: ___/___/______', sigStartX + sigWidth / 2, y + 40, { align: 'center' })

  // Approver signature
  doc.rect(sigStartX + sigWidth + sigSpacing, y, sigWidth, 30)
  doc.text('ผู้อนุมัติ / Approver', sigStartX + sigWidth + sigSpacing + sigWidth / 2, y + 35, { align: 'center' })
  doc.text('วันที่ / Date: ___/___/______', sigStartX + sigWidth + sigSpacing + sigWidth / 2, y + 40, { align: 'center' })

  // Receiver signature
  doc.rect(sigStartX + (sigWidth + sigSpacing) * 2, y, sigWidth, 30)
  doc.text('ผู้รับ / Receiver', sigStartX + (sigWidth + sigSpacing) * 2 + sigWidth / 2, y + 35, { align: 'center' })
  doc.text('วันที่ / Date: ___/___/______', sigStartX + (sigWidth + sigSpacing) * 2 + sigWidth / 2, y + 40, { align: 'center' })

  // Footer
  addFooter(doc, 1, 1)

  return doc
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    BORROW: 'ยืม',
    WITHDRAW: 'เบิก',
    RETURN: 'คืน'
  }
  return labels[type] || type
}
```

---

## QR Code Label PDF

```typescript
// lib/pdf/qr-label.ts
import jsPDF from 'jspdf'
import QRCode from 'qrcode'

interface QRLabelData {
  id: number
  code: string
  name: string
  category?: string
  location?: string
}

export async function generateQRLabelsPDF(items: QRLabelData[]): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const labelWidth = 70
  const labelHeight = 35
  const marginX = 10
  const marginY = 10
  const spacingX = 5
  const spacingY = 5
  const cols = 3
  const rows = 8

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const pageIndex = Math.floor(i / (cols * rows))

    if (i > 0 && i % (cols * rows) === 0) {
      doc.addPage()
    }

    const posIndex = i % (cols * rows)
    const col = posIndex % cols
    const row = Math.floor(posIndex / cols)

    const x = marginX + col * (labelWidth + spacingX)
    const y = marginY + row * (labelHeight + spacingY)

    // Generate QR code
    const qrData = JSON.stringify({
      type: 'item',
      id: item.id,
      code: item.code
    })
    const qrDataUrl = await QRCode.toDataURL(qrData, {
      width: 80,
      margin: 1
    })

    // Add QR code
    const qrSize = 25
    doc.addImage(qrDataUrl, 'PNG', x, y, qrSize, qrSize)

    // Add text
    doc.setFontSize(8)
    doc.text(item.code, x + qrSize + 2, y + 5)
    doc.setFontSize(7)
    doc.text(item.name.substring(0, 20), x + qrSize + 2, y + 10)
    if (item.category) {
      doc.setTextColor(100)
      doc.text(item.category, x + qrSize + 2, y + 15)
      doc.setTextColor(0)
    }

    // Border
    doc.setDrawColor(200)
    doc.rect(x, y, labelWidth, labelHeight)
  }

  return doc
}

// Server Action for QR labels
export async function generateItemLabels(itemIds: number[]) {
  'use server'

  const items = await prisma.inventoryItem.findMany({
    where: { id: { in: itemIds } },
    include: { category: true }
  })

  const labelData: QRLabelData[] = items.map(item => ({
    id: item.id,
    code: item.code || `INV-${item.id}`,
    name: item.name,
    category: item.category?.name,
    location: item.location || undefined
  }))

  const doc = await generateQRLabelsPDF(labelData)
  return doc.output('base64')
}
```

---

## PDF Download Component

```typescript
// components/pdf/pdf-download-button.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileDown, Loader2 } from 'lucide-react'

interface PDFDownloadButtonProps {
  onGenerate: () => Promise<string>
  filename: string
  label?: string
}

export function PDFDownloadButton({
  onGenerate,
  filename,
  label = 'ดาวน์โหลด PDF'
}: PDFDownloadButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      const base64 = await onGenerate()

      // Create download link
      const link = document.createElement('a')
      link.href = `data:application/pdf;base64,${base64}`
      link.download = `${filename}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('PDF generation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleDownload} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          กำลังสร้าง PDF...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4 mr-2" />
          {label}
        </>
      )}
    </Button>
  )
}

// Usage
<PDFDownloadButton
  onGenerate={() => downloadInventoryReport()}
  filename={`inventory-report-${new Date().toISOString().split('T')[0]}`}
  label="ดาวน์โหลดรายงาน PDF"
/>
```

---

## PDF Preview Dialog

```typescript
// components/pdf/pdf-preview-dialog.tsx
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
import { FileDown, Printer } from 'lucide-react'

interface PDFPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pdfBase64: string | null
  title: string
  filename: string
}

export function PDFPreviewDialog({
  open,
  onOpenChange,
  pdfBase64,
  title,
  filename
}: PDFPreviewDialogProps) {
  const handleDownload = () => {
    if (!pdfBase64) return

    const link = document.createElement('a')
    link.href = `data:application/pdf;base64,${pdfBase64}`
    link.download = `${filename}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    if (!pdfBase64) return

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <iframe src="data:application/pdf;base64,${pdfBase64}" style="width:100%;height:100%;border:none;"></iframe>
      `)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => printWindow.print(), 500)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-lg">
          {pdfBase64 ? (
            <iframe
              src={`data:application/pdf;base64,${pdfBase64}`}
              className="w-full h-[60vh]"
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
              กำลังโหลด PDF...
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ปิด / Close
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            พิมพ์ / Print
          </Button>
          <Button onClick={handleDownload}>
            <FileDown className="h-4 w-4 mr-2" />
            ดาวน์โหลด / Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Audit Log PDF Report

```typescript
// lib/pdf/audit-report.ts
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { createPDF, addFooter } from './generator'

interface AuditLogEntry {
  id: number
  action: string
  tableName: string
  recordId: string
  userId: number
  userName: string
  createdAt: Date
  ipAddress?: string
}

export function generateAuditReportPDF(
  logs: AuditLogEntry[],
  dateRange: { start: Date; end: Date }
): jsPDF {
  const doc = createPDF({
    title: 'รายงาน Audit Log',
    subtitle: `${dateRange.start.toLocaleDateString('th-TH')} - ${dateRange.end.toLocaleDateString('th-TH')}`,
    orientation: 'landscape'
  })

  // Table
  const tableData = logs.map(log => [
    log.createdAt.toLocaleString('th-TH'),
    log.action,
    log.tableName,
    log.recordId,
    log.userName,
    log.ipAddress || '-'
  ])

  autoTable(doc, {
    startY: 45,
    head: [[
      'วันที่/เวลา',
      'Action',
      'Table',
      'Record ID',
      'ผู้ใช้ / User',
      'IP Address'
    ]],
    body: tableData,
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [52, 73, 94],
      textColor: 255
    }
  })

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    addFooter(doc, i, pageCount)
  }

  return doc
}
```

---

## Usage Examples

```typescript
// Example 1: Generate and download inventory report
async function handleDownloadReport() {
  const base64 = await downloadInventoryReport()
  const link = document.createElement('a')
  link.href = `data:application/pdf;base64,${base64}`
  link.download = `inventory-${Date.now()}.pdf`
  link.click()
}

// Example 2: Generate QR labels for selected items
async function handlePrintLabels(selectedIds: number[]) {
  const base64 = await generateItemLabels(selectedIds)
  // Open in new window for printing
  window.open(`data:application/pdf;base64,${base64}`)
}

// Example 3: Generate request form on approval
async function approveRequest(requestId: number) {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { items: true, requester: true }
  })

  const doc = generateRequestFormPDF(request)
  const base64 = doc.output('base64')

  // Save to database or send via email
  await sendEmailWithAttachment(request.requester.email, base64)
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
