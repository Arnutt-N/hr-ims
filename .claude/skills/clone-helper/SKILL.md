---
name: clone-helper
description: Clone and duplicate items functionality for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["clone", "duplicate", "copy", "replicate", "make copy"]
  file_patterns: ["*clone*", "*duplicate*", "*copy*"]
  context: cloning items, duplicating records, making copies
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# Clone and Duplicate Helper

## Core Role

Implement clone and duplicate functionality for HR-IMS:
- Clone inventory items
- Duplicate requests
- Copy templates
- Clone with modifications

---

## Clone Service

```typescript
// lib/clone/service.ts
import prisma from '@/lib/prisma'
import { AuditAction, createAuditLog } from '@/lib/audit/logger'

export interface CloneOptions {
  userId: number
  excludeFields?: string[]
  modifyFields?: Record<string, any>
  includeRelated?: boolean
  prefix?: string
}

// Clone inventory item
export async function cloneInventoryItem(
  sourceId: number,
  options: CloneOptions
): Promise<{ id: number; name: string }> {
  const source = await prisma.inventoryItem.findUnique({
    where: { id: sourceId },
    include: {
      category: { select: { id: true, name: true } },
      warehouse: { select: { id: true, name: true } }
    }
  })

  if (!source) {
    throw new Error('Item not found')
  }

  // Fields to exclude by default
  const excludeFields = new Set([
    'id',
    'createdAt',
    'updatedAt',
    'qrCode',
    'barcode',
    ...options.excludeFields || []
  ])

  // Build new item data
  const newItemData: Record<string, any> = {}

  Object.entries(source).forEach(([key, value]) => {
    if (!excludeFields.has(key)) {
      newItemData[key] = value
    }
  })

  // Apply modifications
  if (options.modifyFields) {
    Object.assign(newItemData, options.modifyFields)
  }

  // Add prefix to name
  if (options.prefix !== undefined) {
    newItemData.name = options.prefix + source.name
  } else {
    newItemData.name = `Copy of ${source.name}`
  }

  // Generate new serial number
  if (!options.modifyFields?.serialNumber) {
    newItemData.serialNumber = await generateUniqueSerialNumber(source.serialNumber)
  }

  // Create new item
  const newItem = await prisma.inventoryItem.create({
    data: newItemData
  })

  // Create audit log
  await createAuditLog({
    action: AuditAction.CREATE,
    tableName: 'InventoryItem',
    recordId: newItem.id,
    userId: options.userId,
    oldData: null,
    newData: {
      ...newItem,
      clonedFrom: sourceId
    }
  })

  // Clone related stock levels if requested
  if (options.includeRelated) {
    const stockLevels = await prisma.stockLevel.findMany({
      where: { itemId: sourceId }
    })

    for (const stock of stockLevels) {
      await prisma.stockLevel.create({
        data: {
          itemId: newItem.id,
          warehouseId: stock.warehouseId,
          quantity: 0, // Start with 0 for cloned items
          minQuantity: stock.minQuantity,
          maxQuantity: stock.maxQuantity
        }
      })
    }
  }

  return { id: newItem.id, name: newItem.name }
}

// Clone request with items
export async function cloneRequest(
  sourceId: number,
  options: CloneOptions
): Promise<{ id: number; requestCode: string }> {
  const source = await prisma.request.findUnique({
    where: { id: sourceId },
    include: {
      items: {
        include: {
          item: { select: { id: true, name: true } }
        }
      }
    }
  })

  if (!source) {
    throw new Error('Request not found')
  }

  // Generate new request code
  const newRequestCode = await generateUniqueRequestCode()

  // Create new request
  const newRequest = await prisma.request.create({
    data: {
      requestCode: newRequestCode,
      userId: options.userId,
      type: source.type,
      status: 'PENDING', // Always start as pending
      notes: source.notes,
      priority: source.priority,
      dueDate: source.dueDate,
      warehouseId: source.warehouseId,
      // Don't copy approval data
      approvedById: null,
      approvedAt: null,
      rejectedById: null,
      rejectedAt: null,
      rejectionReason: null
    }
  })

  // Clone request items
  for (const item of source.items) {
    await prisma.requestItem.create({
      data: {
        requestId: newRequest.id,
        itemId: item.itemId,
        quantity: item.quantity,
        notes: item.notes
      }
    })
  }

  // Create audit log
  await createAuditLog({
    action: AuditAction.CREATE,
    tableName: 'Request',
    recordId: newRequest.id,
    userId: options.userId,
    oldData: null,
    newData: {
      ...newRequest,
      clonedFrom: sourceId
    }
  })

  return { id: newRequest.id, requestCode: newRequestCode }
}

// Clone user (for creating similar users)
export async function cloneUser(
  sourceId: number,
  options: CloneOptions & { newEmail: string; newName: string }
): Promise<{ id: number; email: string }> {
  const source = await prisma.user.findUnique({
    where: { id: sourceId },
    include: {
      userRoles: { include: { role: true } },
      department: { select: { id: true } }
    }
  })

  if (!source) {
    throw new Error('User not found')
  }

  // Check email uniqueness
  const existingUser = await prisma.user.findUnique({
    where: { email: options.newEmail }
  })

  if (existingUser) {
    throw new Error('Email already exists')
  }

  // Create new user
  const newUser = await prisma.user.create({
    data: {
      email: options.newEmail,
      name: options.newName,
      password: source.password, // Will need to be changed on first login
      status: 'ACTIVE',
      departmentId: source.departmentId,
      avatar: source.avatar,
      phone: options.modifyFields?.phone || null,
      requirePasswordChange: true // Force password change
    }
  })

  // Clone roles
  for (const userRole of source.userRoles) {
    await prisma.userRole.create({
      data: {
        userId: newUser.id,
        roleId: userRole.roleId
      }
    })
  }

  // Create audit log
  await createAuditLog({
    action: AuditAction.CREATE,
    tableName: 'User',
    recordId: newUser.id,
    userId: options.userId,
    oldData: null,
    newData: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      clonedFrom: sourceId
    }
  })

  return { id: newUser.id, email: newUser.email }
}

// Helper: Generate unique serial number
async function generateUniqueSerialNumber(original: string | null): Promise<string> {
  const base = original || 'ITEM'
  const timestamp = Date.now().toString(36).toUpperCase()

  let serialNumber = `${base}-${timestamp}`
  let counter = 1

  while (await prisma.inventoryItem.findFirst({ where: { serialNumber } })) {
    serialNumber = `${base}-${timestamp}-${counter}`
    counter++
  }

  return serialNumber
}

// Helper: Generate unique request code
async function generateUniqueRequestCode(): Promise<string> {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const prefix = `REQ${year}${month}`

  const lastRequest = await prisma.request.findFirst({
    where: { requestCode: { startsWith: prefix } },
    orderBy: { requestCode: 'desc' }
  })

  let nextNum = 1
  if (lastRequest) {
    const lastNum = parseInt(lastRequest.requestCode.slice(-4))
    nextNum = lastNum + 1
  }

  return `${prefix}${nextNum.toString().padStart(4, '0')}`
}

// Batch clone items
export async function batchCloneItems(
  itemIds: number[],
  options: CloneOptions
): Promise<Array<{ sourceId: number; newItemId: number; name: string }>> {
  const results = []

  for (const sourceId of itemIds) {
    try {
      const newItem = await cloneInventoryItem(sourceId, options)
      results.push({
        sourceId,
        newItemId: newItem.id,
        name: newItem.name
      })
    } catch (error) {
      results.push({
        sourceId,
        newItemId: -1,
        name: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return results
}
```

