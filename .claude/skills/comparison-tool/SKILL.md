---
name: comparison-tool
description: Item comparison tool for HR-IMS inventory
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["compare", "comparison", "diff", "difference", "versus", "vs"]
  file_patterns: ["*compare*", "*comparison*"]
  context: comparing items, side-by-side comparison, feature comparison, price comparison
mcp_servers:
  - sequential
personas:
  - frontend
---

# Comparison Tool

## Core Role

Implement item comparison tool for HR-IMS:
- Side-by-side item comparison
- Feature highlighting (matches/differences)
- Compare multiple items at once
- Export comparison results

---

## Comparison Service

```typescript
// lib/comparison/service.ts
import prisma from '@/lib/prisma'

export interface ComparisonItem {
  id: number
  name: string
  serialNumber: string | null
  category: string
  location: string | null
  status: string
  condition: string | null
  quantity: number
  price: number | null
  purchaseDate: Date | null
  warrantyExpiry: Date | null
  warehouse: string
  description: string | null
  specifications: Record<string, any> | null
}

export interface ComparisonResult {
  items: ComparisonItem[]
  fields: ComparisonField[]
}

export interface ComparisonField {
  key: string
  label: string
  labelTh?: string
  type: 'text' | 'number' | 'date' | 'currency' | 'status' | 'json'
  values: Array<{
    itemId: number
    value: any
    isDifferent: boolean
  }>
}

// Field definitions for comparison
const comparisonFields: Array<{
  key: string
  label: string
  labelTh: string
  type: 'text' | 'number' | 'date' | 'currency' | 'status' | 'json'
}> = [
  { key: 'name', label: 'Name', labelTh: 'ชื่อ', type: 'text' },
  { key: 'serialNumber', label: 'Serial Number', labelTh: 'หมายเลขซีเรียล', type: 'text' },
  { key: 'category', label: 'Category', labelTh: 'หมวดหมู่', type: 'text' },
  { key: 'location', label: 'Location', labelTh: 'ตำแหน่ง', type: 'text' },
  { key: 'status', label: 'Status', labelTh: 'สถานะ', type: 'status' },
  { key: 'condition', label: 'Condition', labelTh: 'สภาพ', type: 'text' },
  { key: 'quantity', label: 'Quantity', labelTh: 'จำนวน', type: 'number' },
  { key: 'price', label: 'Price', labelTh: 'ราคา', type: 'currency' },
  { key: 'purchaseDate', label: 'Purchase Date', labelTh: 'วันที่ซื้อ', type: 'date' },
  { key: 'warrantyExpiry', label: 'Warranty Expiry', labelTh: 'วันหมดประกัน', type: 'date' },
  { key: 'warehouse', label: 'Warehouse', labelTh: 'คลัง', type: 'text' },
  { key: 'description', label: 'Description', labelTh: 'คำอธิบาย', type: 'text' },
  { key: 'specifications', label: 'Specifications', labelTh: 'สเปค', type: 'json' }
]

// Get items for comparison
export async function getItemsForComparison(itemIds: number[]): Promise<ComparisonItem[]> {
  const items = await prisma.inventoryItem.findMany({
    where: { id: { in: itemIds } },
    include: {
      category: { select: { name: true } },
      warehouse: { select: { name: true } }
    }
  })

  return items.map(item => ({
    id: item.id,
    name: item.name,
    serialNumber: item.serialNumber,
    category: item.category?.name || '-',
    location: item.location,
    status: item.status,
    condition: item.condition,
    quantity: item.quantity,
    price: item.price?.toNumber() || null,
    purchaseDate: item.purchaseDate,
    warrantyExpiry: item.warrantyExpiry,
    warehouse: item.warehouse?.name || '-',
    description: item.description,
    specifications: item.specifications as Record<string, any> | null
  }))
}

// Compare items and highlight differences
export function compareItems(items: ComparisonItem[]): ComparisonResult {
  const fields: ComparisonField[] = comparisonFields.map(field => {
    const values = items.map(item => {
      const value = (item as any)[field.key]
      return {
        itemId: item.id,
        value,
        isDifferent: false // Will be calculated below
      }
    })

    // Check if values are different
    const uniqueValues = new Set(
      values.map(v => {
        if (v.value === null || v.value === undefined) return 'null'
        if (field.type === 'json') return JSON.stringify(v.value)
        return String(v.value)
      })
    )

    const isDifferent = uniqueValues.size > 1

    values.forEach(v => v.isDifferent = isDifferent)

    return {
      key: field.key,
      label: field.label,
      labelTh: field.labelTh,
      type: field.type,
      values
    }
  })

  return { items, fields }
}

// Save comparison to history
export async function saveComparison(
  userId: number,
  itemIds: number[],
  name?: string
) {
  return prisma.itemComparison.create({
    data: {
      userId,
      itemIds: JSON.stringify(itemIds),
      name: name || `Comparison ${new Date().toLocaleDateString()}`
    }
  })
}

// Get comparison history
export async function getComparisonHistory(userId: number, limit = 10) {
  const comparisons = await prisma.itemComparison.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit
  })

  return comparisons.map(c => ({
    id: c.id,
    name: c.name,
    itemIds: JSON.parse(c.itemIds as string) as number[],
    createdAt: c.createdAt
  }))
}

// Delete comparison
export async function deleteComparison(id: number, userId: number) {
  return prisma.itemComparison.deleteMany({
    where: { id, userId }
  })
}
```

