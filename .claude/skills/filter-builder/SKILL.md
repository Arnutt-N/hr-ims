---
name: filter-builder
description: Advanced filter and query builder for HR-IMS lists and tables
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["filter", "query builder", "advanced search", "criteria", "conditions"]
  file_patterns: ["*filter*", "components/filters/**", "lib/filters/**"]
  context: data filtering, query building, search criteria
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# Filter Builder

## Core Role

Build advanced filters for HR-IMS:
- Multi-criteria filtering
- Dynamic filter components
- Query string serialization
- Prisma query generation

---

## Filter Types

```yaml
filter_types:
  text:
    operators: [contains, starts_with, ends_with, equals, not_equals]
    use_case: "Name, description, email"

  number:
    operators: [equals, not_equals, gt, gte, lt, lte, between]
    use_case: "Quantity, price, age"

  date:
    operators: [equals, before, after, between, last_n_days, next_n_days]
    use_case: "Created at, updated at, due date"

  select:
    operators: [in, not_in, equals, not_equals]
    use_case: "Status, category, role"

  boolean:
    operators: [is_true, is_false]
    use_case: "Active, verified, completed"
```

---

## Filter Components

### Filter Definition

```typescript
// lib/filters/types.ts
type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'in'
  | 'not_in'
  | 'before'
  | 'after'
  | 'last_n_days'
  | 'next_n_days'
  | 'is_true'
  | 'is_false'

type FilterValue = string | number | boolean | Date | null | undefined | Array<string | number>

interface Filter {
  id: string
  field: string
  operator: FilterOperator
  value: FilterValue
  valueTo?: FilterValue // For 'between' operator
}

interface FilterGroup {
  id: string
  logic: 'AND' | 'OR'
  filters: Filter[]
  groups?: FilterGroup[]
}

interface FilterConfig {
  field: string
  label: string
  labelEn: string
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'multiselect'
  operators: FilterOperator[]
  options?: Array<{ value: string; label: string; labelEn: string }> // For select/multiselect
  defaultOperator?: FilterOperator
}
```

### Filter Registry

```typescript
// lib/filters/registry.ts
import { FilterConfig } from './types'

export const inventoryFilterConfigs: FilterConfig[] = [
  {
    field: 'name',
    label: 'ชื่อสินค้า',
    labelEn: 'Item Name',
    type: 'text',
    operators: ['contains', 'starts_with', 'ends_with', 'equals']
  },
  {
    field: 'status',
    label: 'สถานะ',
    labelEn: 'Status',
    type: 'select',
    operators: ['in', 'not_in', 'equals'],
    options: [
      { value: 'ACTIVE', label: 'ใช้งาน', labelEn: 'Active' },
      { value: 'INACTIVE', label: 'ไม่ใช้งาน', labelEn: 'Inactive' },
      { value: 'DISPOSED', label: 'จำหน่าย', labelEn: 'Disposed' }
    ]
  },
  {
    field: 'quantity',
    label: 'จำนวน',
    labelEn: 'Quantity',
    type: 'number',
    operators: ['equals', 'gt', 'gte', 'lt', 'lte', 'between']
  },
  {
    field: 'price',
    label: 'ราคา',
    labelEn: 'Price',
    type: 'number',
    operators: ['equals', 'gt', 'gte', 'lt', 'lte', 'between']
  },
  {
    field: 'categoryId',
    label: 'หมวดหมู่',
    labelEn: 'Category',
    type: 'select',
    operators: ['in', 'not_in', 'equals'],
    options: [] // Loaded dynamically
  },
  {
    field: 'warehouseId',
    label: 'คลังสินค้า',
    labelEn: 'Warehouse',
    type: 'select',
    operators: ['in', 'not_in', 'equals'],
    options: [] // Loaded dynamically
  },
  {
    field: 'createdAt',
    label: 'วันที่สร้าง',
    labelEn: 'Created At',
    type: 'date',
    operators: ['before', 'after', 'between', 'last_n_days']
  },
  {
    field: 'lowStock',
    label: 'สต็อกต่ำ',
    labelEn: 'Low Stock',
    type: 'boolean',
    operators: ['is_true', 'is_false']
  }
]

export const userFilterConfigs: FilterConfig[] = [
  {
    field: 'name',
    label: 'ชื่อ',
    labelEn: 'Name',
    type: 'text',
    operators: ['contains', 'starts_with', 'equals']
  },
  {
    field: 'email',
    label: 'อีเมล',
    labelEn: 'Email',
    type: 'text',
    operators: ['contains', 'equals']
  },
  {
    field: 'department',
    label: 'แผนก',
    labelEn: 'Department',
    type: 'text',
    operators: ['contains', 'equals']
  },
  {
    field: 'roles',
    label: 'บทบาท',
    labelEn: 'Roles',
    type: 'multiselect',
    operators: ['in', 'not_in'],
    options: [
      { value: 'admin', label: 'ผู้ดูแลระบบ', labelEn: 'Admin' },
      { value: 'superadmin', label: 'ผู้ดูแลสูงสุด', labelEn: 'Super Admin' },
      { value: 'approver', label: 'ผู้อนุมัติ', labelEn: 'Approver' },
      { value: 'auditor', label: 'ผู้ตรวจสอบ', labelEn: 'Auditor' },
      { value: 'technician', label: 'ช่างเทคนิค', labelEn: 'Technician' },
      { value: 'user', label: 'ผู้ใช้ทั่วไป', labelEn: 'User' }
    ]
  },
  {
    field: 'status',
    label: 'สถานะ',
    labelEn: 'Status',
    type: 'select',
    operators: ['equals', 'in'],
    options: [
      { value: 'ACTIVE', label: 'ใช้งาน', labelEn: 'Active' },
      { value: 'INACTIVE', label: 'ไม่ใช้งาน', labelEn: 'Inactive' },
      { value: 'SUSPENDED', label: 'ระงับ', labelEn: 'Suspended' }
    ]
  }
]
```

