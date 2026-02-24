---
name: category-manager
description: Manage item categories and classification hierarchy for inventory
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["category", "categories", "classification", "group", "hierarchy"]
  file_patterns: ["*category*", "app/(dashboard)/settings/categories/**"]
  context: inventory, classification, organization
mcp_servers:
  - sequential
personas:
  - backend
  - frontend
---

# Category Manager

## Core Role

Manage inventory categorization system:
- Category CRUD operations
- Hierarchical categories (parent/child)
- Category assignment to items
- Bulk categorization

---

## Data Model

```prisma
model Category {
  id          Int        @id @default(autoincrement())
  name        String     @db.VarChar(255)
  slug        String     @unique @db.VarChar(100)
  description String?
  parentId    Int?
  parent      Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryHierarchy")
  icon        String?    @db.VarChar(50)
  color       String?    @db.VarChar(7)
  sortOrder   Int        @default(0)
  isActive    Boolean    @default(true)

  items       InventoryItem[]

  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([parentId])
  @@map("categories")
}
```

---

## Server Actions

### Category CRUD

```typescript
// lib/actions/categories.ts
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  parentId: z.number().positive().optional(),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
})

export async function createCategory(input: z.infer<typeof createCategorySchema>) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const hasPermission = await hasAnyRole(parseInt(session.user.id), ['admin', 'superadmin'])
  if (!hasPermission) {
    return { error: 'Forbidden', code: 'FORBIDDEN' }
  }

  const validated = createCategorySchema.safeParse(input)
  if (!validated.success) {
    return { error: 'Invalid input', code: 'VALIDATION_ERROR', details: validated.error.flatten() }
  }

  try {
    // Check slug uniqueness
    const existing = await prisma.category.findUnique({
      where: { slug: validated.data.slug }
    })
    if (existing) {
      return { error: 'Slug already exists', code: 'DUPLICATE' }
    }

    // Validate parent exists if provided
    if (validated.data.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: validated.data.parentId }
      })
      if (!parent) {
        return { error: 'Parent category not found', code: 'NOT_FOUND' }
      }
    }

    const category = await prisma.$transaction(async (tx) => {
      const newCategory = await tx.category.create({
        data: validated.data
      })

      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          tableName: 'Category',
          recordId: newCategory.id.toString(),
          userId: parseInt(session.user.id),
          newData: newCategory
        }
      })

      return newCategory
    })

    revalidatePath('/settings/categories')
    return { success: true, data: category }

  } catch (error) {
    return { error: 'Failed to create category', code: 'INTERNAL_ERROR' }
  }
}

export async function updateCategory(
  id: number,
  input: Partial<z.infer<typeof createCategorySchema>>
) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const hasPermission = await hasAnyRole(parseInt(session.user.id), ['admin', 'superadmin'])
  if (!hasPermission) {
    return { error: 'Forbidden', code: 'FORBIDDEN' }
  }

  try {
    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing) {
      return { error: 'Category not found', code: 'NOT_FOUND' }
    }

    // Prevent setting parent to self or descendant
    if (input.parentId === id) {
      return { error: 'Cannot set parent to self', code: 'VALIDATION_ERROR' }
    }

    const category = await prisma.$transaction(async (tx) => {
      const updated = await tx.category.update({
        where: { id },
        data: input
      })

      await tx.auditLog.create({
        data: {
          action: 'UPDATE',
          tableName: 'Category',
          recordId: id.toString(),
          userId: parseInt(session.user.id),
          oldData: existing,
          newData: updated
        }
      })

      return updated
    })

    revalidatePath('/settings/categories')
    return { success: true, data: category }

  } catch (error) {
    return { error: 'Failed to update category', code: 'INTERNAL_ERROR' }
  }
}

export async function deleteCategory(id: number, transferToId?: number) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        items: { select: { id: true } },
        children: { select: { id: true } }
      }
    })

    if (!category) {
      return { error: 'Category not found', code: 'NOT_FOUND' }
    }

    // Check for items in this category
    if (category.items.length > 0 && !transferToId) {
      return {
        error: 'Category has items. Specify transfer target or reassign items first.',
        code: 'CONSTRAINT_VIOLATION'
      }
    }

    await prisma.$transaction(async (tx) => {
      // Transfer items to new category
      if (category.items.length > 0 && transferToId) {
        await tx.inventoryItem.updateMany({
          where: { categoryId: id },
          data: { categoryId: transferToId }
        })
      }

      // Move children to parent
      await tx.category.updateMany({
        where: { parentId: id },
        data: { parentId: category.parentId }
      })

      // Delete category
      await tx.category.delete({ where: { id } })

      await tx.auditLog.create({
        data: {
          action: 'DELETE',
          tableName: 'Category',
          recordId: id.toString(),
          userId: parseInt(session.user.id),
          oldData: category
        }
      })
    })

    revalidatePath('/settings/categories')
    return { success: true }

  } catch (error) {
    return { error: 'Failed to delete category', code: 'INTERNAL_ERROR' }
  }
}
```

