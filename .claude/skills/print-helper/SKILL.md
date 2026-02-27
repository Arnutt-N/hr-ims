---
name: print-helper
description: Print functionality for reports and documents in HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["print", "printable", "report print", "export print", "pdf"]
  file_patterns: ["*print*", "components/print/**"]
  context: printing reports, documents, printable views
mcp_servers:
  - sequential
personas:
  - frontend
---

# Print Helper

## Core Role

Implement print functionality for HR-IMS:
- Printable reports
- Print-specific styles
- Print preview
- PDF generation

---

## Print Styles

```css
/* styles/print.css */
@media print {
  /* Hide non-printable elements */
  .no-print,
  nav,
  aside,
  footer,
  .sidebar,
  .navigation,
  button:not(.print-button),
  .dropdown,
  .modal-backdrop {
    display: none !important;
  }

  /* Reset backgrounds */
  body {
    background: white !important;
    color: black !important;
    font-size: 12pt;
    line-height: 1.4;
  }

  /* Expand content */
  .print-content {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* Page breaks */
  .page-break-before {
    page-break-before: always;
  }

  .page-break-after {
    page-break-after: always;
  }

  .avoid-break {
    page-break-inside: avoid;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    border: 1px solid #000;
    padding: 8px;
    text-align: left;
  }

  th {
    background: #f0f0f0 !important;
    font-weight: bold;
  }

  /* Links */
  a {
    text-decoration: none !important;
    color: black !important;
  }

  a[href^="http"]::after {
    content: " (" attr(href) ")";
    font-size: 0.8em;
    color: #666;
  }

  /* Images */
  img {
    max-width: 100%;
    page-break-inside: avoid;
  }

  /* Cards */
  .card {
    border: 1px solid #ccc !important;
    box-shadow: none !important;
    margin-bottom: 1rem;
    page-break-inside: avoid;
  }

  /* Header on each page */
  .print-header {
    display: block !important;
    position: running(header);
  }

  @page {
    margin: 2cm;
    @top-center {
      content: element(header);
    }
    @bottom-center {
      content: "หน้า " counter(page) " จาก " counter(pages);
    }
  }
}
```

---

## Print Components

### Printable Report Wrapper

```typescript
// components/print/printable-report.tsx
'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PrintableReportProps {
  children: ReactNode
  title: string
  subtitle?: string
  logo?: string
  date?: Date
  className?: string
}

export function PrintableReport({
  children,
  title,
  subtitle,
  logo,
  date = new Date(),
  className
}: PrintableReportProps) {
  return (
    <div className={cn('print-content', className)}>
      {/* Print Header */}
      <header className="hidden print:block mb-8 border-b pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            {logo && (
              <img src={logo} alt="Logo" className="h-12" />
            )}
            <div>
              <h1 className="text-xl font-bold">{title}</h1>
              {subtitle && (
                <p className="text-sm text-gray-600">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="text-right text-sm">
            <p>วันที่พิมพ์ / Printed: {date.toLocaleDateString('th-TH')}</p>
            <p>เวลา / Time: {date.toLocaleTimeString('th-TH')}</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="print-content">
        {children}
      </main>

      {/* Print Footer */}
      <footer className="hidden print:block mt-8 pt-4 border-t text-center text-sm text-gray-500">
        <p>HR-IMS - Human Resource & Inventory Management System</p>
        <p>เอกสารนี้สร้างโดยระบบอัตโนมัติ / This document was auto-generated</p>
      </footer>
    </div>
  )
}
```

### Print Button

```typescript
// components/print/print-button.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

interface PrintButtonProps {
  className?: string
  label?: string
}

export function PrintButton({ className, label }: PrintButtonProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <Button
      variant="outline"
      onClick={handlePrint}
      className={className}
    >
      <Printer className="h-4 w-4 mr-2" />
      {label || 'พิมพ์ / Print'}
    </Button>
  )
}
```

### Print Preview Dialog