### Filter Input Components

```typescript
// components/filters/filter-input.tsx
'use client'

import { Filter, FilterConfig, FilterOperator } from '@/lib/filters/types'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FilterInputProps {
  filter: Filter
  config: FilterConfig
  onChange: (filter: Filter) => void
  onRemove: () => void
  locale?: 'th' | 'en'
}

const operatorLabels: Record<FilterOperator, { th: string; en: string }> = {
  equals: { th: 'เท่ากับ', en: 'Equals' },
  not_equals: { th: 'ไม่เท่ากับ', en: 'Not equals' },
  contains: { th: 'มีคำว่า', en: 'Contains' },
  starts_with: { th: 'ขึ้นต้นด้วย', en: 'Starts with' },
  ends_with: { th: 'ลงท้ายด้วย', en: 'Ends with' },
  gt: { th: 'มากกว่า', en: 'Greater than' },
  gte: { th: 'มากกว่าหรือเท่ากับ', en: 'Greater or equal' },
  lt: { th: 'น้อยกว่า', en: 'Less than' },
  lte: { th: 'น้อยกว่าหรือเท่ากับ', en: 'Less or equal' },
  between: { th: 'ระหว่าง', en: 'Between' },
  in: { th: 'อยู่ใน', en: 'In' },
  not_in: { th: 'ไม่อยู่ใน', en: 'Not in' },
  before: { th: 'ก่อน', en: 'Before' },
  after: { th: 'หลัง', en: 'After' },
  last_n_days: { th: 'ในช่วง ... วันที่ผ่านมา', en: 'Last N days' },
  next_n_days: { th: 'ในช่วง ... วันข้างหน้า', en: 'Next N days' },
  is_true: { th: 'ใช่', en: 'Is true' },
  is_false: { th: 'ไม่ใช่', en: 'Is false' }
}

export function FilterInput({
  filter,
  config,
  onChange,
  onRemove,
  locale = 'th'
}: FilterInputProps) {
  const t = (key: 'th' | 'en') => locale === 'th' ? key : key

  const handleOperatorChange = (operator: FilterOperator) => {
    onChange({ ...filter, operator, value: null })
  }

  const handleValueChange = (value: any) => {
    onChange({ ...filter, value })
  }

  const renderValueInput = () => {
    switch (config.type) {
      case 'text':
        return (
          <Input
            value={(filter.value as string) || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={`${config.label} / ${config.labelEn}`}
            className="min-w-[200px]"
          />
        )

      case 'number':
        if (filter.operator === 'between') {
          return (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={(filter.value as number) || ''}
                onChange={(e) => handleValueChange(Number(e.target.value))}
                placeholder="จาก / From"
                className="w-24"
              />
              <span>-</span>
              <Input
                type="number"
                value={(filter.valueTo as number) || ''}
                onChange={(e) => onChange({ ...filter, valueTo: Number(e.target.value) })}
                placeholder="ถึง / To"
                className="w-24"
              />
            </div>
          )
        }
        return (
          <Input
            type="number"
            value={(filter.value as number) || ''}
            onChange={(e) => handleValueChange(Number(e.target.value))}
            className="w-32"
          />
        )

      case 'date':
        if (filter.operator === 'between') {
          return (
            <DateRangePicker
              dateRange={filter.value ? { from: filter.value as Date, to: filter.valueTo as Date } : undefined}
              onDateRangeChange={(range) => {
                onChange({ ...filter, value: range?.from, valueTo: range?.to })
              }}
            />
          )
        }
        if (filter.operator === 'last_n_days' || filter.operator === 'next_n_days') {
          return (
            <Input
              type="number"
              value={(filter.value as number) || ''}
              onChange={(e) => handleValueChange(Number(e.target.value))}
              placeholder="จำนวนวัน / Days"
              className="w-32"
            />
          )
        }
        return (
          <DatePicker
            date={filter.value as Date}
            onDateChange={handleValueChange}
          />
        )

      case 'select':
        return (
          <Select
            value={(filter.value as string) || ''}
            onValueChange={handleValueChange}
          >
            <SelectTrigger className="min-w-[150px]">
              <SelectValue placeholder="เลือก / Select" />
            </SelectTrigger>
            <SelectContent>
              {config.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label} / {opt.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multiselect':
        return (
          <Select
            value={(filter.value as string) || ''}
            onValueChange={handleValueChange}
          >
            <SelectTrigger className="min-w-[150px]">
              <SelectValue placeholder="เลือก / Select" />
            </SelectTrigger>
            <SelectContent>
              {config.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label} / {opt.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'boolean':
        return null // Boolean operators don't need value input

      default:
        return null
    }
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
      {/* Field Label */}
      <span className="font-medium text-sm whitespace-nowrap">
        {config.label}
      </span>

      {/* Operator Select */}
      <Select value={filter.operator} onValueChange={handleOperatorChange}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {config.operators.map((op) => (
            <SelectItem key={op} value={op}>
              {operatorLabels[op].th}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value Input */}
      {renderValueInput()}

      {/* Remove Button */}
      <Button variant="ghost" size="icon" onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
```

