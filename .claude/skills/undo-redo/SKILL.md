---
name: undo-redo
description: Undo/Redo operations for HR-IMS forms and actions
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["undo", "redo", "revert", "restore", "history", "rollback"]
  file_patterns: ["*undo*", "*redo*", "*history*"]
  context: undo operations, redo actions, state history, form recovery
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# Undo/Redo Operations

## Core Role

Implement undo/redo functionality for HR-IMS:
- Form state history
- Action history with rollback
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- Visual history timeline

---

## Undo/Redo Hook

```typescript
// hooks/use-undo-redo.ts
'use client'

import { useState, useCallback, useRef } from 'react'

export interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

export interface UndoRedoActions<T> {
  undo: () => void
  redo: () => void
  set: (newPresent: T) => void
  reset: (newPresent: T) => void
  canUndo: boolean
  canRedo: boolean
  history: {
    past: T[]
    present: T
    future: T[]
  }
}

export function useUndoRedo<T>(
  initialPresent: T,
  options: {
    maxHistory?: number
    onUndo?: (state: T) => void
    onRedo?: (state: T) => void
  } = {}
): UndoRedoActions<T> {
  const { maxHistory = 50, onUndo, onRedo } = options

  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialPresent,
    future: []
  })

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev

      const previous = prev.past[prev.past.length - 1]
      const newPast = prev.past.slice(0, prev.past.length - 1)

      const newState = {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future]
      }

      onUndo?.(previous)
      return newState
    })
  }, [onUndo])

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev

      const next = prev.future[0]
      const newFuture = prev.future.slice(1)

      const newState = {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture
      }

      onRedo?.(next)
      return newState
    })
  }, [onRedo])

  const set = useCallback((newPresent: T) => {
    setHistory((prev) => {
      // Don't add to history if value is the same
      if (JSON.stringify(prev.present) === JSON.stringify(newPresent)) {
        return prev
      }

      const newPast = [...prev.past, prev.present].slice(-maxHistory)

      return {
        past: newPast,
        present: newPresent,
        future: [] // Clear future on new action
      }
    })
  }, [maxHistory])

  const reset = useCallback((newPresent: T) => {
    setHistory({
      past: [],
      present: newPresent,
      future: []
    })
  }, [])

  return {
    undo,
    redo,
    set,
    reset,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    history
  }
}

// Form-specific undo/redo hook
export interface FormState {
  [key: string]: any
}

export function useFormUndoRedo(
  initialState: FormState,
  options: {
    maxHistory?: number
    debounceMs?: number
  } = {}
) {
  const { maxHistory = 30, debounceMs = 500 } = options
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const pendingStateRef = useRef<FormState | null>(null)

  const { undo, redo, set, reset, canUndo, canRedo, history } = useUndoRedo(
    initialState,
    { maxHistory }
  )

  // Debounced set for form inputs
  const debouncedSet = useCallback((newState: FormState) => {
    pendingStateRef.current = newState

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      if (pendingStateRef.current) {
        set(pendingStateRef.current)
      }
    }, debounceMs)
  }, [set])

  // Immediate set for important actions
  const immediateSet = useCallback((newState: FormState) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    set(newState)
  }, [set])

  return {
    undo,
    redo,
    set: debouncedSet,
    immediateSet,
    reset,
    canUndo,
    canRedo,
    history
  }
}
```

---

## Action History Service

