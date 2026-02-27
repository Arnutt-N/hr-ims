---
name: batch-edit
description: Batch edit and inline editing for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["batch edit", "inline edit", "bulk edit", "quick edit", "multi edit"]
  file_patterns: ["*batch-edit*", "*inline-edit*", "*bulk-edit*"]
  context: batch editing, inline editing, bulk modifications, quick updates
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# Batch Edit and Inline Editing

## Core Role

Implement batch edit and inline editing functionality for HR-IMS:
- Bulk edit selected items
- Inline editing in tables
- Quick edit modals
- Field-level batch updates

---

## Batch Edit Service

```typescript
// lib/batch-edit/service.ts
import prisma from '@/lib/prisma'
import { createAuditLog, AuditAction } from '@/lib/audit/logger'

export interface BatchEditField {
  field: string
  operation: 'set' | 'increment' | 'decrement' | 'multiply' | 'append' | 'clear'
  value?: any
}

export interface BatchEditOptions {
  userId: number
  itemIds: number[]
  fields: BatchEditField[]
  reason?: string
}

// Apply batch edit to items
export async function applyBatchEdit(options: BatchEditOptions) {
  const { userId, itemIds, fields, reason } = options

  // Get current state for audit
  const itemsBefore = await prisma.inventoryItem.findMany({
    where: { id: { in: itemIds } }
  })

  // Build update data based on operations
  const updateData: Record<string, any> = {}

  for (const field of fields) {
    switch (field.operation) {
      case 'set':
        updateData[field.field] = field.value
        break

      case 'increment':
        // Will be handled in raw query
        break

      case 'decrement':
        // Will be handled in raw query
        break

      case 'multiply':
        // Will be handled in raw query
        break

      case 'append':
        updateData[field.field] = prisma.raw(
          `COALESCE(${field.field}, '') || ${prisma.escape(field.value)}`
        )
        break

      case 'clear':
        updateData[field.field] = null
        break
    }
  }

  // Execute update
  let updatedCount = 0

  if (Object.keys(updateData).length > 0) {
    // Handle special operations with raw query
    const specialOps = fields.filter(f =>
      ['increment', 'decrement', 'multiply'].includes(f.operation)
    )

    if (specialOps.length > 0) {
      for (const op of specialOps) {
        let sqlExpr = op.field

        switch (op.operation) {
          case 'increment':
            sqlExpr = `${op.field} + ${Number(op.value)}`
            break
          case 'decrement':
            sqlExpr = `${op.field} - ${Number(op.value)}`
            break
          case 'multiply':
            sqlExpr = `${op.field} * ${Number(op.value)}`
            break
        }

        await prisma.$executeRawUnsafe(
          `UPDATE InventoryItem SET ${op.field} = ${sqlExpr} WHERE id IN (${itemIds.join(',')})`
        )
      }
    }

    // Update other fields
    const regularFields = fields.filter(f =>
      !['increment', 'decrement', 'multiply'].includes(f.operation)
    )

    if (regularFields.length > 0) {
      const regularUpdateData: Record<string, any> = {}
      for (const f of regularFields) {
        regularUpdateData[f.field] = updateData[f.field]
      }

      const result = await prisma.inventoryItem.updateMany({
        where: { id: { in: itemIds } },
        data: regularUpdateData
      })
      updatedCount = result.count
    }
  }

  // Get updated state for audit
  const itemsAfter = await prisma.inventoryItem.findMany({
    where: { id: { in: itemIds } }
  })

  // Create audit logs
  for (let i = 0; i < itemsBefore.length; i++) {
    await createAuditLog({
      action: AuditAction.UPDATE,
      tableName: 'InventoryItem',
      recordId: itemsBefore[i].id,
      userId,
      oldData: itemsBefore[i],
      newData: {
        ...itemsAfter.find(a => a.id === itemsBefore[i].id),
        batchEditReason: reason
      }
    })
  }

  return {
    updatedCount,
    itemIds,
    changes: fields
  }
}

// Preview batch edit changes
export async function previewBatchEdit(options: Omit<BatchEditOptions, 'userId'>) {
  const { itemIds, fields } = options

  const items = await prisma.inventoryItem.findMany({
    where: { id: { in: itemIds } },
    select: {
      id: true,
      name: true,
      serialNumber: true,
      quantity: true,
      price: true,
      status: true,
      categoryId: true,
      warehouseId: true,
      location: true
    }
  })

  return items.map(item => {
    const changes: Record<string, { before: any; after: any }> = {}

    for (const field of fields) {
      const currentValue = (item as any)[field.field]

      switch (field.operation) {
        case 'set':
          changes[field.field] = {
            before: currentValue,
            after: field.value
          }
          break

        case 'increment':
          changes[field.field] = {
            before: currentValue,
            after: Number(currentValue || 0) + Number(field.value)
          }
          break

        case 'decrement':
          changes[field.field] = {
            before: currentValue,
            after: Number(currentValue || 0) - Number(field.value)
          }
          break

        case 'multiply':
          changes[field.field] = {
            before: currentValue,
            after: Number(currentValue || 0) * Number(field.value)
          }
          break

        case 'append':
          changes[field.field] = {
            before: currentValue,
            after: (currentValue || '') + field.value
          }
          break

        case 'clear':
          changes[field.field] = {
            before: currentValue,
            after: null
          }
          break
      }
    }

    return {
      id: item.id,
      name: item.name,
      changes
    }
  })
}

// Get editable fields configuration
export function getEditableFields() {
  return [
    {
      field: 'status',
      label: 'Status',
      labelTh: 'สถานะ',
      type: 'select',
      options: ['AVAILABLE', 'BORROWED', 'MAINTENANCE', 'RETIRED'],
      operations: ['set']
    },
    {
      field: 'categoryId',
      label: 'Category',
      labelTh: 'หมวดหมู่',
      type: 'relation',
      relation: 'category',
      operations: ['set']
    },
    {
      field: 'warehouseId',
      label: 'Warehouse',
      labelTh: 'คลังสินค้า',
      type: 'relation',
      relation: 'warehouse',
      operations: ['set']
    },
    {
      field: 'location',
      label: 'Location',
      labelTh: 'ตำแหน่ง',
      type: 'text',
      operations: ['set', 'append', 'clear']
    },
    {
      field: 'quantity',
      label: 'Quantity',
      labelTh: 'จำนวน',
      type: 'number',
      operations: ['set', 'increment', 'decrement', 'multiply']
    },
    {
      field: 'price',
      label: 'Price',
      labelTh: 'ราคา',
      type: 'number',
      operations: ['set', 'increment', 'decrement', 'multiply']
    },
    {
      field: 'condition',
      label: 'Condition',
      labelTh: 'สภาพ',
      type: 'select',
      options: ['NEW', 'GOOD', 'FAIR', 'POOR'],
      operations: ['set']
    }
  ]
}
```