### Filter Builder Component

```typescript
// components/filters/filter-builder.tsx
'use client'

import { useState } from 'react'
import { Filter, FilterGroup, FilterConfig } from '@/lib/filters/types'
import { FilterInput } from './filter-input'
import { Button } from '@/components/ui/button'
import { Plus, Filter as FilterIcon } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { v4 as uuidv4 } from 'uuid'

interface FilterBuilderProps {
  configs: FilterConfig[]
  value: FilterGroup
  onChange: (group: FilterGroup) => void
  locale?: 'th' | 'en'
}

export function FilterBuilder({
  configs,
  value,
  onChange,
  locale = 'th'
}: FilterBuilderProps) {
  const [selectedField, setSelectedField] = useState<string>('')

  const addFilter = () => {
    if (!selectedField) return

    const config = configs.find((c) => c.field === selectedField)
    if (!config) return

    const newFilter: Filter = {
      id: uuidv4(),
      field: selectedField,
      operator: config.defaultOperator || config.operators[0],
      value: null
    }

    onChange({
      ...value,
      filters: [...value.filters, newFilter]
    })

    setSelectedField('')
  }

  const updateFilter = (filterId: string, updatedFilter: Filter) => {
    onChange({
      ...value,
      filters: value.filters.map((f) =>
        f.id === filterId ? updatedFilter : f
      )
    })
  }

  const removeFilter = (filterId: string) => {
    onChange({
      ...value,
      filters: value.filters.filter((f) => f.id !== filterId)
    })
  }

  const clearFilters = () => {
    onChange({ ...value, filters: [] })
  }

  const toggleLogic = () => {
    onChange({
      ...value,
      logic: value.logic === 'AND' ? 'OR' : 'AND'
    })
  }

  return (
    <div className="space-y-3">
      {/* Logic Toggle */}
      {value.filters.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Match:</span>
          <Button
            variant={value.logic === 'AND' ? 'default' : 'outline'}
            size="sm"
            onClick={toggleLogic}
          >
            AND
          </Button>
          <Button
            variant={value.logic === 'OR' ? 'default' : 'outline'}
            size="sm"
            onClick={toggleLogic}
          >
            OR
          </Button>
        </div>
      )}

      {/* Active Filters */}
      {value.filters.map((filter) => {
        const config = configs.find((c) => c.field === filter.field)
        if (!config) return null

        return (
          <FilterInput
            key={filter.id}
            filter={filter}
            config={config}
            onChange={(f) => updateFilter(filter.id, f)}
            onRemove={() => removeFilter(filter.id)}
            locale={locale}
          />
        )
      })}

      {/* Add Filter */}
      <div className="flex items-center gap-2">
        <Select value={selectedField} onValueChange={setSelectedField}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="เพิ่มตัวกรอง / Add filter" />
          </SelectTrigger>
          <SelectContent>
            {configs.map((config) => (
              <SelectItem key={config.field} value={config.field}>
                {config.label} / {config.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={addFilter} disabled={!selectedField}>
          <Plus className="h-4 w-4 mr-1" />
          เพิ่ม / Add
        </Button>

        {value.filters.length > 0 && (
          <Button variant="ghost" onClick={clearFilters}>
            ล้าง / Clear
          </Button>
        )}
      </div>
    </div>
  )
}
```