```typescript
// lib/undo/service.ts
import prisma from '@/lib/prisma'

export interface ActionHistory {
  id: number
  userId: number
  action: string
  tableName: string
  recordId: number
  oldData: any
  newData: any
  canUndo: boolean
  undoneAt: Date | null
  createdAt: Date
}

// Record action for potential undo
export async function recordAction(data: {
  userId: number
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  tableName: string
  recordId: number
  oldData: any
  newData: any
  canUndo?: boolean
}) {
  return prisma.actionHistory.create({
    data: {
      userId: data.userId,
      action: data.action,
      tableName: data.tableName,
      recordId: data.recordId,
      oldData: JSON.stringify(data.oldData),
      newData: JSON.stringify(data.newData),
      canUndo: data.canUndo ?? true
    }
  })
}

// Get recent actions for user
export async function getRecentActions(
  userId: number,
  options: { limit?: number; tableName?: string } = {}
): Promise<ActionHistory[]> {
  const actions = await prisma.actionHistory.findMany({
    where: {
      userId,
      undoneAt: null,
      canUndo: true,
      ...(options.tableName && { tableName: options.tableName })
    },
    orderBy: { createdAt: 'desc' },
    take: options.limit || 20
  })

  return actions.map(a => ({
    ...a,
    oldData: JSON.parse(a.oldData as string),
    newData: JSON.parse(a.newData as string)
  }))
}

// Undo an action
export async function undoAction(actionId: number, userId: number) {
  const action = await prisma.actionHistory.findFirst({
    where: { id: actionId, userId, undoneAt: null, canUndo: true }
  })

  if (!action) {
    throw new Error('Action not found or cannot be undone')
  }

  const oldData = JSON.parse(action.oldData as string)
  const newData = JSON.parse(action.newData as string)

  // Perform the reverse operation
  switch (action.action) {
    case 'CREATE':
      // Undo CREATE = DELETE
      await prisma.$executeRawUnsafe(
        `DELETE FROM ${action.tableName} WHERE id = ${action.recordId}`
      )
      break

    case 'UPDATE':
      // Undo UPDATE = restore old data
      const updateFields = Object.keys(oldData)
        .map(key => `${key} = @${key}`)
        .join(', ')

      await prisma.$executeRawUnsafe(
        `UPDATE ${action.tableName} SET ${updateFields} WHERE id = ${action.recordId}`,
        oldData
      )
      break

    case 'DELETE':
      // Undo DELETE = recreate
      const columns = Object.keys(oldData).join(', ')
      const values = Object.keys(oldData)
        .map(key => `@${key}`)
        .join(', ')

      await prisma.$executeRawUnsafe(
        `INSERT INTO ${action.tableName} (${columns}) VALUES (${values})`,
        oldData
      )
      break
  }

  // Mark as undone
  await prisma.actionHistory.update({
    where: { id: actionId },
    data: { undoneAt: new Date() }
  })

  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: 'UNDO',
      tableName: action.tableName,
      recordId: action.recordId,
      userId,
      oldData: action.newData,
      newData: action.oldData
    }
  })

  return { success: true, action }
}

// Get undo-able actions count
export async function getUndoableCount(userId: number): Promise<number> {
  return prisma.actionHistory.count({
    where: {
      userId,
      undoneAt: null,
      canUndo: true
    }
  })
}
```

---

## Undo/Redo Keyboard Handler

```typescript
// components/undo-redo/undo-redo-provider.tsx
'use client'

import { createContext, useContext, useEffect, useCallback } from 'react'
import { useUndoRedo, UndoRedoActions } from '@/hooks/use-undo-redo'

interface UndoRedoContextValue<T> extends UndoRedoActions<T> {
  isUndoRedoEnabled: boolean
}

const UndoRedoContext = createContext<UndoRedoContextValue<any> | null>(null)

interface UndoRedoProviderProps<T> {
  initialState: T
  children: React.ReactNode
  onStateChange?: (state: T) => void
  maxHistory?: number
  enabled?: boolean
}

export function UndoRedoProvider<T>({
  initialState,
  children,
  onStateChange,
  maxHistory = 50,
  enabled = true
}: UndoRedoProviderProps<T>) {
  const undoRedo = useUndoRedo(initialState, {
    maxHistory,
    onUndo: onStateChange,
    onRedo: onStateChange
  })

  // Global keyboard shortcuts
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if in input field
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Ctrl+Z/Y in input fields for native undo/redo
        return
      }

      // Ctrl+Z or Cmd+Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (undoRedo.canUndo) {
          undoRedo.undo()
        }
      }

      // Ctrl+Y or Cmd+Shift+Z = Redo
      if (
        (e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))
      ) {
        e.preventDefault()
        if (undoRedo.canRedo) {
          undoRedo.redo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, undoRedo])

  return (
    <UndoRedoContext.Provider
      value={{
        ...undoRedo,
        isUndoRedoEnabled: enabled
      }}
    >
      {children}
    </UndoRedoContext.Provider>
  )
}

export function useUndoRedoContext<T>() {
  const context = useContext(UndoRedoContext)
  if (!context) {
    throw new Error('useUndoRedoContext must be used within UndoRedoProvider')
  }
  return context as UndoRedoContextValue<T>
}
```

---

## Undo/Redo Toolbar Component

```typescript
// components/undo-redo/undo-redo-toolbar.tsx
'use client'

import { useI18n } from '@/hooks/use-i18n'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Undo2, Redo2, History } from 'lucide-react'

interface UndoRedoToolbarProps {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onShowHistory?: () => void
  undoCount?: number
  redoCount?: number
}

export function UndoRedoToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onShowHistory,
  undoCount = 0,
  redoCount = 0
}: UndoRedoToolbarProps) {
  const { locale } = useI18n()

  return (
    <div className="flex items-center gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onUndo}
              disabled={!canUndo}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {locale === 'th' ? 'เลิกทำ' : 'Undo'}
              {undoCount > 0 && ` (${undoCount})`}
            </p>
            <p className="text-xs text-muted-foreground">Ctrl+Z</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRedo}
              disabled={!canRedo}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {locale === 'th' ? 'ทำซ้ำ' : 'Redo'}
              {redoCount > 0 && ` (${redoCount})`}
            </p>
            <p className="text-xs text-muted-foreground">Ctrl+Y</p>
          </TooltipContent>
        </Tooltip>

        {onShowHistory && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onShowHistory}
              >
                <History className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{locale === 'th' ? 'ประวัติ' : 'History'}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  )
}
```

