---
name: toast-notifier
description: Toast notification system for user feedback in HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["toast", "notification", "alert", "snackbar", "message"]
  file_patterns: ["*toast*", "components/toast/**", "lib/toast/**"]
  context: user feedback, success messages, error alerts
mcp_servers:
  - sequential
personas:
  - frontend
---

# Toast Notifier

## Core Role

Implement toast notifications for HR-IMS:
- Success/error/warning/info messages
- Bilingual support (Thai/English)
- Action buttons
- Persistent notifications

---

## Toast Types

```yaml
types:
  success:
    color: green
    icon: CheckCircle
    use_case: Successful operations

  error:
    color: red
    icon: XCircle
    use_case: Failed operations, errors

  warning:
    color: yellow
    icon: AlertTriangle
    use_case: Warnings, cautions

  info:
    color: blue
    icon: Info
    use_case: Information, tips
```

---

## Shadcn Toast Setup

### Sonner Integration

```typescript
// components/providers/toast-provider.tsx
'use client'

import { Toaster } from '@/components/ui/sonner'

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        duration={5000}
        theme="light"
      />
    </>
  )
}
```

### Toast Utilities

```typescript
// lib/toast.ts
import { toast as sonnerToast } from 'sonner'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastOptions {
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
  bilingual?: {
    th: { title: string; description?: string }
    en: { title: string; description?: string }
  }
}

// Default to Thai, fallback to English
const defaultLocale = 'th'

function getMessage(bilingual: ToastOptions['bilingual']) {
  if (!bilingual) return { title: '', description: '' }
  return {
    title: `${bilingual.th.title} / ${bilingual.en.title}`,
    description: bilingual.th.description || bilingual.en.description
      ? `${bilingual.th.description || ''} ${bilingual.en.description ? `/ ${bilingual.en.description}` : ''}`
      : undefined
  }
}

export const toast = {
  success: (title: string, options?: ToastOptions) => {
    if (options?.bilingual) {
      const msg = getMessage(options.bilingual)
      return sonnerToast.success(msg.title, {
        description: msg.description,
        action: options.action,
        duration: options.duration
      })
    }
    return sonnerToast.success(title, options)
  },

  error: (title: string, options?: ToastOptions) => {
    if (options?.bilingual) {
      const msg = getMessage(options.bilingual)
      return sonnerToast.error(msg.title, {
        description: msg.description,
        action: options.action,
        duration: options.duration ?? Infinity // Errors persist longer
      })
    }
    return sonnerToast.error(title, { ...options, duration: options?.duration ?? Infinity })
  },

  warning: (title: string, options?: ToastOptions) => {
    if (options?.bilingual) {
      const msg = getMessage(options.bilingual)
      return sonnerToast.warning(msg.title, {
        description: msg.description,
        action: options.action,
        duration: options.duration
      })
    }
    return sonnerToast.warning(title, options)
  },

  info: (title: string, options?: ToastOptions) => {
    if (options?.bilingual) {
      const msg = getMessage(options.bilingual)
      return sonnerToast.info(msg.title, {
        description: msg.description,
        action: options.action,
        duration: options.duration
      })
    }
    return sonnerToast.info(title, options)
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string
      error: string
    }
  ) => {
    return sonnerToast.promise(promise, messages)
  },

  dismiss: (id?: string | number) => {
    sonnerToast.dismiss(id)
  }
}

// Predefined bilingual messages
export const toastMessages = {
  saved: {
    th: { title: 'บันทึกสำเร็จ', description: 'ข้อมูลถูกบันทึกเรียบร้อยแล้ว' },
    en: { title: 'Saved', description: 'Data has been saved successfully' }
  },
  deleted: {
    th: { title: 'ลบสำเร็จ', description: 'ข้อมูลถูกลบเรียบร้อยแล้ว' },
    en: { title: 'Deleted', description: 'Data has been deleted successfully' }
  },
  updated: {
    th: { title: 'อัพเดทสำเร็จ', description: 'ข้อมูลถูกอัพเดทเรียบร้อยแล้ว' },
    en: { title: 'Updated', description: 'Data has been updated successfully' }
  },
  error: {
    th: { title: 'เกิดข้อผิดพลาด', description: 'กรุณาลองใหม่อีกครั้ง' },
    en: { title: 'Error', description: 'Please try again' }
  },
  unauthorized: {
    th: { title: 'ไม่มีสิทธิ์', description: 'คุณไม่มีสิทธิ์ในการดำเนินการนี้' },
    en: { title: 'Unauthorized', description: 'You do not have permission' }
  },
  confirm: {
    th: { title: 'ยืนยันการดำเนินการ?', description: 'การดำเนินการนี้ไม่สามารถย้อนกลับได้' },
    en: { title: 'Confirm action?', description: 'This action cannot be undone' }
  }
}
```

