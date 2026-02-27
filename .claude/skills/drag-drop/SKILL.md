---
name: drag-drop
description: Drag and drop functionality for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["drag", "drop", "reorder", "sortable", "drag and drop", "sortable list"]
  file_patterns: ["*drag*", "*sortable*", "*reorder*"]
  context: drag and drop, sortable lists, reordering, kanban boards
mcp_servers:
  - sequential
personas:
  - frontend
---

# Drag and Drop Functionality

## Core Role

Implement drag and drop functionality for HR-IMS:
- Sortable lists and tables
- Kanban board style boards
- File drag and drop upload
- Reorderable items

---

## Drag and Drop Hook

```typescript
// hooks/use-drag-drop.ts
'use client'

import { useState, useCallback, useRef } from 'react'

export interface DragItem {
  id: string | number
  type: string
  data?: any
}

export interface DropResult {
  sourceId: string | number
  targetId: string | number
  sourceIndex: number
  targetIndex: number
}

export function useDragDrop<T extends { id: string | number }>(
  items: T[],
  onReorder: (items: T[]) => void
) {
  const [draggedItem, setDraggedItem] = useState<T | null>(null)
  const [dragOverId, setDragOverId] = useState<string | number | null>(null)
  const [dragStartIndex, setDragStartIndex] = useState<number>(-1)

  const handleDragStart = useCallback((item: T, index: number) => {
    setDraggedItem(item)
    setDragStartIndex(index)
  }, [])

  const handleDragOver = useCallback((targetId: string | number) => {
    setDragOverId(targetId)
  }, [])

  const handleDrop = useCallback((targetId: string | number, targetIndex: number) => {
    if (!draggedItem || dragStartIndex === targetIndex) {
      reset()
      return
    }

    const newItems = [...items]
    newItems.splice(dragStartIndex, 1)
    newItems.splice(targetIndex, 0, draggedItem)

    onReorder(newItems)
    reset()
  }, [draggedItem, dragStartIndex, items, onReorder])

  const reset = useCallback(() => {
    setDraggedItem(null)
    setDragOverId(null)
    setDragStartIndex(-1)
  }, [])

  return {
    draggedItem,
    dragOverId,
    handleDragStart,
    handleDragOver,
    handleDrop,
    reset
  }
}

// HTML5 Drag and Drop wrapper
export function useHtml5DragDrop(
  onDrop: (data: any, target: HTMLElement) => void
) {
  const dragRef = useRef<HTMLElement | null>(null)

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (dragRef.current) {
      dragRef.current.classList.add('drag-over')
    }
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (dragRef.current) {
      dragRef.current.classList.remove('drag-over')
    }
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (dragRef.current) {
      dragRef.current.classList.remove('drag-over')
    }

    const data = e.dataTransfer?.getData('application/json')
    if (data) {
      onDrop(JSON.parse(data), e.target as HTMLElement)
    }
  }, [onDrop])

  const setupDropZone = useCallback((element: HTMLElement | null) => {
    if (!element) return

    dragRef.current = element
    element.addEventListener('dragenter', handleDragEnter)
    element.addEventListener('dragleave', handleDragLeave)
    element.addEventListener('dragover', handleDragOver)
    element.addEventListener('drop', handleDrop)
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop])

  const cleanup = useCallback(() => {
    if (dragRef.current) {
      dragRef.current.removeEventListener('dragenter', handleDragEnter)
      dragRef.current.removeEventListener('dragleave', handleDragLeave)
      dragRef.current.removeEventListener('dragover', handleDragOver)
      dragRef.current.removeEventListener('drop', handleDrop)
    }
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop])

  return { setupDropZone, cleanup }
}
```

---

## Sortable List Component