---

## Action History Panel

```typescript
// components/undo-redo/action-history-panel.tsx
'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { useSession } from 'next-auth/react'
import { ActionHistory, getRecentActions, undoAction } from '@/lib/undo/service'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/lib/i18n/format'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Undo2,
  Plus,
  Edit,
  Trash2,
  Package,
  User,
  FileText,
  Clock
} from 'lucide-react'

interface ActionHistoryPanelProps {
  trigger?: React.ReactNode
  onUndo?: (action: ActionHistory) => void
}

export function ActionHistoryPanel({ trigger, onUndo }: ActionHistoryPanelProps) {
  const { locale } = useI18n()
  const { data: session } = useSession()
  const [actions, setActions] = useState<ActionHistory[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session?.user?.id) {
      loadActions()
    }
  }, [session?.user?.id])

  const loadActions = async () => {
    if (!session?.user?.id) return

    setLoading(true)
    try {
      const data = await getRecentActions(parseInt(session.user.id))
      setActions(data)
    } finally {
      setLoading(false)
    }
  }

  const handleUndo = async (actionId: number) => {
    if (!session?.user?.id) return

    try {
      const result = await undoAction(actionId, parseInt(session.user.id))
      if (result.success) {
        onUndo?.(result.action)
        await loadActions()
      }
    } catch (error) {
      console.error('Failed to undo:', error)
    }
  }

  const getActionIcon = (action: string, tableName: string) => {
    if (action === 'CREATE') return <Plus className="h-4 w-4 text-green-500" />
    if (action === 'UPDATE') return <Edit className="h-4 w-4 text-blue-500" />
    if (action === 'DELETE') return <Trash2 className="h-4 w-4 text-red-500" />

    // Table-specific icons
    if (tableName === 'InventoryItem') return <Package className="h-4 w-4" />
    if (tableName === 'User') return <User className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  const getActionLabel = (action: string): string => {
    const labels: Record<string, { en: string; th: string }> = {
      CREATE: { en: 'Created', th: 'สร้าง' },
      UPDATE: { en: 'Updated', th: 'แก้ไข' },
      DELETE: { en: 'Deleted', th: 'ลบ' }
    }
    return locale === 'th' ? labels[action]?.th : labels[action]?.en
  }

  const getTableNameLabel = (tableName: string): string => {
    const labels: Record<string, { en: string; th: string }> = {
      InventoryItem: { en: 'Item', th: 'พัสดุ' },
      User: { en: 'User', th: 'ผู้ใช้' },
      Request: { en: 'Request', th: 'คำขอ' },
      Warehouse: { en: 'Warehouse', th: 'คลัง' }
    }
    return locale === 'th' ? labels[tableName]?.th : labels[tableName]?.en
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Clock className="h-4 w-4 mr-2" />
            {locale === 'th' ? 'ประวัติ' : 'History'}
          </Button>
        )}
      </SheetTrigger>

      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {locale === 'th' ? 'ประวัติการดำเนินการ' : 'Action History'}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              {locale === 'th' ? 'กำลังโหลด...' : 'Loading...'}
            </div>
          ) : actions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {locale === 'th' ? 'ไม่มีประวัติ' : 'No history'}
            </div>
          ) : (
            <div className="space-y-2">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-start gap-3 p-3 border rounded-lg"
                >
                  <div className="mt-0.5">
                    {getActionIcon(action.action, action.tableName)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {getActionLabel(action.action)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {getTableNameLabel(action.tableName)}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {action.newData?.name || action.newData?.title || `ID: ${action.recordId}`}
                    </p>

                    <p className="text-xs text-muted-foreground mt-1">
                      {formatRelativeTime(action.createdAt, locale)}
                    </p>
                  </div>

                  {action.canUndo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUndo(action.id)}
                    >
                      <Undo2 className="h-3 w-3 mr-1" />
                      {locale === 'th' ? 'เลิกทำ' : 'Undo'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
```

---

## Form with Undo/Redo