---

## Comparison Component

```typescript
// components/comparison/item-comparison.tsx
'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { ComparisonResult, ComparisonField } from '@/lib/comparison/service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { formatCurrency, formatDate } from '@/lib/i18n/format'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Download,
  X,
  AlertCircle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface ItemComparisonProps {
  result: ComparisonResult
  onRemoveItem?: (itemId: number) => void
  onExport?: () => void
}

export function ItemComparison({
  result,
  onRemoveItem,
  onExport
}: ItemComparisonProps) {
  const { locale } = useI18n()
  const [highlightDiff, setHighlightDiff] = useState(true)

  const formatValue = (value: any, type: ComparisonField['type']): string => {
    if (value === null || value === undefined) return '-'

    switch (type) {
      case 'text':
        return String(value)
      case 'number':
        return value.toLocaleString()
      case 'date':
        return formatDate(new Date(value), locale)
      case 'currency':
        return formatCurrency(value, locale)
      case 'status':
        return String(value)
      case 'json':
        if (typeof value === 'object') {
          return Object.entries(value)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')
        }
        return String(value)
      default:
        return String(value)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      AVAILABLE: 'default',
      BORROWED: 'secondary',
      MAINTENANCE: 'outline',
      RETIRED: 'destructive'
    }

    const labels: Record<string, { en: string; th: string }> = {
      AVAILABLE: { en: 'Available', th: 'พร้อมใช้งาน' },
      BORROWED: { en: 'Borrowed', th: 'ถูกยืม' },
      MAINTENANCE: { en: 'Maintenance', th: 'ซ่อมบำรุง' },
      RETIRED: { en: 'Retired', th: 'เกษียณ' }
    }

    const label = labels[status] || { en: status, th: status }

    return (
      <Badge variant={variants[status] || 'default'}>
        {locale === 'th' ? label.th : label.en}
      </Badge>
    )
  }

  // Count differences
  const differenceCount = result.fields.filter(f =>
    f.values.some(v => v.isDifferent)
  ).length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {locale === 'th' ? 'เปรียบเทียบพัสดุ' : 'Item Comparison'}
              <Badge variant="secondary">
                {result.items.length} {locale === 'th' ? 'รายการ' : 'items'}
              </Badge>
            </CardTitle>
            {differenceCount > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {locale === 'th'
                  ? `พบความแตกต่าง ${differenceCount} รายการ`
                  : `${differenceCount} differences found`}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHighlightDiff(!highlightDiff)}
            >
              {highlightDiff ? (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {locale === 'th' ? 'ซ่อนความแตกต่าง' : 'Hide Diffs'}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {locale === 'th' ? 'แสดงความแตกต่าง' : 'Show Diffs'}
                </>
              )}
            </Button>

            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                {locale === 'th' ? 'ส่งออก' : 'Export'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="w-full">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10 w-40">
                  {locale === 'th' ? 'คุณสมบัติ' : 'Property'}
                </TableHead>
                {result.items.map(item => (
                  <TableHead key={item.id} className="min-w-[200px]">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/inventory/${item.id}`}
                        className="font-medium hover:underline flex items-center gap-1"
                      >
                        {item.name}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                      {onRemoveItem && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => onRemoveItem(item.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {result.fields.map(field => {
                const hasDifference = field.values.some(v => v.isDifferent)
                const shouldHighlight = highlightDiff && hasDifference

                return (
                  <TableRow
                    key={field.key}
                    className={cn(
                      shouldHighlight && "bg-yellow-50 dark:bg-yellow-950/20"
                    )}
                  >
                    <TableCell className="sticky left-0 bg-background z-10 font-medium">
                      {locale === 'th' ? field.labelTh : field.label}
                      {hasDifference && highlightDiff && (
                        <AlertCircle className="inline h-3 w-3 ml-1 text-yellow-500" />
                      )}
                    </TableCell>

                    {field.values.map((v, idx) => (
                      <TableCell
                        key={`${field.key}-${v.itemId}`}
                        className={cn(
                          shouldHighlight && "font-medium"
                        )}
                      >
                        {field.type === 'status' ? (
                          getStatusBadge(v.value)
                        ) : (
                          formatValue(v.value, field.type)
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
```

---

## Comparison Selector Component

```typescript
// components/comparison/comparison-selector.tsx
'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { useDebounce } from '@/hooks/use-debounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, X, Plus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectableItem {
  id: number
  name: string
  serialNumber: string | null
  category: string
  status: string
}

interface ComparisonSelectorProps {
  items: SelectableItem[]
  selectedIds: number[]
  onSelectionChange: (ids: number[]) => void
  maxItems?: number
}

export function ComparisonSelector({
  items,
  selectedIds,
  onSelectionChange,
  maxItems = 4
}: ComparisonSelectorProps) {
  const { locale } = useI18n()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 200)

  const filteredItems = items.filter(item => {
    if (!debouncedSearch) return true
    const query = debouncedSearch.toLowerCase()
    return (
      item.name.toLowerCase().includes(query) ||
      item.serialNumber?.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    )
  })

  const toggleItem = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id))
    } else if (selectedIds.length < maxItems) {
      onSelectionChange([...selectedIds, id])
    }
  }

  const clearSelection = () => {
    onSelectionChange([])
  }

  const isMaxReached = selectedIds.length >= maxItems

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={locale === 'th' ? 'ค้นหาพัสดุ...' : 'Search items...'}
          className="pl-9"
        />
      </div>

      {/* Selected items */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedIds.map(id => {
            const item = items.find(i => i.id === id)
            if (!item) return null

            return (
              <Badge
                key={id}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {item.name}
                <button
                  onClick={() => toggleItem(id)}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}

          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="h-6 px-2 text-xs"
          >
            {locale === 'th' ? 'ล้างทั้งหมด' : 'Clear all'}
          </Button>
        </div>
      )}

      {/* Item limit indicator */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {locale === 'th'
            ? `เลือกแล้ว ${selectedIds.length} จาก ${maxItems} รายการ`
            : `${selectedIds.length} of ${maxItems} selected`}
        </span>
        {isMaxReached && (
          <span className="text-yellow-500 text-xs">
            {locale === 'th' ? 'ถึงขีดจำกัดแล้ว' : 'Maximum reached'}
          </span>
        )}
      </div>

      {/* Items list */}
      <ScrollArea className="h-64 border rounded-lg">
        <div className="p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {locale === 'th' ? 'ไม่พบพัสดุ' : 'No items found'}
            </div>
          ) : (
            filteredItems.map(item => {
              const isSelected = selectedIds.includes(item.id)
              const isDisabled = !isSelected && isMaxReached

              return (
                <button
                  key={item.id}
                  onClick={() => !isDisabled && toggleItem(item.id)}
                  disabled={isDisabled}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-lg text-left",
                    "hover:bg-muted/50 transition-colors",
                    isDisabled && "opacity-50 cursor-not-allowed",
                    isSelected && "bg-primary/10"
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={isDisabled}
                    onCheckedChange={() => toggleItem(item.id)}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.serialNumber || '-'} • {item.category}
                    </p>
                  </div>

                  <Badge variant="outline" className="text-xs">
                    {item.status}
                  </Badge>
                </button>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
```

---

## Comparison Dialog

```typescript
// components/comparison/comparison-dialog.tsx
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ComparisonSelector } from './comparison-selector'
import { GitCompare, History, Save } from 'lucide-react'
import { SelectableItem } from './comparison-selector'

interface ComparisonDialogProps {
  items: SelectableItem[]
  onCompare: (itemIds: number[]) => void
  history?: Array<{
    id: number
    name: string
    itemIds: number[]
    createdAt: Date
  }>
  onLoadHistory?: (itemIds: number[]) => void
  onSaveComparison?: (itemIds: number[], name: string) => void
  trigger?: React.ReactNode
}

export function ComparisonDialog({
  items,
  onCompare,
  history = [],
  onLoadHistory,
  onSaveComparison,
  trigger
}: ComparisonDialogProps) {
  const { locale } = useI18n()
  const [open, setOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [saveName, setSaveName] = useState('')

  const handleCompare = () => {
    if (selectedIds.length < 2) return
    onCompare(selectedIds)
    setOpen(false)
  }

  const handleLoadHistory = (itemIds: number[]) => {
    setSelectedIds(itemIds)
    onLoadHistory?.(itemIds)
  }

  const handleSave = async () => {
    if (!saveName.trim() || selectedIds.length < 2) return
    await onSaveComparison?.(selectedIds, saveName.trim())
    setSaveName('')
  }

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSelectedIds([])
      setSaveName('')
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <GitCompare className="h-4 w-4 mr-2" />
            {locale === 'th' ? 'เปรียบเทียบ' : 'Compare'}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {locale === 'th' ? 'เปรียบเทียบพัสดุ' : 'Compare Items'}
          </DialogTitle>
          <DialogDescription>
            {locale === 'th'
              ? 'เลือกพัสดุ 2-4 รายการเพื่อเปรียบเทียบ'
              : 'Select 2-4 items to compare side by side'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="select" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="select">
              {locale === 'th' ? 'เลือกพัสดุ' : 'Select Items'}
            </TabsTrigger>
            <TabsTrigger value="history">
              {locale === 'th' ? 'ประวัติ' : 'History'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="mt-4">
            <ComparisonSelector
              items={items}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              maxItems={4}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {locale === 'th' ? 'ยังไม่มีประวัติการเปรียบเทียบ' : 'No comparison history'}
              </div>
            ) : (
              <div className="space-y-2">
                {history.map(h => (
                  <button
                    key={h.id}
                    onClick={() => handleLoadHistory(h.itemIds)}
                    className="w-full p-3 border rounded-lg text-left hover:bg-muted/50 transition-colors"
                  >
                    <p className="font-medium">{h.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.itemIds.length} items • {h.createdAt.toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {selectedIds.length >= 2 && onSaveComparison && (
            <div className="flex gap-2 flex-1">
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={locale === 'th' ? 'บันทึกเป็น...' : 'Save as...'}
                className="flex-1"
              />
              <Button variant="outline" onClick={handleSave}>
                <Save className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Button
            onClick={handleCompare}
            disabled={selectedIds.length < 2}
          >
            <GitCompare className="h-4 w-4 mr-2" />
            {locale === 'th' ? 'เปรียบเทียบ' : 'Compare'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Usage Examples

```tsx
// Example 1: Comparison page
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ItemComparison, ComparisonResult } from '@/components/comparison/item-comparison'
import { ComparisonDialog } from '@/components/comparison/comparison-dialog'
import { getItemsForComparison, compareItems } from '@/lib/comparison/service'

function ComparisonPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [allItems, setAllItems] = useState<SelectableItem[]>([])

  // Load items from URL params
  useEffect(() => {
    const ids = searchParams.get('ids')?.split(',').map(Number).filter(Boolean)
    if (ids && ids.length >= 2) {
      loadComparison(ids)
    }
  }, [searchParams])

  const loadComparison = async (ids: number[]) => {
    const items = await getItemsForComparison(ids)
    const comparisonResult = compareItems(items)
    setResult(comparisonResult)
  }

  const handleCompare = (ids: number[]) => {
    router.push(`/inventory/compare?ids=${ids.join(',')}`)
  }

  const handleRemoveItem = (itemId: number) => {
    if (!result) return
    const newIds = result.items
      .filter(i => i.id !== itemId)
      .map(i => i.id)

    if (newIds.length < 2) {
      router.push('/inventory')
    } else {
      router.push(`/inventory/compare?ids=${newIds.join(',')}`)
    }
  }

  const handleExport = () => {
    // Export to CSV/PDF
    console.log('Export comparison')
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {locale === 'th' ? 'เปรียบเทียบพัสดุ' : 'Compare Items'}
        </h1>

        <ComparisonDialog
          items={allItems}
          onCompare={handleCompare}
        />
      </div>

      {result ? (
        <ItemComparison
          result={result}
          onRemoveItem={handleRemoveItem}
          onExport={handleExport}
        />
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {locale === 'th'
            ? 'เลือกพัสดุอย่างน้อย 2 รายการเพื่อเปรียบเทียบ'
            : 'Select at least 2 items to compare'}
        </div>
      )}
    </div>
  )
}

// Example 2: Add compare checkbox to inventory table
function InventoryTableRow({ item, selectedForCompare, onToggleCompare }) {
  return (
    <TableRow>
      <TableCell>
        <Checkbox
          checked={selectedForCompare}
          onCheckedChange={() => onToggleCompare(item.id)}
        />
      </TableCell>
      {/* Other cells... */}
    </TableRow>
  )
}

// Example 3: Quick compare from item detail
function ItemDetailPage({ item }) {
  const [compareDialogOpen, setCompareDialogOpen] = useState(false)

  return (
    <div>
      {/* Item details... */}

      <Button
        variant="outline"
        onClick={() => setCompareDialogOpen(true)}
      >
        <GitCompare className="h-4 w-4 mr-2" />
        Compare with other items
      </Button>

      <ComparisonDialog
        items={allItems}
        onCompare={(ids) => router.push(`/inventory/compare?ids=${item.id},${ids.join(',')}`)}
        open={compareDialogOpen}
        onOpenChange={setCompareDialogOpen}
      />
    </div>
  )
}
```

---

## Prisma Schema Addition

```prisma
// Add to prisma/schema.prisma

model ItemComparison {
  id        Int      @id @default(autoincrement())
  userId    Int
  name      String
  itemIds   String   // JSON array of item IDs
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