```typescript
// components/print/print-preview-dialog.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Printer, Download } from 'lucide-react'

interface PrintPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  title?: string
}

export function PrintPreviewDialog({
  open,
  onOpenChange,
  children,
  title = 'ตัวอย่างก่อนพิมพ์ / Print Preview'
}: PrintPreviewDialogProps) {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: sans-serif; padding: 20px; }
              @media print {
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            ${document.getElementById('print-content')?.innerHTML || ''}
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div id="print-content" className="border rounded-lg p-6 bg-white">
          {children}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ปิด / Close
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            พิมพ์ / Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Report Templates

### Inventory Report

```typescript
// components/reports/inventory-print-report.tsx
import { PrintableReport } from '@/components/print/printable-report'
import { formatShort } from '@/lib/date/format'

interface InventoryReportProps {
  items: Array<{
    id: number
    name: string
    serialNumber?: string
    category: string
    quantity: number
    unit: string
    status: string
    warehouse: string
  }>
  generatedBy: string
}

export function InventoryPrintReport({ items, generatedBy }: InventoryReportProps) {
  const totalItems = items.length
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <PrintableReport
      title="รายงานสินค้าคงคลัง"
      subtitle="Inventory Report"
    >
      {/* Summary */}
      <div className="mb-6 print:mb-8">
        <div className="grid grid-cols-3 gap-4">
          <div className="border rounded p-4 text-center">
            <p className="text-sm text-gray-600">จำนวนรายการ / Items</p>
            <p className="text-2xl font-bold">{totalItems}</p>
          </div>
          <div className="border rounded p-4 text-center">
            <p className="text-sm text-gray-600">จำนวนรวม / Total Qty</p>
            <p className="text-2xl font-bold">{totalQuantity}</p>
          </div>
          <div className="border rounded p-4 text-center">
            <p className="text-sm text-gray-600">ผู้สร้างรายงาน / Generated by</p>
            <p className="text-lg font-medium">{generatedBy}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">ลำดับ</th>
            <th className="border p-2 text-left">ชื่อสินค้า / Name</th>
            <th className="border p-2 text-left">Serial No.</th>
            <th className="border p-2 text-left">หมวดหมู่ / Category</th>
            <th className="border p-2 text-right">จำนวน / Qty</th>
            <th className="border p-2 text-left">สถานะ / Status</th>
            <th className="border p-2 text-left">คลัง / Warehouse</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id} className="avoid-break">
              <td className="border p-2">{index + 1}</td>
              <td className="border p-2">{item.name}</td>
              <td className="border p-2">{item.serialNumber || '-'}</td>
              <td className="border p-2">{item.category}</td>
              <td className="border p-2 text-right">{item.quantity} {item.unit}</td>
              <td className="border p-2">{item.status}</td>
              <td className="border p-2">{item.warehouse}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PrintableReport>
  )
}
```

### Request Approval Report

```typescript
// components/reports/request-approval-report.tsx
import { PrintableReport } from '@/components/print/printable-report'