---

## Batch Edit Dialog Component

```typescript
// components/batch-edit/batch-edit-dialog.tsx
'use client'

import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Edit3, Eye, Plus, Trash2, Loader2 } from 'lucide-react'
import { getEditableFields, previewBatchEdit, applyBatchEdit } from '@/lib/batch-edit/service'

interface BatchEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemIds: number[]
  userId: number
  onSuccess?: () => void
}

interface EditRule {
  field: string
  operation: string
  value: any
}

export function BatchEditDialog({
  open,
  onOpenChange,
  itemIds,
  userId,
  onSuccess
}: BatchEditDialogProps) {
  const { locale } = useI18n()
  const [editRules, setEditRules] = useState<EditRule[]>([])
  const [reason, setReason] = useState('')
  const [preview, setPreview] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('edit')

  const editableFields = getEditableFields()

  // Load preview when rules change
  useEffect(() => {
    if (editRules.length > 0 && activeTab === 'preview') {
      loadPreview()
    }
  }, [editRules, activeTab])

  const loadPreview = async () => {
    const data = await previewBatchEdit({ itemIds, fields: editRules })
    setPreview(data)
  }

  const addRule = () => {
    setEditRules([...editRules, { field: '', operation: 'set', value: '' }])
  }

  const updateRule = (index: number, updates: Partial<EditRule>) => {
    const newRules = [...editRules]
    newRules[index] = { ...newRules[index], ...updates }
    setEditRules(newRules)
  }

  const removeRule = (index: number) => {
    setEditRules(editRules.filter((_, i) => i !== index))
  }

  const getFieldConfig = (fieldName: string) => {
    return editableFields.find(f => f.field === fieldName)
  }

  const getOperationLabel = (op: string): string => {
    const labels: Record<string, { en: string; th: string }> = {
      set: { en: 'Set to', th: 'ตั้งเป็น' },
      increment: { en: 'Increase by', th: 'เพิ่มขึ้น' },
      decrement: { en: 'Decrease by', th: 'ลดลง' },
      multiply: { en: 'Multiply by', th: 'คูณด้วย' },
      append: { en: 'Append', th: 'เพิ่มต่อท้าย' },
      clear: { en: 'Clear', th: 'ล้าง' }
    }
    return locale === 'th' ? labels[op]?.th : labels[op]?.en
  }

  const handleApply = async () => {
    if (editRules.length === 0) return

    setLoading(true)
    try {
      await applyBatchEdit({
        userId,
        itemIds,
        fields: editRules,
        reason: reason || undefined
      })

      onSuccess?.()
      onOpenChange(false)

      // Reset state
      setEditRules([])
      setReason('')
      setPreview([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {locale === 'th' ? 'แก้ไขหลายรายการ' : 'Batch Edit'}
          </DialogTitle>
          <DialogDescription>
            {locale === 'th'
              ? `แก้ไข ${itemIds.length} รายการที่เลือก`
              : `Edit ${itemIds.length} selected items`}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="edit">
              <Edit3 className="h-4 w-4 mr-2" />
              {locale === 'th' ? 'แก้ไข' : 'Edit'}
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={editRules.length === 0}>
              <Eye className="h-4 w-4 mr-2" />
              {locale === 'th' ? 'ดูตัวอย่าง' : 'Preview'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-4 mt-4">
            {/* Edit rules */}
            <div className="space-y-3">
              {editRules.map((rule, index) => {
                const fieldConfig = getFieldConfig(rule.field)

                return (
                  <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                    {/* Field selector */}
                    <Select
                      value={rule.field}
                      onValueChange={(v) => updateRule(index, { field: v })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder={locale === 'th' ? 'เลือกฟิลด์' : 'Select field'} />
                      </SelectTrigger>
                      <SelectContent>
                        {editableFields.map((f) => (
                          <SelectItem key={f.field} value={f.field}>
                            {locale === 'th' ? f.labelTh : f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Operation selector */}
                    {fieldConfig && (
                      <Select
                        value={rule.operation}
                        onValueChange={(v) => updateRule(index, { operation: v })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldConfig.operations.map((op) => (
                            <SelectItem key={op} value={op}>
                              {getOperationLabel(op)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Value input */}
                    {fieldConfig && rule.operation !== 'clear' && (
                      <>
                        {fieldConfig.type === 'select' && (
                          <Select
                            value={rule.value}
                            onValueChange={(v) => updateRule(index, { value: v })}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder={locale === 'th' ? 'เลือก' : 'Select'} />
                            </SelectTrigger>
                            <SelectContent>
                              {fieldConfig.options?.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {(fieldConfig.type === 'text' || fieldConfig.type === 'number') && (
                          <Input
                            type={fieldConfig.type === 'number' ? 'number' : 'text'}
                            value={rule.value}
                            onChange={(e) => updateRule(index, { value: e.target.value })}
                            className="w-40"
                          />
                        )}
                      </>
                    )}

                    {/* Remove button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRule(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>

            {/* Add rule button */}
            <Button variant="outline" onClick={addRule}>
              <Plus className="h-4 w-4 mr-2" />
              {locale === 'th' ? 'เพิ่มการแก้ไข' : 'Add Edit Rule'}
            </Button>

            {/* Reason */}
            <div className="space-y-2">
              <Label>{locale === 'th' ? 'เหตุผล (ไม่บังคับ)' : 'Reason (optional)'}</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={locale === 'th' ? 'อธิบายเหตุผลในการแก้ไข' : 'Explain the reason for this change'}
                rows={2}
              />
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {preview.map((item) => (
                  <div key={item.id} className="p-3 border rounded-lg">
                    <p className="font-medium mb-2">{item.name}</p>
                    <div className="space-y-1">
                      {Object.entries(item.changes).map(([field, change]: [string, any]) => {
                        const fieldConfig = getFieldConfig(field)
                        return (
                          <div key={field} className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">
                              {locale === 'th' ? fieldConfig?.labelTh : fieldConfig?.label}:
                            </span>
                            <span className="line-through text-muted-foreground">
                              {change.before ?? '-'}
                            </span>
                            <span>→</span>
                            <span className="font-medium text-primary">
                              {change.after ?? '-'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {locale === 'th' ? 'ยกเลิก' : 'Cancel'}
          </Button>
          <Button
            onClick={handleApply}
            disabled={editRules.length === 0 || loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {locale === 'th' ? 'นำไปใช้' : 'Apply Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Inline Edit Component

```typescript
// components/batch-edit/inline-edit.tsx
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Check, X, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type EditableType = 'text' | 'number' | 'select' | 'date'