---

## Clone Button Component

```typescript
// components/clone/clone-button.tsx
'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Copy, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CloneButtonProps {
  type: 'item' | 'request' | 'user'
  sourceId: number
  sourceName: string
  onClone: (options: CloneDialogOptions) => Promise<{ id: number }>
  onSuccess?: (newId: number) => void
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

interface CloneDialogOptions {
  prefix?: string
  includeRelated?: boolean
  modifyFields?: Record<string, any>
}

export function CloneButton({
  type,
  sourceId,
  sourceName,
  onClone,
  onSuccess,
  variant = 'outline',
  size = 'sm'
}: CloneButtonProps) {
  const { locale } = useI18n()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [prefix, setPrefix] = useState('')
  const [includeRelated, setIncludeRelated] = useState(false)

  const typeLabels = {
    item: { en: 'Item', th: 'พัสดุ' },
    request: { en: 'Request', th: 'คำขอ' },
    user: { en: 'User', th: 'ผู้ใช้' }
  }

  const typeLabel = locale === 'th' ? typeLabels[type].th : typeLabels[type].en

  const handleClone = async () => {
    setLoading(true)
    try {
      const result = await onClone({
        prefix: prefix || undefined,
        includeRelated
      })

      setOpen(false)

      if (onSuccess) {
        onSuccess(result.id)
      } else {
        // Navigate to new item
        router.push(`/${type === 'item' ? 'inventory' : type === 'request' ? 'requests' : 'users'}/${result.id}`)
      }
    } catch (error) {
      console.error('Clone failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Copy className="h-4 w-4 mr-2" />
          {locale === 'th' ? 'คัดลอก' : 'Clone'}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {locale === 'th' ? `คัดลอก${typeLabel}` : `Clone ${typeLabel}`}
          </DialogTitle>
          <DialogDescription>
            {locale === 'th'
              ? `สร้างสำเนาของ "${sourceName}"`
              : `Create a copy of "${sourceName}"`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {type === 'item' && (
            <div className="space-y-2">
              <Label>
                {locale === 'th' ? 'คำนำหน้าชื่อ' : 'Name Prefix'}
              </Label>
              <Input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder={locale === 'th' ? 'เว้นว่างเพื่อใช้ "Copy of"' : 'Leave empty for "Copy of"'}
              />
              <p className="text-xs text-muted-foreground">
                {locale === 'th'
                  ? 'ผลลัพธ์: [คำนำหน้า][ชื่อเดิม]'
                  : 'Result: [prefix][original name]'}
              </p>
            </div>
          )}

          {type === 'item' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-related"
                checked={includeRelated}
                onCheckedChange={(checked) => setIncludeRelated(checked as boolean)}
              />
              <Label htmlFor="include-related" className="text-sm font-normal">
                {locale === 'th'
                  ? 'คัดลอกการตั้งค่าสต็อกด้วย'
                  : 'Include stock level settings'}
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {locale === 'th' ? 'ยกเลิก' : 'Cancel'}
          </Button>
          <Button onClick={handleClone} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {locale === 'th' ? 'คัดลอก' : 'Clone'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Batch Clone Dialog

```typescript
// components/clone/batch-clone-dialog.tsx
'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface BatchCloneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: Array<{ id: number; name: string }>
  onClone: (itemIds: number[]) => Promise<Array<{ sourceId: number; newItemId: number; name?: string; error?: string }>>
}