interface RequestApprovalReportProps {
  request: {
    id: number
    type: string
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
}

export function RequestApprovalReport({ request }: RequestApprovalReportProps) {
  const typeLabels: Record<string, string> = {
    BORROW: 'ยืม / Borrow',
    WITHDRAW: 'เบิก / Withdraw',
    RETURN: 'คืน / Return'
  }

  return (
    <PrintableReport
      title={`ใบ${typeLabels[request.type] || request.type}`}
      subtitle={`Request #${request.id}`}
    >
      {/* Request Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-600">ผู้ขอ / Requester</p>
          <p className="font-medium">{request.requester}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">แผนก / Department</p>
          <p className="font-medium">{request.department}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">วันที่ขอ / Request Date</p>
          <p className="font-medium">{request.createdAt.toLocaleDateString('th-TH')}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">สถานะ / Status</p>
          <p className="font-medium">{request.status}</p>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">ลำดับ</th>
            <th className="border p-2 text-left">รายการ / Item</th>
            <th className="border p-2 text-right">จำนวน / Qty</th>
            <th className="border p-2 text-left">หมายเหตุ / Notes</th>
          </tr>
        </thead>
        <tbody>
          {request.items.map((item, index) => (
            <tr key={index}>
              <td className="border p-2">{index + 1}</td>
              <td className="border p-2">{item.name}</td>
              <td className="border p-2 text-right">{item.quantity} {item.unit}</td>
              <td className="border p-2">{item.notes || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Approval Section */}
      {request.approvedBy && (
        <div className="border-t pt-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">ผู้อนุมัติ / Approved by</p>
              <p className="font-medium">{request.approvedBy}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">วันที่อนุมัติ / Approved Date</p>
              <p className="font-medium">
                {request.approvedAt?.toLocaleDateString('th-TH')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Signature Section */}
      <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t">
        <div className="text-center">
          <div className="border-b border-gray-400 mb-2 h-16"></div>
          <p className="text-sm">ผู้ขอ / Requester</p>
          <p className="text-sm text-gray-500">วันที่ / Date</p>
        </div>
        <div className="text-center">
          <div className="border-b border-gray-400 mb-2 h-16"></div>
          <p className="text-sm">ผู้อนุมัติ / Approver</p>
          <p className="text-sm text-gray-500">วันที่ / Date</p>
        </div>
        <div className="text-center">
          <div className="border-b border-gray-400 mb-2 h-16"></div>
          <p className="text-sm">ผู้รับ / Receiver</p>
          <p className="text-sm text-gray-500">วันที่ / Date</p>
        </div>
      </div>
    </PrintableReport>
  )
}
```

---

## Print Hook

```typescript
// hooks/use-print.ts
'use client'

import { useCallback } from 'react'

interface PrintOptions {
  title?: string
  content?: string
  styles?: string
}

export function usePrint() {
  const print = useCallback((options?: PrintOptions) => {
    if (options?.content) {
      // Print specific content
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${options.title || 'Print'}</title>
              <style>
                body { font-family: 'Sarabun', sans-serif; padding: 20px; }
                ${options.styles || ''}
                @media print {
                  body { padding: 0; }
                }
              </style>
            </head>
            <body>
              ${options.content}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        printWindow.print()
        printWindow.close()
      }
    } else {
      // Print current page
      window.print()
    }
  }, [])

  const printElement = useCallback((elementId: string, title?: string) => {
    const element = document.getElementById(elementId)
    if (element) {
      print({
        title,
        content: element.innerHTML
      })
    }
  }, [print])

  return { print, printElement }
}
```

---

## Page Break Component

```typescript
// components/print/page-break.tsx
import { cn } from '@/lib/utils'

interface PageBreakProps {
  type?: 'before' | 'after'
  className?: string
}

export function PageBreak({ type = 'after', className }: PageBreakProps) {
  return (
    <div
      className={cn(
        'hidden print:block',
        type === 'before' ? 'page-break-before' : 'page-break-after',
        className
      )}
    />
  )
}
```

---

## Export to PDF (using react-to-print)

```typescript
// components/print/pdf-export.tsx
'use client'

import { useRef } from 'react'
import { useReactToPrint } from 'react-to-print'

interface PDFExportProps {
  children: React.ReactNode
  filename?: string
  trigger: (handlePrint: () => void) => React.ReactNode
}

export function PDFExport({ children, filename, trigger }: PDFExportProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: filename || 'document',
  })

  return (
    <>
      {trigger(handlePrint)}
      <div ref={contentRef} className="print-content">
        {children}
      </div>
    </>
  )
}

// Usage
<PDFExport
  filename="inventory-report"
  trigger={(handlePrint) => (
    <Button onClick={handlePrint}>
      <Download className="h-4 w-4 mr-2" />
      ดาวน์โหลด PDF
    </Button>
  )}
>
  <InventoryPrintReport items={items} generatedBy="Admin" />
</PDFExport>
```

---

## Install Required Package

```bash
npm install react-to-print
```

---

*Version: 1.0.0 | For HR-IMS Project*