interface InlineEditProps<T> {
  value: T
  onSave: (value: T) => Promise<void>
  type?: EditableType
  options?: { value: string; label: string }[]
  displayValue?: (value: T) => string
  className?: string
  disabled?: boolean
  placeholder?: string
}

export function InlineEdit<T extends string | number>({
  value,
  onSave,
  type = 'text',
  options = [],
  displayValue,
  className,
  disabled = false,
  placeholder
}: InlineEditProps<T>) {
  const { locale } = useI18n()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState<T>(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEditValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = useCallback(async () => {
    if (editValue === value) {
      setIsEditing(false)
      return
    }

    setSaving(true)
    try {
      await onSave(editValue)
      setIsEditing(false)
    } catch (error) {
      setEditValue(value) // Reset on error
    } finally {
      setSaving(false)
    }
  }, [editValue, value, onSave])

  const handleCancel = useCallback(() => {
    setEditValue(value)
    setIsEditing(false)
  }, [value])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }, [handleSave, handleCancel])

  const formatDisplay = (): string => {
    if (displayValue) {
      return displayValue(value)
    }

    if (type === 'select' && options.length > 0) {
      const option = options.find(o => o.value === value)
      return option?.label || String(value)
    }

    if (value === null || value === undefined || value === '') {
      return placeholder || (locale === 'th' ? 'คลิกเพื่อแก้ไข' : 'Click to edit')
    }

    return String(value)
  }

  if (disabled) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        {formatDisplay()}
      </span>
    )
  }

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className={cn(
          "group flex items-center gap-1 px-1 py-0.5 -mx-1 -my-0.5 rounded",
          "hover:bg-muted/50 transition-colors",
          className
        )}
      >
        <span className={cn(
          (value === null || value === undefined || value === '') && "text-muted-foreground italic"
        )}>
          {formatDisplay()}
        </span>
        <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {type === 'select' ? (
        <Select
          value={String(editValue)}
          onValueChange={(v) => setEditValue(v as T)}
        >
          <SelectTrigger className="h-8 w-auto min-w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          ref={inputRef}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(
            type === 'number' ? Number(e.target.value) as T : e.target.value as T
          )}
          onKeyDown={handleKeyDown}
          className="h-8 w-auto min-w-[120px]"
          disabled={saving}
        />
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleSave}
        disabled={saving}
      >
        <Check className="h-4 w-4 text-green-500" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleCancel}
        disabled={saving}
      >
        <X className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  )
}
```

---

## Editable Table Cell

```typescript
// components/batch-edit/editable-cell.tsx
'use client'