```typescript
// components/drag-drop/sortable-list.tsx
'use client'

import { useState, useCallback } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { useDragDrop } from '@/hooks/use-drag-drop'
import { cn } from '@/lib/utils'
import { GripVertical } from 'lucide-react'

interface SortableItem {
  id: string | number
  [key: string]: any
}

interface SortableListProps<T extends SortableItem> {
  items: T[]
  onReorder: (items: T[]) => void
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor?: (item: T) => string | number
  className?: string
  itemClassName?: string
  dragHandle?: boolean
}

export function SortableList<T extends SortableItem>({
  items,
  onReorder,
  renderItem,
  keyExtractor = (item) => item.id,
  className,
  itemClassName,
  dragHandle = true
}: SortableListProps<T>) {
  const {
    draggedItem,
    dragOverId,
    handleDragStart,
    handleDragOver,
    handleDrop,
    reset
  } = useDragDrop(items, onReorder)

  const onDragStart = (e: React.DragEvent, item: T, index: number) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(item.id))
    handleDragStart(item, index)
  }

  const onDragOver = (e: React.DragEvent, item: T, index: number) => {
    e.preventDefault()
    if (draggedItem?.id !== item.id) {
      handleDragOver(item.id)
    }
  }

  const onDrop = (e: React.DragEvent, item: T, index: number) => {
    e.preventDefault()
    handleDrop(item.id, index)
  }

  const onDragEnd = () => {
    reset()
  }

  return (
    <div className={cn("space-y-1", className)}>
      {items.map((item, index) => {
        const isDragging = draggedItem?.id === item.id
        const isDragOver = dragOverId === item.id

        return (
          <div
            key={keyExtractor(item)}
            draggable
            onDragStart={(e) => onDragStart(e, item, index)}
            onDragOver={(e) => onDragOver(e, item, index)}
            onDrop={(e) => onDrop(e, item, index)}
            onDragEnd={onDragEnd}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg transition-all",
              "bg-background border",
              isDragging && "opacity-50 scale-95",
              isDragOver && "border-primary bg-primary/5",
              !isDragging && "hover:bg-muted/50",
              itemClassName
            )}
          >
            {dragHandle && (
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
            )}
            <div className="flex-1">
              {renderItem(item, index)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

---

## Kanban Board Component

```typescript
// components/drag-drop/kanban-board.tsx
'use client'

import { useState, useCallback } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'

export interface KanbanColumn<T> {
  id: string
  title: string
  titleTh?: string
  items: T[]
  color?: string
}

export interface KanbanItem {
  id: string | number
  title: string
  titleTh?: string
  description?: string
  descriptionTh?: string
  labels?: Array<{ text: string; textTh?: string; color: string }>
}

interface KanbanBoardProps<T extends KanbanItem> {
  columns: KanbanColumn<T>[]
  onMove: (itemId: string | number, fromColumn: string, toColumn: string, toIndex: number) => void
  onItemClick?: (item: T) => void
  onAddItem?: (columnId: string) => void
}

