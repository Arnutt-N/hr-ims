---
name: clipboard-helper
description: Copy to clipboard functionality with fallback support for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["clipboard", "copy", "paste", "copy to clipboard"]
  file_patterns: ["*clipboard*", "hooks/use-clipboard*"]
  context: copy functionality, clipboard operations
mcp_servers:
  - sequential
personas:
  - frontend
---

# Clipboard Helper

## Core Role

Implement clipboard functionality for HR-IMS:
- Copy text to clipboard
- Copy rich content (tables, formatted text)
- Fallback for older browsers
- Copy feedback with toast

---

## Clipboard Hook

```typescript
// hooks/use-clipboard.ts
'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'

interface UseClipboardOptions {
  timeout?: number
  onSuccess?: (text: string) => void
  onError?: (error: Error) => void
}

export function useClipboard(options: UseClipboardOptions = {}) {
  const { timeout = 2000, onSuccess, onError } = options
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const copy = useCallback(
    async (text: string) => {
      try {
        // Modern clipboard API
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text)
        } else {
          // Fallback for older browsers
          fallbackCopy(text)
        }

        setCopied(true)
        setError(null)
        onSuccess?.(text)

        // Reset copied state after timeout
        setTimeout(() => setCopied(false), timeout)

        return true
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Copy failed')
        setError(error)
        onError?.(error)
        return false
      }
    },
    [timeout, onSuccess, onError]
  )

  const read = useCallback(async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        return await navigator.clipboard.readText()
      }
      return null
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Read failed'))
      return null
    }
  }, [])

  return { copy, read, copied, error }
}

// Fallback copy using textarea
function fallbackCopy(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.top = '-9999px'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()

  try {
    document.execCommand('copy')
  } finally {
    document.body.removeChild(textarea)
  }
}
```

---

## Copy Button Component

```typescript
// components/ui/copy-button.tsx
'use client'

import { useState } from 'react'
import { Button, ButtonProps } from '@/components/ui/button'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClipboard } from '@/hooks/use-clipboard'
import { toast } from 'sonner'

interface CopyButtonProps extends ButtonProps {
  text: string
  showText?: boolean
  successMessage?: string
}

export function CopyButton({
  text,
  showText = false,
  successMessage,
  className,
  ...props
}: CopyButtonProps) {
  const { copy, copied } = useClipboard({
    onSuccess: () => {
      toast.success(successMessage || 'คัดลอกแล้ว / Copied!')
    }
  })

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => copy(text)}
      className={cn('h-8 w-8', className)}
      {...props}
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      <span className="sr-only">คัดลอก / Copy</span>
    </Button>
  )
}

// With text label
export function CopyButtonWithLabel({
  text,
  label = 'คัดลอก / Copy',
  className,
  ...props
}: CopyButtonProps & { label?: string }) {
  const { copy, copied } = useClipboard()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => copy(text)}
      className={className}
      {...props}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 mr-2 text-green-500" />
          คัดลอกแล้ว / Copied!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 mr-2" />
          {label}
        </>
      )}
    </Button>
  )
}
```

---

## Copyable Text Field

```typescript
// components/ui/copyable-text.tsx
'use client'

import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClipboard } from '@/hooks/use-clipboard'
import { toast } from 'sonner'

interface CopyableTextProps {
  text: string
  displayText?: string
  className?: string
  showIcon?: boolean
  mono?: boolean
}

export function CopyableText({
  text,
  displayText,
  className,
  showIcon = true,
  mono = false
}: CopyableTextProps) {
  const { copy, copied } = useClipboard()

  return (
    <div
      onClick={() => {
        copy(text)
        toast.success('คัดลอกแล้ว / Copied!')
      }}
      className={cn(
        'inline-flex items-center gap-2 cursor-pointer group',
        mono && 'font-mono',
        className
      )}
    >
      <span className="group-hover:text-primary transition-colors">
        {displayText || text}
      </span>
      {showIcon && (
        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </span>
      )}
    </div>
  )
}
```

---

## Copy Table to Clipboard