import { InlineEdit } from './inline-edit'
import { useI18n } from '@/hooks/use-i18n'
import { TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface EditableCellProps {
  value: any
  field: string
  type?: 'text' | 'number' | 'select' | 'date'
  options?: { value: string; label: string }[]
  itemId: number
  onSave: (itemId: number, field: string, value: any) => Promise<void>
  render?: (value: any) => React.ReactNode
}

export function EditableCell({
  value,
  field,
  type = 'text',
  options = [],
  itemId,
  onSave,
  render
}: EditableCellProps) {
  const { locale } = useI18n()

  const handleSave = async (newValue: any) => {
    await onSave(itemId, field, newValue)
  }

  // Custom render for special fields
  if (field === 'status' && render) {
    return (
      <TableCell>
        <InlineEdit
          value={value}
          onSave={handleSave}
          type="select"
          options={options}
          displayValue={(v) => v}
        />
      </TableCell>
    )
  }

  if (render) {
    return <TableCell>{render(value)}</TableCell>
  }

  return (
    <TableCell>
      <InlineEdit
        value={value}
        onSave={handleSave}
        type={type}
        options={options}
      />
    </TableCell>
  )
}
```

---

## Usage Examples

```tsx
// Example 1: Batch edit dialog
import { BatchEditDialog } from '@/components/batch-edit/batch-edit-dialog'

function InventoryTable({ session }) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showBatchEdit, setShowBatchEdit] = useState(false)

  return (
    <div>
      <Button
        onClick={() => setShowBatchEdit(true)}
        disabled={selectedIds.length < 2}
      >
        <Edit3 className="h-4 w-4 mr-2" />
        Batch Edit ({selectedIds.length})
      </Button>

      <BatchEditDialog
        open={showBatchEdit}
        onOpenChange={setShowBatchEdit}
        itemIds={selectedIds}
        userId={parseInt(session.user.id)}
        onSuccess={() => {
          refetch()
          setSelectedIds([])
        }}
      />

      {/* Table... */}
    </div>
  )
}