### Query Categories

```typescript
export async function getCategories(includeItems: boolean = false) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    include: {
      children: true,
      ...(includeItems && {
        items: {
          select: { id: true, name: true }
        }
      }),
      _count: {
        select: { items: true }
      }
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
  })

  // Build tree structure
  const tree = buildCategoryTree(categories)

  return { success: true, data: { flat: categories, tree } }
}

function buildCategoryTree(categories: any[]): any[] {
  const map = new Map(categories.map(c => [c.id, { ...c, children: [] }]))
  const roots: any[] = []

  categories.forEach(c => {
    const node = map.get(c.id)!
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

export async function getCategoryWithItems(categoryId: number) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      parent: true,
      children: true,
      items: {
        include: {
          stockLevels: { include: { warehouse: true } }
        }
      }
    }
  })

  if (!category) {
    return { error: 'Category not found', code: 'NOT_FOUND' }
  }

  return { success: true, data: category }
}
```

---

## Frontend Components

### Category Tree Component

```typescript
// components/categories/category-tree.tsx
'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CategoryNode {
  id: number
  name: string
  slug: string
  icon?: string
  color?: string
  _count?: { items: number }
  children: CategoryNode[]
}

interface CategoryTreeProps {
  categories: CategoryNode[]
  selectedId?: number
  onSelect: (category: CategoryNode) => void
}

export function CategoryTree({ categories, selectedId, onSelect }: CategoryTreeProps) {
  return (
    <div className="space-y-1">
      {categories.map(category => (
        <CategoryNode
          key={category.id}
          category={category}
          level={0}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function CategoryNode({
  category,
  level,
  selectedId,
  onSelect
}: {
  category: CategoryNode
  level: number
  selectedId?: number
  onSelect: (category: CategoryNode) => void
}) {
  const [isOpen, setIsOpen] = useState(level < 2)
  const hasChildren = category.children?.length > 0
  const isSelected = category.id === selectedId

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-muted",
          isSelected && "bg-primary/10 text-primary"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(category)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(!isOpen)
            }}
            className="p-0.5"
          >
            {isOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {isOpen && hasChildren ? (
          <FolderOpen className="w-4 h-4 text-amber-500" />
        ) : (
          <Folder className="w-4 h-4 text-amber-500" />
        )}

        <span className="flex-1">{category.name}</span>

        {category._count && (
          <span className="text-xs text-muted-foreground">
            {category._count.items}
          </span>
        )}
      </div>

      {isOpen && hasChildren && (
        <div>
          {category.children.map(child => (
            <CategoryNode
              key={child.id}
              category={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

### Category Select Component

```typescript
// components/categories/category-select.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { getCategories } from '@/lib/actions/categories'

interface CategorySelectProps {
  value?: number
  onChange: (value: number) => void
  placeholder?: string
}

export function CategorySelect({ value, onChange, placeholder = 'Select category' }: CategorySelectProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories()
  })

  if (isLoading) {
    return <Select disabled><SelectTrigger><SelectValue placeholder="Loading..." /></SelectTrigger></Select>
  }

  const categories = data?.data?.flat || []

  return (
    <Select value={value?.toString()} onValueChange={(v) => onChange(parseInt(v))}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {categories.map(category => (
          <SelectItem
            key={category.id}
            value={category.id.toString()}
          >
            {category.parentId ? '　' : ''}{category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

---

## Bulk Operations

```typescript
export async function bulkAssignCategory(itemIds: number[], categoryId: number) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const hasPermission = await hasAnyRole(parseInt(session.user.id), ['admin', 'superadmin'])
  if (!hasPermission) {
    return { error: 'Forbidden', code: 'FORBIDDEN' }
  }

  try {
    const result = await prisma.inventoryItem.updateMany({
      where: { id: { in: itemIds } },
      data: { categoryId }
    })

    revalidatePath('/inventory')
    return { success: true, data: { updated: result.count } }

  } catch (error) {
    return { error: 'Failed to assign category', code: 'INTERNAL_ERROR' }
  }
}

export async function reorderCategories(order: { id: number; sortOrder: number }[]) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  await prisma.$transaction(
    order.map(item =>
      prisma.category.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder }
      })
    )
  )

  revalidatePath('/settings/categories')
  return { success: true }
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