export function KanbanBoard<T extends KanbanItem>({
  columns,
  onMove,
  onItemClick,
  onAddItem
}: KanbanBoardProps<T>) {
  const { locale } = useI18n()
  const [draggedItem, setDraggedItem] = useState<{ item: T; columnId: string } | null>(null)
  const [dragOver, setDragOver] = useState<{ columnId: string; index: number } | null>(null)

  const handleDragStart = (item: T, columnId: string) => {
    setDraggedItem({ item, columnId })
  }

  const handleDragOver = (e: React.DragEvent, columnId: string, index: number) => {
    e.preventDefault()
    setDragOver({ columnId, index })
  }

  const handleDrop = (e: React.DragEvent, columnId: string, index: number) => {
    e.preventDefault()

    if (draggedItem && draggedItem.columnId !== columnId) {
      onMove(draggedItem.item.id, draggedItem.columnId, columnId, index)
    }

    setDraggedItem(null)
    setDragOver(null)
  }

  const handleDropOnColumn = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()

    if (draggedItem && draggedItem.columnId !== columnId) {
      onMove(draggedItem.item.id, draggedItem.columnId, columnId, columns.find(c => c.id === columnId)?.items.length || 0)
    }

    setDraggedItem(null)
    setDragOver(null)
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div
          key={column.id}
          className="flex-shrink-0 w-72"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDropOnColumn(e, column.id)}
        >
          <Card className="h-full">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {column.color && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: column.color }}
                    />
                  )}
                  <CardTitle className="text-sm font-medium">
                    {locale === 'th' && column.titleTh ? column.titleTh : column.title}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {column.items.length}
                  </Badge>
                </div>

                {onAddItem && (
                  <button
                    onClick={() => onAddItem(column.id)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-2 px-4 pb-4">
              {column.items.map((item, index) => {
                const isDragging = draggedItem?.item.id === item.id
                const isDragOver = dragOver?.columnId === column.id && dragOver.index === index

                const title = locale === 'th' && item.titleTh ? item.titleTh : item.title
                const description = locale === 'th' && item.descriptionTh
                  ? item.descriptionTh
                  : item.description

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(item, column.id)}
                    onDragOver={(e) => handleDragOver(e, column.id, index)}
                    onDrop={(e) => handleDrop(e, column.id, index)}
                    onClick={() => onItemClick?.(item)}
                    className={cn(
                      "p-3 bg-muted/50 rounded-lg cursor-pointer transition-all",
                      "hover:bg-muted border border-transparent",
                      isDragging && "opacity-50 scale-95",
                      isDragOver && "border-primary bg-primary/5"
                    )}
                  >
                    <p className="font-medium text-sm">{title}</p>
                    {description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {description}
                      </p>
                    )}
                    {item.labels && item.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.labels.map((label, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-xs"
                            style={{ borderColor: label.color, color: label.color }}
                          >
                            {locale === 'th' && label.textTh ? label.textTh : label.text}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Drop zone indicator */}
              {draggedItem && dragOver?.columnId === column.id && (
                <div
                  className="h-16 border-2 border-dashed border-primary rounded-lg"
                  style={{
                    opacity: dragOver.index >= column.items.length ? 1 : 0
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}
```

---

## File Drop Zone Component

```typescript
// components/drag-drop/file-drop-zone.tsx
'use client'

import { useState, useCallback, useRef } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { cn } from '@/lib/utils'
import { Upload, File, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void
  accept?: string[]
  multiple?: boolean
  maxSize?: number // in bytes
  className?: string
  disabled?: boolean
}

export function FileDropZone({
  onFilesSelected,
  accept = [],
  multiple = true,
  maxSize = 10 * 1024 * 1024, // 10MB default
  className,
  disabled = false
}: FileDropZoneProps) {
  const { locale } = useI18n()
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFiles = useCallback((files: File[]): File[] => {
    setError(null)
    const validFiles: File[] = []

    for (const file of files) {
      // Check file type
      if (accept.length > 0) {
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
        const mimeType = file.type

        const isValidType = accept.some(type =>
          type.startsWith('.') ? fileExtension === type.toLowerCase() :
          type.includes('*') ? mimeType.startsWith(type.replace('*', '')) :
          mimeType === type
        )

        if (!isValidType) {
          setError(
            locale === 'th'
              ? `ไฟล์ ${file.name} ไม่ใช่ประเภทที่รองรับ`
              : `${file.name} is not an accepted file type`
          )
          continue
        }
      }

      // Check file size
      if (file.size > maxSize) {
        setError(
          locale === 'th'
            ? `ไฟล์ ${file.name} ใหญ่เกิน ${(maxSize / 1024 / 1024).toFixed(0)}MB`
            : `${file.name} exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`
        )
        continue
      }

      validFiles.push(file)
    }

    return validFiles
  }, [accept, maxSize, locale])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    const validFiles = validateFiles(files)

    if (validFiles.length > 0) {
      onFilesSelected(multiple ? validFiles : [validFiles[0]])
    }
  }, [disabled, validateFiles, onFilesSelected, multiple])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return

    const files = Array.from(e.target.files)
    const validFiles = validateFiles(files)

    if (validFiles.length > 0) {
      onFilesSelected(multiple ? validFiles : [validFiles[0]])
    }

    // Reset input
    e.target.value = ''
  }, [validateFiles, onFilesSelected, multiple])

  const openFilePicker = () => {
    inputRef.current?.click()
  }

  return (
    <div className={className}>
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFilePicker}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
          "hover:border-primary/50 hover:bg-muted/50",
          isDragging && "border-primary bg-primary/5",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept.join(',')}
          multiple={multiple}
          onChange={handleFileSelect}
          disabled={disabled}
          className="hidden"
        />

        <Upload
          className={cn(
            "h-10 w-10 mx-auto mb-4 text-muted-foreground",
            isDragging && "text-primary"
          )}
        />

        <p className="text-sm font-medium">
          {locale === 'th'
            ? 'ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์'
            : 'Drag files here or click to browse'}
        </p>

        <p className="text-xs text-muted-foreground mt-2">
          {locale === 'th'
            ? `ขนาดสูงสุด ${(maxSize / 1024 / 1024).toFixed(0)}MB`
            : `Maximum size ${(maxSize / 1024 / 1024).toFixed(0)}MB`}
          {accept.length > 0 && (
            <span className="ml-1">
              • {accept.join(', ')}
            </span>
          )}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  )
}
```

---

## Usage Examples

```tsx
// Example 1: Sortable list for categories
import { SortableList } from '@/components/drag-drop/sortable-list'

function CategoryManager() {
  const [categories, setCategories] = useState([
    { id: 1, name: 'Electronics', order: 0 },
    { id: 2, name: 'Furniture', order: 1 },
    { id: 3, name: 'Supplies', order: 2 }
  ])

  const handleReorder = async (newOrder: Category[]) => {
    // Update order locally
    setCategories(newOrder)

    // Save to server
    await updateCategoryOrder(newOrder.map((c, i) => ({ id: c.id, order: i })))
  }

  return (
    <SortableList
      items={categories}
      onReorder={handleReorder}
      renderItem={(category) => (
        <span>{category.name}</span>
      )}
    />
  )
}

// Example 2: Kanban board for request workflow
import { KanbanBoard } from '@/components/drag-drop/kanban-board'

function RequestBoard() {
  const [columns, setColumns] = useState([
    {
      id: 'pending',
      title: 'Pending',
      titleTh: 'รอดำเนินการ',
      color: '#yellow',
      items: pendingRequests
    },
    {
      id: 'approved',
      title: 'Approved',
      titleTh: 'อนุมัติแล้ว',
      color: '#green',
      items: approvedRequests
    },
    {
      id: 'rejected',
      title: 'Rejected',
      titleTh: 'ปฏิเสธ',
      color: '#red',
      items: rejectedRequests
    }
  ])

  const handleMove = async (itemId, fromColumn, toColumn, toIndex) => {
    // Update request status
    await updateRequestStatus(itemId, toColumn)

    // Update local state
    // ... move item logic
  }

  return (
    <KanbanBoard
      columns={columns}
      onMove={handleMove}
      onItemClick={(item) => openRequestDetail(item.id)}
    />
  )
}

// Example 3: File drop zone for document upload
import { FileDropZone } from '@/components/drag-drop/file-drop-zone'

function DocumentUploader() {
  const [files, setFiles] = useState<File[]>([])

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles])
  }

  const handleUpload = async () => {
    for (const file of files) {
      await uploadDocument(file)
    }
    setFiles([])
  }

  return (
    <div>
      <FileDropZone
        onFilesSelected={handleFilesSelected}
        accept={['.pdf', '.doc', '.docx', '.xls', '.xlsx']}
        maxSize={25 * 1024 * 1024} // 25MB
      />

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-2">
              <File className="h-4 w-4" />
              {file.name}
            </div>
          ))}

          <Button onClick={handleUpload}>
            Upload {files.length} files
          </Button>
        </div>
      )}
    </div>
  )
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