export function BatchCloneDialog({
  open,
  onOpenChange,
  items,
  onClone
}: BatchCloneDialogProps) {
  const { locale } = useI18n()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Array<{
    sourceId: number
    sourceName: string
    success: boolean
    newItemId?: number
    newName?: string
    error?: string
  }>>([])

  const handleClone = async () => {
    setLoading(true)
    setResults([])

    try {
      const cloneResults = await onClone(items.map(i => i.id))

      setResults(
        cloneResults.map((r, index) => ({
          sourceId: r.sourceId,
          sourceName: items.find(i => i.id === r.sourceId)?.name || '',
          success: r.newItemId > 0,
          newItemId: r.newItemId,
          newName: r.name,
          error: r.error
        }))
      )
    } catch (error) {
      console.error('Batch clone failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {locale === 'th' ? 'คัดลอกหลายรายการ' : 'Batch Clone'}
          </DialogTitle>
          <DialogDescription>
            {locale === 'th'
              ? `คัดลอก ${items.length} รายการที่เลือก`
              : `Clone ${items.length} selected items`}
          </DialogDescription>
        </DialogHeader>

        {results.length === 0 ? (
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              {locale === 'th'
                ? 'รายการที่จะคัดลอก:'
                : 'Items to clone:'}
            </p>
            <ScrollArea className="h-40">
              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item.id} className="text-sm">
                    • {item.name}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        ) : (
          <div className="py-4">
            <div className="flex gap-2 mb-4">
              {successCount > 0 && (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {successCount} {locale === 'th' ? 'สำเร็จ' : 'success'}
                </Badge>
              )}
              {failCount > 0 && (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  {failCount} {locale === 'th' ? 'ล้มเหลว' : 'failed'}
                </Badge>
              )}
            </div>

            <ScrollArea className="h-40">
              <ul className="space-y-2">
                {results.map((r) => (
                  <li
                    key={r.sourceId}
                    className="flex items-center gap-2 text-sm"
                  >
                    {r.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="flex-1 truncate">{r.sourceName}</span>
                    {r.success && r.newName && (
                      <span className="text-xs text-muted-foreground">
                        → {r.newName}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setResults([])
              onOpenChange(false)
            }}
          >
            {results.length > 0
              ? locale === 'th' ? 'ปิด' : 'Close'
              : locale === 'th' ? 'ยกเลิก' : 'Cancel'}
          </Button>
          {results.length === 0 && (
            <Button onClick={handleClone} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {locale === 'th' ? 'คัดลอก' : 'Clone'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Usage Examples

```tsx
// Example 1: Clone button on inventory item
import { CloneButton } from '@/components/clone/clone-button'
import { cloneInventoryItem } from '@/lib/clone/service'

function ItemDetailPage({ item, session }) {
  const handleClone = async (options) => {
    return cloneInventoryItem(item.id, {
      userId: parseInt(session.user.id),
      prefix: options.prefix,
      includeRelated: options.includeRelated
    })
  }

  return (
    <div>
      <h1>{item.name}</h1>

      <CloneButton
        type="item"
        sourceId={item.id}
        sourceName={item.name}
        onClone={handleClone}
      />
    </div>
  )
}

// Example 2: Clone request
function RequestDetailPage({ request, session }) {
  const handleClone = async (options) => {
    return cloneRequest(request.id, {
      userId: parseInt(session.user.id)
    })
  }

  return (
    <div>
      <CloneButton
        type="request"
        sourceId={request.id}
        sourceName={request.requestCode}
        onClone={handleClone}
      />
    </div>
  )
}

// Example 3: Batch clone in inventory table
import { BatchCloneDialog } from '@/components/clone/batch-clone-dialog'
import { batchCloneItems } from '@/lib/clone/service'

function InventoryTable({ session }) {
  const [selectedItems, setSelectedItems] = useState([])
  const [showCloneDialog, setShowCloneDialog] = useState(false)

  const handleBatchClone = async (itemIds: number[]) => {
    return batchCloneItems(itemIds, {
      userId: parseInt(session.user.id)
    })
  }

  return (
    <div>
      <Button
        onClick={() => setShowCloneDialog(true)}
        disabled={selectedItems.length === 0}
      >
        <Copy className="h-4 w-4 mr-2" />
        Clone Selected ({selectedItems.length})
      </Button>

      <BatchCloneDialog
        open={showCloneDialog}
        onOpenChange={setShowCloneDialog}
        items={selectedItems}
        onClone={handleBatchClone}
      />
    </div>
  )
}

// Example 4: Quick clone with default options
async function quickCloneItem(itemId: number, userId: number) {
  return cloneInventoryItem(itemId, {
    userId,
    prefix: '',
    includeRelated: false
  })
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