// Example 2: Inline edit in table
import { InlineEdit } from '@/components/batch-edit/inline-edit'
import { updateItem } from '@/lib/actions/inventory'

function InventoryTableRow({ item, onUpdate }) {
  const handleFieldSave = async (field: string, value: any) => {
    await updateItem(item.id, { [field]: value })
    onUpdate()
  }

  const statusOptions = [
    { value: 'AVAILABLE', label: 'Available' },
    { value: 'BORROWED', label: 'Borrowed' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'RETIRED', label: 'Retired' }
  ]

  return (
    <TableRow>
      <TableCell>
        <InlineEdit
          value={item.name}
          onSave={(v) => handleFieldSave('name', v)}
        />
      </TableCell>

      <TableCell>
        <InlineEdit
          value={item.quantity}
          type="number"
          onSave={(v) => handleFieldSave('quantity', v)}
        />
      </TableCell>

      <TableCell>
        <InlineEdit
          value={item.status}
          type="select"
          options={statusOptions}
          onSave={(v) => handleFieldSave('status', v)}
          displayValue={(v) => (
            <Badge variant={v === 'AVAILABLE' ? 'default' : 'secondary'}>
              {v}
            </Badge>
          )}
        />
      </TableCell>
    </TableRow>
  )
}

// Example 3: Quick status change
async function quickStatusChange(itemIds: number[], newStatus: string, userId: number) {
  return applyBatchEdit({
    userId,
    itemIds,
    fields: [{ field: 'status', operation: 'set', value: newStatus }],
    reason: 'Quick status update'
  })
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
