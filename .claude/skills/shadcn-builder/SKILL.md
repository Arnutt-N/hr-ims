---
name: shadcn-builder
description: Build Shadcn UI components with Tailwind CSS v4 for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["component", "UI", "shadcn", "button", "form", "table", "dialog", "modal"]
  file_patterns: ["components/ui/*", "components/**/*.tsx"]
  context: frontend, UI, design
mcp_servers:
  - magic
  - context7
personas:
  - frontend
---

# Shadcn UI Builder

## Core Role

Build consistent Shadcn UI components for HR-IMS:
- Follow existing component patterns
- Use Tailwind CSS v4 syntax
- Implement accessibility (WCAG 2.1 AA)
- Support Thai/English content

---

## Project UI Stack

```yaml
framework: Next.js 16.1 (App Router)
ui_library: Shadcn UI
css: Tailwind CSS v4
components_dir: frontend/next-app/components/
  ui/: Shadcn base components
  dashboard/: Dashboard-specific
  inventory/: Inventory components
  forms/: Form components

styling:
  theme: Light/Dark mode
  primary_color: Blue
  font: Inter (Latin) + Sarabun (Thai)
```

---

## Component Templates

### Data Table

```typescript
// components/ui/data-table.tsx
'use client'

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnFiltersState,
  SortingState
} from '@tanstack/react-table'
import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'

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
  searchPlaceholder = 'Search...'
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pageIndex, setPageIndex] = useState(0)
  const pageSize = 10

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
      pagination: { pageIndex, pageSize }
    }
  })

  return (
    <div className="space-y-4">
      {/* Search */}
      {searchKey && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
            onChange={(e) => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

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
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {pageIndex + 1} of {table.getPageCount()}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            disabled={pageIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageIndex((p) => Math.min(table.getPageCount() - 1, p + 1))}
            disabled={pageIndex >= table.getPageCount() - 1}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### Form with Validation

```typescript
// components/forms/entity-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE'], { required_error: 'Please select status' }),
  quantity: z.number().min(0, 'Quantity must be 0 or greater')
})

type FormValues = z.infer<typeof formSchema>

interface EntityFormProps {
  defaultValues?: Partial<FormValues>
  onSubmit: (data: FormValues) => Promise<void>
  isSubmitting?: boolean
}

export function EntityForm({ defaultValues, onSubmit, isSubmitting }: EntityFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'ACTIVE',
      quantity: 0,
      ...defaultValues
    }
  })

  const handleSubmit = async (data: FormValues) => {
    try {
      await onSubmit(data)
    } catch (error) {
      // Error handling
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name / ชื่อ</FormLabel>
              <FormControl>
                <Input placeholder="Enter name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description / คำอธิบาย</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status / สถานะ</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity / จำนวน</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {defaultValues ? 'Update / อัปเดต' : 'Create / สร้าง'}
        </Button>
      </form>
    </Form>
  )
}
```

### Confirm Dialog

```typescript
// components/ui/confirm-dialog.tsx
'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  onConfirm: () => Promise<void>
  isLoading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  onConfirm,
  isLoading
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={variant}
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirmText}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Usage
<ConfirmDialog
  open={showDeleteDialog}
  onOpenChange={setShowDeleteDialog}
  title="Delete Item / ลบรายการ"
  description="Are you sure? This action cannot be undone."
  confirmText="Delete / ลบ"
  variant="destructive"
  onConfirm={handleDelete}
  isLoading={isDeleting}
/>
```

### Status Badge

```typescript
// components/ui/status-badge.tsx
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type StatusType = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELETED'

const statusConfig: Record<StatusType, { label: string; labelTh: string; className: string }> = {
  ACTIVE: { label: 'Active', labelTh: 'ใช้งาน', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  INACTIVE: { label: 'Inactive', labelTh: 'ไม่ใช้งาน', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
  PENDING: { label: 'Pending', labelTh: 'รอดำเนินการ', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
  APPROVED: { label: 'Approved', labelTh: 'อนุมัติ', className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' },
  REJECTED: { label: 'Rejected', labelTh: 'ปฏิเสธ', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
  DELETED: { label: 'Deleted', labelTh: 'ลบแล้ว', className: 'bg-red-100 text-red-800 hover:bg-red-100' }
}

interface StatusBadgeProps {
  status: StatusType
  showThai?: boolean
}

export function StatusBadge({ status, showThai = false }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge variant="secondary" className={cn('font-medium', config.className)}>
      {showThai ? config.labelTh : config.label}
    </Badge>
  )
}

// Usage
<StatusBadge status="ACTIVE" />
<StatusBadge status={item.status} showThai />
```

### Page Header

```typescript
// components/layout/page-header.tsx
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PageHeaderProps {
  title: string
  titleTh?: string
  description?: string
  descriptionTh?: string
  backHref?: string
  actions?: React.ReactNode
}

export function PageHeader({
  title,
  titleTh,
  description,
  descriptionTh,
  backHref,
  actions
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 pb-4 border-b">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {backHref && (
            <Button variant="ghost" size="icon" asChild>
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">
              {title}
              {titleTh && <span className="text-muted-foreground ml-2 text-lg">({titleTh})</span>}
            </h1>
            {(description || descriptionTh) && (
              <p className="text-muted-foreground">
                {description}
                {descriptionTh && <span className="ml-2">({descriptionTh})</span>}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </div>
  )
}
```

---

## Shadcn Commands

```bash
# Add components (run from frontend/next-app)
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add form
npx shadcn@latest add table
npx shadcn@latest add input
npx shadcn@latest add select
npx shadcn@latest add alert-dialog
npx shadcn@latest add badge
npx shadcn@latest add card
npx shadcn@latest add dropdown-menu
npx shadcn@latest add toast
npx shadcn@latest add data-table

# Initialize (if not done)
npx shadcn@latest init
```

---

## Tailwind CSS v4 Notes

```css
/* Tailwind v4 syntax in globals.css */
@import "tailwindcss";

@theme {
  --color-primary: oklch(0.6 0.2 250);
  --color-secondary: oklch(0.7 0.15 200);
  --font-sans: 'Inter', 'Sarabun', sans-serif;
}
```

---

## Best Practices

1. **Use `cn()` utility** for conditional class merging
2. **Support Thai/English** labels where appropriate
3. **Add loading states** for async operations
4. **Use semantic HTML** for accessibility
5. **Follow existing component patterns** in the project
6. **Keep components small** and composable

---

*Version: 1.0.0 | For HR-IMS Project*