---

## Prisma Query Generation

```typescript
// lib/filters/prisma-builder.ts
import { Filter, FilterGroup, FilterOperator } from './types'
import { Prisma } from '@prisma/client'
import { subDays, addDays } from 'date-fns'

export function buildPrismaWhere(
  group: FilterGroup
): Prisma.WhereInput {
  const conditions: Prisma.WhereInput[] = []

  for (const filter of group.filters) {
    const condition = buildFilterCondition(filter)
    if (condition) {
      conditions.push(condition)
    }
  }

  if (conditions.length === 0) {
    return {}
  }

  if (conditions.length === 1) {
    return conditions[0]
  }

  return group.logic === 'AND'
    ? { AND: conditions }
    : { OR: conditions }
}

function buildFilterCondition(filter: Filter): Prisma.WhereInput | null {
  const { field, operator, value, valueTo } = filter

  if (value === null || value === undefined || value === '') {
    return null
  }

  switch (operator) {
    case 'equals':
      return { [field]: value }

    case 'not_equals':
      return { [field]: { not: value } }

    case 'contains':
      return { [field]: { contains: value as string, mode: 'insensitive' } }

    case 'starts_with':
      return { [field]: { startsWith: value as string, mode: 'insensitive' } }

    case 'ends_with':
      return { [field]: { endsWith: value as string, mode: 'insensitive' } }

    case 'gt':
      return { [field]: { gt: value } }

    case 'gte':
      return { [field]: { gte: value } }

    case 'lt':
      return { [field]: { lt: value } }

    case 'lte':
      return { [field]: { lte: value } }

    case 'between':
      return {
        [field]: {
          gte: value,
          lte: valueTo
        }
      }

    case 'in':
      return { [field]: { in: Array.isArray(value) ? value : [value] } }

    case 'not_in':
      return { [field]: { notIn: Array.isArray(value) ? value : [value] } }

    case 'before':
      return { [field]: { lt: value } }

    case 'after':
      return { [field]: { gt: value } }

    case 'last_n_days':
      const startDate = subDays(new Date(), value as number)
      return { [field]: { gte: startDate } }

    case 'next_n_days':
      const endDate = addDays(new Date(), value as number)
      return { [field]: { lte: endDate } }

    case 'is_true':
      return { [field]: true }

    case 'is_false':
      return { [field]: false }

    default:
      return null
  }
}
```