---

## Usage Examples

### In Server Action Response Handler

```typescript
// components/inventory/inventory-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { toast, toastMessages } from '@/lib/toast'
import { createInventoryItem } from '@/lib/actions/inventory'

export function InventoryForm() {
  const form = useForm<InventoryItemInput>()

  const onSubmit = async (data: InventoryItemInput) => {
    const result = await createInventoryItem(data)

    if (result.success) {
      toast.success('', {
        bilingual: toastMessages.saved
      })
      form.reset()
    } else if (result.code === 'UNAUTHORIZED') {
      toast.error('', {
        bilingual: toastMessages.unauthorized
      })
    } else {
      toast.error('', {
        bilingual: toastMessages.error,
        description: result.error
      })
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* form fields */}
    </form>
  )
}
```

### With Undo Action

```typescript
import { toast } from '@/lib/toast'

export function DeleteButton({ itemId }: { itemId: number }) {
  const handleDelete = async () => {
    // Optimistic update
    const result = await deleteItem(itemId)

    if (result.success) {
      toast.success('Item deleted', {
        description: 'The item has been removed',
        action: {
          label: 'Undo',
          onClick: async () => {
            // Restore item
            await restoreItem(itemId)
            toast.success('Item restored')
          }
        }
      })
    }
  }

  return (
    <Button onClick={handleDelete} variant="destructive">
      Delete
    </Button>
  )
}
```

### Promise-based Toast

```typescript
import { toast } from '@/lib/toast'

export function SaveButton() {
  const handleSave = async () => {
    toast.promise(saveData(data), {
      loading: 'กำลังบันทึก... / Saving...',
      success: 'บันทึกสำเร็จ / Saved successfully',
      error: 'บันทึกไม่สำเร็จ / Failed to save'
    })
  }

  return <Button onClick={handleSave}>Save</Button>
}
```

---

## Custom Toast Components

### Action Required Toast

```typescript
// components/toast/action-toast.tsx
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function showActionToast(
  message: string,
  action: {
    label: string
    onClick: () => void
  }
) {
  toast.custom((t) => (
    <div className="bg-background border rounded-lg p-4 shadow-lg flex items-center gap-4">
      <p className="text-sm">{message}</p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={() => {
            action.onClick()
            toast.dismiss(t)
          }}
        >
          {action.label}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => toast.dismiss(t)}
        >
          ปิด / Dismiss
        </Button>
      </div>
    </div>
  ), { duration: Infinity })
}
```

### Progress Toast

```typescript
// components/toast/progress-toast.tsx
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'

export function showProgressToast(title: string, progress: number) {
  toast.custom(
    <div className="bg-background border rounded-lg p-4 shadow-lg w-80">
      <p className="text-sm font-medium mb-2">{title}</p>
      <Progress value={progress} />
      <p className="text-xs text-muted-foreground mt-1">{progress}%</p>
    </div>,
    { duration: Infinity }
  )
}
```

---

## Toast Hook for Server Actions

