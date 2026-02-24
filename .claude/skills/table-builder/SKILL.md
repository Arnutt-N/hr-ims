---
name: table-builder
description: Data table components with sorting, filtering, and actions for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["table", "datatable", "data table", "grid", "list view"]
  file_patterns: ["*table*", "components/tables/**", "components/data-table/**"]
  context: data display, sorting, filtering, row actions
mcp_servers:
  - sequential
personas:
  - frontend
---

# Table Builder

## Core Role

Build data tables for HR-IMS:
- Sortable columns
- Filterable data
- Row actions (edit, delete, view)
- Bulk selection
- Responsive design

---

## Data Table Component

### Base Table with TanStack Table

```typescript
// components/data-table/data-table.tsx
'use client'

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
  RowSelectionState
} from '@tanstack/react-table'
import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'ค้นหา... / Search...'
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection
    }
  })

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center justify-between">
        {searchKey && (
          <Input
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
            onChange={(e) =>
              table.getColumn(searchKey)?.setFilterValue(e.target.value)
            }
            className="max-w-sm"
          />
        )}
        <div className="flex items-center gap-2">
          {Object.keys(rowSelection).length > 0 && (
            <span className="text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} selected
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  ไม่มีข้อมูล / No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          หน้า {table.getState().pagination.pageIndex + 1} จาก{' '}
          {table.getPageCount()}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### Sortable Column Header

```typescript
// components/data-table/sortable-header.tsx
'use client'

import { Column } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SortableHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
}

export function SortableHeader<TData, TValue>({
  column,
  title,
  className
}: SortableHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={className}>{title}</div>
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('-ml-3 h-8 data-[state=open]:bg-accent', className)}
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      <span>{title}</span>
      {column.getIsSorted() === 'desc' ? (
        <ArrowDown className="ml-2 h-4 w-4" />
      ) : column.getIsSorted() === 'asc' ? (
        <ArrowUp className="ml-2 h-4 w-4" />
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4" />
      )}
    </Button>
  )
}
```

### Row Actions Component

```typescript
// components/data-table/row-actions.tsx
'use client'

import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import { Row } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Eye, Pencil, Trash2, Copy } from 'lucide-react'

interface RowActionsProps<TData> {
  row: Row<TData>
  onView?: (row: TData) => void
  onEdit?: (row: TData) => void
  onDelete?: (row: TData) => void
  onDuplicate?: (row: TData) => void
  extraActions?: Array<{
    label: string
    icon?: React.ReactNode
    onClick: (row: TData) => void
    destructive?: boolean
  }>
}

export function RowActions<TData>({
  row,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  extraActions
}: RowActionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">เปิดเมนู / Open menu</span>
          <DotsHorizontalIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onView && (
          <DropdownMenuItem onClick={() => onView(row.original)}>
            <Eye className="mr-2 h-4 w-4" />
            ดู / View
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onClick={() => onEdit(row.original)}>
            <Pencil className="mr-2 h-4 w-4" />
            แก้ไข / Edit
          </DropdownMenuItem>
        )}
        {onDuplicate && (
          <DropdownMenuItem onClick={() => onDuplicate(row.original)}>
            <Copy className="mr-2 h-4 w-4" />
            สำเนา / Duplicate
          </DropdownMenuItem>
        )}
        {extraActions && extraActions.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {extraActions.map((action, index) => (
              <DropdownMenuItem
                key={index}
                onClick={() => action.onClick(row.original)}
                className={action.destructive ? 'text-destructive' : ''}
              >
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
              </DropdownMenuItem>
            ))}
          </>
        )}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(row.original)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              ลบ / Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

---

## Inventory Table Example

```typescript
// components/inventory/inventory-table.tsx
'use client'

import { ColumnDef } from '@tanstack/react-table'
import { InventoryItem } from '@prisma/client'
import { DataTable } from '@/components/data-table/data-table'
import { SortableHeader } from '@/components/data-table/sortable-header'
import { RowActions } from '@/components/data-table/row-actions'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ArrowUpDown } from 'lucide-react'

interface InventoryTableProps {
  data: InventoryItem[]
  onView: (item: InventoryItem) => void
  onEdit: (item: InventoryItem) => void
  onDelete: (item: InventoryItem) => void
}

export function InventoryTable({ data, onView, onEdit, onDelete }: InventoryTableProps) {
  const columns: ColumnDef<InventoryItem>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <SortableHeader column={column} title="ชื่อ / Name" />
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('name')}</div>
      )
    },
    {
      accessorKey: 'serialNumber',
      header: 'Serial No.',
      cell: ({ row }) => row.getValue('serialNumber') || '-'
    },
    {
      accessorKey: 'category.name',
      header: 'หมวดหมู่ / Category'
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => (
        <SortableHeader column={column} title="จำนวน / Qty" />
      ),
      cell: ({ row }) => {
        const quantity = row.getValue('quantity') as number
        const minQty = row.original.minQuantity
        const isLow = quantity <= minQty

        return (
          <span className={isLow ? 'text-destructive font-medium' : ''}>
            {quantity}
            {isLow && (
              <Badge variant="destructive" className="ml-2 text-xs">
                ต่ำ / Low
              </Badge>
            )}
          </span>
        )
      }
    },
    {
      accessorKey: 'status',
      header: 'สถานะ / Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
          ACTIVE: 'default',
          INACTIVE: 'secondary',
          DISPOSED: 'destructive'
        }
        const labels: Record<string, string> = {
          ACTIVE: 'ใช้งาน',
          INACTIVE: 'ไม่ใช้งาน',
          DISPOSED: 'จำหน่าย'
        }

        return <Badge variant={variants[status]}>{labels[status]}</Badge>
      }
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <RowActions
          row={row}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )
    }
  ]

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
      searchPlaceholder="ค้นหาสินค้า... / Search items..."
    />
  )
}
```