```typescript
// lib/clipboard/copy-table.ts
import { toast } from 'sonner'

interface TableColumn {
  key: string
  header: string
}

export async function copyTableToClipboard(
  data: Record<string, any>[],
  columns: TableColumn[],
  format: 'text' | 'csv' | 'html' = 'text'
): Promise<boolean> {
  try {
    let content: string

    switch (format) {
      case 'csv':
        content = tableToCSV(data, columns)
        break
      case 'html':
        content = tableToHTML(data, columns)
        break
      default:
        content = tableToText(data, columns)
    }

    await navigator.clipboard.writeText(content)
    toast.success('คัดลอกตารางแล้ว / Table copied!')
    return true
  } catch (error) {
    toast.error('คัดลอกไม่สำเร็จ / Copy failed')
    return false
  }
}

function tableToText(
  data: Record<string, any>[],
  columns: TableColumn[]
): string {
  const headers = columns.map((c) => c.header).join('\t')
  const rows = data.map((row) =>
    columns.map((c) => String(row[c.key] ?? '')).join('\t')
  )
  return [headers, ...rows].join('\n')
}

function tableToCSV(
  data: Record<string, any>[],
  columns: TableColumn[]
): string {
  const headers = columns.map((c) => `"${c.header}"`).join(',')
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const value = String(row[c.key] ?? '')
        return `"${value.replace(/"/g, '""')}"`
      })
      .join(',')
  )
  return [headers, ...rows].join('\n')
}

function tableToHTML(
  data: Record<string, any>[],
  columns: TableColumn[]
): string {
  const headers = columns.map((c) => `<th>${c.header}</th>`).join('')
  const rows = data
    .map(
      (row) =>
        `<tr>${columns.map((c) => `<td>${row[c.key] ?? ''}</td>`).join('')}</tr>`
    )
    .join('')

  return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`
}
```

---

## Copy Button for Table

```typescript
// components/tables/table-copy-button.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Copy } from 'lucide-react'
import { copyTableToClipboard } from '@/lib/clipboard/copy-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface TableCopyButtonProps {
  data: Record<string, any>[]
  columns: Array<{ key: string; header: string }>
}

export function TableCopyButton({ data, columns }: TableCopyButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Copy className="h-4 w-4 mr-2" />
          คัดลอก / Copy
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => copyTableToClipboard(data, columns, 'text')}>
          เป็น Text / As Text
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => copyTableToClipboard(data, columns, 'csv')}>
          เป็น CSV / As CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => copyTableToClipboard(data, columns, 'html')}>
          เป็น HTML / As HTML
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

---

## Copy Rich Content

```typescript
// lib/clipboard/copy-rich.ts
export async function copyRichContent(html: string, text?: string): Promise<boolean> {
  try {
    const clipboardItem = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      ...(text && { 'text/plain': new Blob([text], { type: 'text/plain' }) })
    })
    await navigator.clipboard.write([clipboardItem])
    return true
  } catch (error) {
    // Fallback to plain text
    if (text) {
      await navigator.clipboard.writeText(text)
      return true
    }
    return false
  }
}

// Copy formatted receipt
export function copyReceipt(receipt: {
  id: number
  type: string
  items: Array<{ name: string; quantity: number }>
  date: Date
  requester: string
}) {
  const text = `
ใบ${receipt.type === 'BORROW' ? 'ยืม' : receipt.type === 'WITHDRAW' ? 'เบิก' : 'คืน'} #${receipt.id}
วันที่: ${receipt.date.toLocaleDateString('th-TH')}
ผู้ขอ: ${receipt.requester}
รายการ:
${receipt.items.map((item) => `- ${item.name} x ${item.quantity}`).join('\n')}
  `.trim()

  return navigator.clipboard.writeText(text)
}
```

---

## Usage Examples

```typescript
// Example 1: Simple copy button
<CopyButton text={item.serialNumber} />

// Example 2: Copyable text field
<CopyableText text={user.email} mono />

// Example 3: Copy with hook
function ShareButton({ url }: { url: string }) {
  const { copy, copied } = useClipboard()

  return (
    <Button onClick={() => copy(url)}>
      {copied ? 'Copied!' : 'Share'}
    </Button>
  )
}

// Example 4: Copy table data
<TableCopyButton
  data={inventoryItems}
  columns={[
    { key: 'name', header: 'ชื่อ / Name' },
    { key: 'quantity', header: 'จำนวน / Qty' },
    { key: 'status', header: 'สถานะ / Status' }
  ]}
/>
```

---

*Version: 1.0.0 | For HR-IMS Project*