---

## URL Serialization

```typescript
// lib/filters/url-serializer.ts
import { Filter, FilterGroup } from './types'

export function serializeFiltersToUrl(group: FilterGroup): URLSearchParams {
  const params = new URLSearchParams()

  params.set('logic', group.logic)

  group.filters.forEach((filter, index) => {
    params.set(`f${index}_field`, filter.field)
    params.set(`f${index}_op`, filter.operator)

    if (filter.value !== null && filter.value !== undefined) {
      if (filter.value instanceof Date) {
        params.set(`f${index}_val`, filter.value.toISOString())
      } else if (Array.isArray(filter.value)) {
        params.set(`f${index}_val`, filter.value.join(','))
      } else {
        params.set(`f${index}_val`, String(filter.value))
      }
    }

    if (filter.valueTo !== null && filter.valueTo !== undefined) {
      if (filter.valueTo instanceof Date) {
        params.set(`f${index}_valTo`, filter.valueTo.toISOString())
      } else {
        params.set(`f${index}_valTo`, String(filter.valueTo))
      }
    }
  })

  return params
}

export function deserializeFiltersFromUrl(
  searchParams: URLSearchParams
): FilterGroup {
  const logic = (searchParams.get('logic') as 'AND' | 'OR') || 'AND'
  const filters: Filter[] = []

  let index = 0
  while (searchParams.has(`f${index}_field`)) {
    const field = searchParams.get(`f${index}_field`)!
    const operator = searchParams.get(`f${index}_op`) as FilterOperator
    const valueStr = searchParams.get(`f${index}_val`)
    const valueToStr = searchParams.get(`f${index}_valTo`)

    let value: any = valueStr
    let valueTo: any = valueToStr

    // Try to parse as date
    if (valueStr && !isNaN(Date.parse(valueStr))) {
      value = new Date(valueStr)
    }
    if (valueToStr && !isNaN(Date.parse(valueToStr))) {
      valueTo = new Date(valueToStr)
    }

    // Try to parse as number
    if (valueStr && !isNaN(Number(valueStr)) && !valueStr.includes('-')) {
      value = Number(valueStr)
    }

    filters.push({
      id: `filter-${index}`,
      field,
      operator,
      value,
      valueTo
    })

    index++
  }

  return { id: 'root', logic, filters }
}
```

---

## Filter Hook

```typescript
// hooks/use-filters.ts
'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { FilterGroup } from '@/lib/filters/types'
import { serializeFiltersToUrl, deserializeFiltersFromUrl } from '@/lib/filters/url-serializer'

export function useFilters(defaultLogic: 'AND' | 'OR' = 'AND') {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const initialGroup = deserializeFiltersFromUrl(searchParams)

  const [filters, setFilters] = useState<FilterGroup>(
    initialGroup.filters.length > 0
      ? initialGroup
      : { id: 'root', logic: defaultLogic, filters: [] }
  )

  const updateFilters = useCallback((group: FilterGroup) => {
    setFilters(group)

    // Update URL
    const params = serializeFiltersToUrl(group)
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.push(newUrl, { scroll: false })
  }, [router, pathname])

  const resetFilters = useCallback(() => {
    setFilters({ id: 'root', logic: defaultLogic, filters: [] })
    router.push(pathname, { scroll: false })
  }, [router, pathname, defaultLogic])

  const hasActiveFilters = filters.filters.length > 0

  return {
    filters,
    setFilters: updateFilters,
    resetFilters,
    hasActiveFilters
  }
}
```

---

## Server Action Integration

```typescript
// lib/actions/inventory-filtered.ts
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { FilterGroup } from '@/lib/filters/types'
import { buildPrismaWhere } from '@/lib/filters/prisma-builder'
import { paginate, PaginationParams, PaginationResult } from '@/lib/pagination'

export async function getFilteredInventory(
  filterGroup: FilterGroup,
  pagination: PaginationParams
): Promise<PaginationResult<InventoryItem>> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const where = buildPrismaWhere(filterGroup)

  return paginate(prisma.inventoryItem, pagination, {
    where,
    include: {
      category: { select: { id: true, name: true } },
      warehouse: { select: { id: true, name: true } }
    }
  })
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