```typescript
// hooks/use-action-toast.ts
'use client'

import { useCallback } from 'react'
import { toast, toastMessages } from '@/lib/toast'

interface ActionResult {
  success?: boolean
  error?: string
  code?: string
}

export function useActionToast() {
  const handleResult = useCallback((result: ActionResult, options?: {
    onSuccess?: () => void
    onError?: (error: string) => void
  }) => {
    if (result.success) {
      toast.success('', { bilingual: toastMessages.saved })
      options?.onSuccess?.()
    } else {
      const message = result.code === 'UNAUTHORIZED'
        ? toastMessages.unauthorized
        : { ...toastMessages.error, th: { ...toastMessages.error.th, description: result.error || toastMessages.error.th.description } }

      toast.error('', {
        bilingual: message,
        description: result.error
      })
      options?.onError?.(result.error || 'Unknown error')
    }
  }, [])

  return { handleResult }
}

// Usage
function MyComponent() {
  const { handleResult } = useActionToast()

  const handleSave = async () => {
    const result = await saveItem(data)
    handleResult(result, {
      onSuccess: () => router.push('/items')
    })
  }
}
```

---

## Toast for Specific Operations

```typescript
// lib/toast-presets.ts
import { toast, toastMessages } from '@/lib/toast'

export const inventoryToast = {
  created: () => toast.success('', {
    bilingual: {
      th: { title: 'เพิ่มสินค้าสำเร็จ', description: 'ข้อมูลสินค้าถูกบันทึกแล้ว' },
      en: { title: 'Item created', description: 'Item has been added to inventory' }
    }
  }),

  updated: () => toast.success('', {
    bilingual: toastMessages.updated
  }),

  deleted: () => toast.success('', {
    bilingual: toastMessages.deleted
  }),

  lowStock: (itemName: string) => toast.warning('', {
    bilingual: {
      th: { title: 'สต็อกต่ำ', description: `${itemName} มีจำนวนต่ำกว่ากำหนด` },
      en: { title: 'Low Stock', description: `${itemName} is below minimum quantity` }
    }
  }),

  stockAdjusted: (itemName: string, qty: number) => toast.info('', {
    bilingual: {
      th: { title: 'ปรับปรุงสต็อก', description: `${itemName}: ${qty > 0 ? '+' : ''}${qty}` },
      en: { title: 'Stock Adjusted', description: `${itemName}: ${qty > 0 ? '+' : ''}${qty}` }
    }
  })
}

export const requestToast = {
  submitted: () => toast.success('', {
    bilingual: {
      th: { title: 'ส่งคำขอสำเร็จ', description: 'คำขอของคุณรอการอนุมัติ' },
      en: { title: 'Request submitted', description: 'Your request is pending approval' }
    }
  }),

  approved: () => toast.success('', {
    bilingual: {
      th: { title: 'อนุมัติสำเร็จ', description: 'คำขอได้รับการอนุมัติแล้ว' },
      en: { title: 'Approved', description: 'Request has been approved' }
    }
  }),

  rejected: () => toast.error('', {
    bilingual: {
      th: { title: 'ปฏิเสธคำขอ', description: 'คำขอถูกปฏิเสธ' },
      en: { title: 'Rejected', description: 'Request has been rejected' }
    }
  })
}

export const userToast = {
  created: () => toast.success('', {
    bilingual: {
      th: { title: 'สร้างผู้ใช้สำเร็จ', description: 'บัญชีผู้ใช้ถูกสร้างแล้ว' },
      en: { title: 'User created', description: 'User account has been created' }
    }
  }),

  passwordChanged: () => toast.success('', {
    bilingual: {
      th: { title: 'เปลี่ยนรหัสผ่านสำเร็จ', description: 'รหัสผ่านใหม่มีผลแล้ว' },
      en: { title: 'Password changed', description: 'New password is now active' }
    }
  }),

  roleUpdated: () => toast.success('', {
    bilingual: {
      th: { title: 'อัพเดทสิทธิ์สำเร็จ', description: 'สิทธิ์ผู้ใช้ถูกเปลี่ยนแล้ว' },
      en: { title: 'Roles updated', description: 'User roles have been changed' }
    }
  })
}
```

---

## Layout Integration

```typescript
// app/layout.tsx
import { ToastProvider } from '@/components/providers/toast-provider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