```typescript
// components/undo-redo/form-with-undo.tsx
'use client'

import { useState, useCallback } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { useFormUndoRedo } from '@/hooks/use-undo-redo'
import { UndoRedoToolbar } from './undo-redo-toolbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, RotateCcw } from 'lucide-react'

interface FormData {
  name: string
  description: string
  category: string
  quantity: string
  price: string
}

interface FormWithUndoProps {
  initialData?: FormData
  onSubmit: (data: FormData) => Promise<void>
  title: string
  titleTh?: string
}

export function FormWithUndo({
  initialData = {
    name: '',
    description: '',
    category: '',
    quantity: '0',
    price: '0'
  },
  onSubmit,
  title,
  titleTh
}: FormWithUndoProps) {
  const { locale } = useI18n()
  const [saving, setSaving] = useState(false)

  const {
    undo,
    redo,
    set: setFormState,
    immediateSet,
    reset,
    canUndo,
    canRedo,
    history
  } = useFormUndoRedo(initialData, { maxHistory: 30, debounceMs: 500 })

  const handleChange = (field: keyof FormData, value: string) => {
    setFormState({ ...history.present, [field]: value })
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await onSubmit(history.present)
      reset(initialData) // Clear history after submit
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (confirm(locale === 'th' ? 'ยืนยันรีเซ็ตฟอร์ม?' : 'Reset form?')) {
      reset(initialData)
    }
  }

  const formTitle = locale === 'th' && titleTh ? titleTh : title

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{formTitle}</CardTitle>

          <UndoRedoToolbar
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            undoCount={history.past.length}
            redoCount={history.future.length}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">
            {locale === 'th' ? 'ชื่อ' : 'Name'}
          </label>
          <Input
            value={history.present.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder={locale === 'th' ? 'กรอกชื่อ' : 'Enter name'}
          />
        </div>

        <div>
          <label className="text-sm font-medium">
            {locale === 'th' ? 'คำอธิบาย' : 'Description'}
          </label>
          <Textarea
            value={history.present.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder={locale === 'th' ? 'กรอกคำอธิบาย' : 'Enter description'}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">
              {locale === 'th' ? 'จำนวน' : 'Quantity'}
            </label>
            <Input
              type="number"
              value={history.present.quantity}
              onChange={(e) => handleChange('quantity', e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              {locale === 'th' ? 'ราคา' : 'Price'}
            </label>
            <Input
              type="number"
              value={history.present.price}
              onChange={(e) => handleChange('price', e.target.value)}
            />
          </div>
        </div>
      </CardContent>

      <CardFooter className="justify-between">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          {locale === 'th' ? 'รีเซ็ต' : 'Reset'}
        </Button>

        <Button onClick={handleSubmit} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving
            ? locale === 'th' ? 'กำลังบันทึก...' : 'Saving...'
            : locale === 'th' ? 'บันทึก' : 'Save'}
        </Button>
      </CardFooter>
    </Card>
  )
}
```

---

## Usage Examples

```tsx
// Example 1: Form with undo/redo
import { FormWithUndo } from '@/components/undo-redo/form-with-undo'

function CreateItemPage() {
  const handleSubmit = async (data: FormData) => {
    await createInventoryItem(data)
  }

  return (
    <FormWithUndo
      title="Create Item"
      titleTh="สร้างพัสดุ"
      onSubmit={handleSubmit}
    />
  )
}

// Example 2: Edit form with initial data
function EditItemPage({ item }) {
  const handleSubmit = async (data: FormData) => {
    await updateInventoryItem(item.id, data)
  }

  return (
    <FormWithUndo
      title="Edit Item"
      titleTh="แก้ไขพัสดุ"
      initialData={{
        name: item.name,
        description: item.description || '',
        category: item.category,
        quantity: String(item.quantity),
        price: String(item.price || 0)
      }}
      onSubmit={handleSubmit}
    />
  )
}

// Example 3: Action history panel
import { ActionHistoryPanel } from '@/components/undo-redo/action-history-panel'

function DashboardHeader() {
  const handleUndo = (action) => {
    toast.success(`Undone: ${action.action}`)
    // Refresh data
    refetch()
  }

  return (
    <header className="flex items-center justify-between">
      <h1>Dashboard</h1>
      <ActionHistoryPanel onUndo={handleUndo} />
    </header>
  )
}

// Example 4: Undo/Redo provider for complex form
import { UndoRedoProvider, useUndoRedoContext } from '@/components/undo-redo/undo-redo-provider'

function ComplexFormPage() {
  return (
    <UndoRedoProvider
      initialState={{ step1: {}, step2: {}, step3: {} }}
      onStateChange={(state) => console.log('State changed:', state)}
    >
      <MultiStepForm />
    </UndoRedoProvider>
  )
}

function MultiStepForm() {
  const { history, set, undo, redo, canUndo, canRedo } = useUndoRedoContext()

  return (
    <div>
      <UndoRedoToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />

      {/* Form steps using history.present */}
    </div>
  )
}
```

---

## Prisma Schema Addition

```prisma
// Add to prisma/schema.prisma

model ActionHistory {
  id        Int      @id @default(autoincrement())
  userId    Int
  action    String   // CREATE, UPDATE, DELETE
  tableName String
  recordId  Int
  oldData   String   // JSON
  newData   String   // JSON
  canUndo   Boolean  @default(true)
  undoneAt  DateTime?
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])

  @@index([userId, createdAt])
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