---

## Column Definitions Reference

```typescript
// lib/table/columns.ts
import { ColumnDef } from '@tanstack/react-table'

// Common column patterns
export const createSelectColumn = <T,>(): ColumnDef<T> => ({
  id: 'select',
  header: ({ table }) => (
    <Checkbox
      checked={table.getIsAllPageRowsSelected()}
      onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
    />
  ),
  cell: ({ row }) => (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(value) => row.toggleSelected(!!value)}
    />
  ),
  enableSorting: false,
  enableHiding: false
})

export const createDateColumn = <T extends Record<string, any>>(
  accessorKey: keyof T,
  header: string
): ColumnDef<T> => ({
  accessorKey: accessorKey as string,
  header,
  cell: ({ row }) => {
    const date = row.getValue(accessorKey) as Date
    return date ? new Date(date).toLocaleDateString('th-TH') : '-'
  }
})

export const createStatusColumn = <T>(
  accessorKey: keyof T,
  header: string,
  variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }>
): ColumnDef<T> => ({
  accessorKey: accessorKey as string,
  header,
  cell: ({ row }) => {
    const status = row.getValue(accessorKey) as string
    const config = variants[status]

    return config ? (
      <Badge variant={config.variant}>{config.label}</Badge>
    ) : (
      status
    )
  }
})
```

---

## Bulk Actions Bar

```typescript
// components/data-table/bulk-actions-bar.tsx
'use client'

import { Table } from '@tanstack/react-table'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BulkActionsBarProps<TData> {
  table: Table<TData>
  actions: Array<{
    label: string
    icon?: React.ReactNode
    onClick: (selectedRows: TData[]) => void
    variant?: 'default' | 'destructive'
  }>
  className?: string
}

export function BulkActionsBar<TData>({
  table,
  actions,
  className
}: BulkActionsBarProps<TData>) {
  const selectedCount = table.getFilteredSelectedRowModel().rows.length

  if (selectedCount === 0) return null

  const selectedRows = table
    .getFilteredSelectedRowModel()
    .rows.map((row) => row.original)

  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
        'bg-background border rounded-lg shadow-lg p-4',
        'flex items-center gap-4',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium">
          {selectedCount} รายการที่เลือก / selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => table.resetRowSelection()}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-6 w-px bg-border" />

      <div className="flex items-center gap-2">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || 'outline'}
            size="sm"
            onClick={() => action.onClick(selectedRows)}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
```

---

## Server-Side Table with Pagination

```typescript
// components/data-table/server-data-table.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import { DataTable } from './data-table'
import { ColumnDef } from '@tanstack/react-table'

interface ServerDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  queryKey: string
  queryFn: (params: { page: number; limit: number; search?: string }) => Promise<{
    data: TData[]
    pagination: { page: number; pages: number; total: number }
  }>
  searchKey?: string
}

export function ServerDataTable<TData, TValue>({
  columns,
  queryKey,
  queryFn,
  searchKey
}: ServerDataTableProps<TData, TValue>) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: [queryKey, page, search],
    queryFn: () => queryFn({ page, limit: 20, search })
  })

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPage(1) // Reset to first page on search
  }, [])

  if (isLoading) return <div>กำลังโหลด... / Loading...</div>
  if (error) return <div>เกิดข้อผิดพลาด / Error loading data</div>

  return (
    <div>
      <DataTable
        columns={columns}
        data={data?.data || []}
        searchKey={searchKey}
      />
      {/* Custom pagination using data.pagination */}
    </div>
  )
}
```

---

## Responsive Table Wrapper

```typescript
// components/data-table/responsive-table.tsx
'use client'

import { ReactNode } from 'react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

interface ResponsiveTableProps {
  children: ReactNode
  className?: string
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <ScrollArea className={className}>
      <div className="min-w-[800px]">
        {children}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
