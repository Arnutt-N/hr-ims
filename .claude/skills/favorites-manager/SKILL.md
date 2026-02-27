---
name: favorites-manager
description: Favorites and bookmarks management for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["favorite", "bookmark", "saved items", "star", "pin"]
  file_patterns: ["*favorite*", "*bookmark*", "lib/favorites*"]
  context: favorites, bookmarks, saved items, starred items, quick access
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# Favorites Manager

## Core Role

Manage favorites and bookmarks for HR-IMS:
- Favorite items
- Saved searches
- Quick access shortcuts
- Pinned items

---

## Favorites Service

```typescript
// lib/favorites/service.ts
import prisma from '@/lib/prisma'

export type FavoriteType = 'item' | 'request' | 'user' | 'warehouse' | 'search' | 'report'

export interface Favorite {
  id: number
  userId: number
  type: FavoriteType
  entityId: number | null
  name: string
  data?: Record<string, any>
  sortOrder: number
  createdAt: Date
}

// Add favorite
export async function addFavorite(data: {
  userId: number
  type: FavoriteType
  entityId?: number
  name: string
  data?: Record<string, any>
}): Promise<Favorite> {
  // Check if already exists
  const existing = await prisma.favorite.findFirst({
    where: {
      userId: data.userId,
      type: data.type,
      entityId: data.entityId || null
    }
  })

  if (existing) {
    return existing
  }

  // Get max sort order
  const maxSort = await prisma.favorite.aggregate({
    where: {
      userId: data.userId,
      type: data.type
    },
    _max: { sortOrder: true }
  })

  const favorite = await prisma.favorite.create({
    data: {
      userId: data.userId,
      type: data.type,
      entityId: data.entityId || null,
      name: data.name,
      data: data.data || {},
      sortOrder: (maxSort._max.sortOrder || 0) + 1
    }
  })

  return favorite
}

// Remove favorite
export async function removeFavorite(options: {
  userId: number
  type: FavoriteType
  entityId?: number
}): Promise<boolean> {
  const result = await prisma.favorite.deleteMany({
    where: {
      userId: options.userId,
      type: options.type,
      entityId: options.entityId || null
    }
  })

  return result.count > 0
}

// Remove favorite by ID
export async function removeFavoriteById(id: number, userId: number): Promise<boolean> {
  const result = await prisma.favorite.deleteMany({
    where: { id, userId }
  })

  return result.count > 0
}

// Check if favorited
export async function isFavorited(options: {
  userId: number
  type: FavoriteType
  entityId?: number
}): Promise<boolean> {
  const count = await prisma.favorite.count({
    where: {
      userId: options.userId,
      type: options.type,
      entityId: options.entityId || null
    }
  })

  return count > 0
}

// Get user favorites by type
export async function getUserFavorites(
  userId: number,
  type?: FavoriteType
): Promise<Favorite[]> {
  return prisma.favorite.findMany({
    where: {
      userId,
      ...(type && { type })
    },
    orderBy: { sortOrder: 'asc' }
  })
}

// Get favorite items with details
export async function getFavoriteItems(userId: number): Promise<any[]> {
  const favorites = await prisma.favorite.findMany({
    where: {
      userId,
      type: 'item'
    },
    orderBy: { sortOrder: 'asc' }
  })

  if (favorites.length === 0) return []

  const itemIds = favorites
    .map(f => f.entityId)
    .filter((id): id is number => id !== null)

  const items = await prisma.inventoryItem.findMany({
    where: { id: { in: itemIds } },
    include: {
      category: true,
      stockLevels: {
        include: { warehouse: true }
      }
    }
  })

  // Map to preserve order
  const itemMap = new Map(items.map(item => [item.id, item]))

  return favorites.map(fav => ({
    ...itemMap.get(fav.entityId!),
    favoriteId: fav.id,
    sortOrder: fav.sortOrder
  })).filter(Boolean)
}

// Update sort order
export async function updateFavoriteOrder(
  userId: number,
  favoriteIds: number[]
): Promise<void> {
  await Promise.all(
    favoriteIds.map((id, index) =>
      prisma.favorite.updateMany({
        where: { id, userId },
        data: { sortOrder: index }
      })
    )
  )
}

// Save search
export async function saveSearch(data: {
  userId: number
  name: string
  type: 'item' | 'request' | 'user'
  filters: Record<string, any>
}): Promise<Favorite> {
  return addFavorite({
    userId: data.userId,
    type: 'search',
    name: data.name,
    data: {
      searchType: data.type,
      filters: data.filters
    }
  })
}

// Get saved searches
export async function getSavedSearches(
  userId: number,
  searchType?: 'item' | 'request' | 'user'
): Promise<Favorite[]> {
  const favorites = await prisma.favorite.findMany({
    where: {
      userId,
      type: 'search',
      ...(searchType && {
        data: {
          path: ['searchType'],
          equals: searchType
        }
      })
    },
    orderBy: { sortOrder: 'asc' }
  })

  return favorites
}

// Get recent favorites
export async function getRecentFavorites(
  userId: number,
  limit: number = 5
): Promise<Favorite[]> {
  return prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit
  })
}
```

---

## Favorites Hook

```typescript
// hooks/use-favorites.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  addFavorite,
  removeFavorite,
  isFavorited,
  getUserFavorites,
  FavoriteType,
  Favorite
} from '@/lib/favorites/service'

export function useFavorites(type?: FavoriteType) {
  const { data: session } = useSession()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFavorites = useCallback(async () => {
    if (!session?.user?.id) return

    setLoading(true)
    try {
      const data = await getUserFavorites(
        parseInt(session.user.id),
        type
      )
      setFavorites(data)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, type])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  const add = useCallback(async (
    favType: FavoriteType,
    entityId: number | undefined,
    name: string,
    data?: Record<string, any>
  ) => {
    if (!session?.user?.id) return false

    try {
      await addFavorite({
        userId: parseInt(session.user.id),
        type: favType,
        entityId,
        name,
        data
      })
      await fetchFavorites()
      return true
    } catch {
      return false
    }
  }, [session?.user?.id, fetchFavorites])

  const remove = useCallback(async (
    favType: FavoriteType,
    entityId: number | undefined
  ) => {
    if (!session?.user?.id) return false

    try {
      await removeFavorite({
        userId: parseInt(session.user.id),
        type: favType,
        entityId
      })
      await fetchFavorites()
      return true
    } catch {
      return false
    }
  }, [session?.user?.id, fetchFavorites])

  const isFavorite = useCallback(async (
    favType: FavoriteType,
    entityId: number | undefined
  ): Promise<boolean> => {
    if (!session?.user?.id) return false

    return isFavorited({
      userId: parseInt(session.user.id),
      type: favType,
      entityId
    })
  }, [session?.user?.id])

  return {
    favorites,
    loading,
    add,
    remove,
    isFavorite,
    refresh: fetchFavorites
  }
}

// Single item favorite check
export function useIsFavorite(type: FavoriteType, entityId: number | undefined) {
  const { data: session } = useSession()
  const [isFav, setIsFav] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const check = async () => {
      if (!session?.user?.id || entityId === undefined) {
        setLoading(false)
        return
      }

      setLoading(true)
      const result = await isFavorited({
        userId: parseInt(session.user.id),
        type,
        entityId
      })
      setIsFav(result)
      setLoading(false)
    }

    check()
  }, [session?.user?.id, type, entityId])

  return { isFavorite: isFav, loading }
}
```

---

## Favorite Button Component

```typescript
// components/favorites/favorite-button.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FavoriteType } from '@/lib/favorites/service'

interface FavoriteButtonProps {
  type: FavoriteType
  entityId: number
  name: string
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  onToggle?: (isFavorite: boolean) => void
}

export function FavoriteButton({
  type,
  entityId,
  name,
  className,
  showLabel = false,
  size = 'md',
  onToggle
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(false)

  // Check initial state
  useEffect(() => {
    const check = async () => {
      const response = await fetch(`/api/favorites/check?type=${type}&entityId=${entityId}`)
      const data = await response.json()
      setIsFavorite(data.isFavorite)
    }
    check()
  }, [type, entityId])

  const handleToggle = async () => {
    setLoading(true)
    try {
      if (isFavorite) {
        await fetch(`/api/favorites?type=${type}&entityId=${entityId}`, {
          method: 'DELETE'
        })
        setIsFavorite(false)
        onToggle?.(false)
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, entityId, name })
        })
        setIsFavorite(true)
        onToggle?.(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-10 w-10'
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(sizeClasses[size], className)}
      onClick={handleToggle}
      disabled={loading}
      title={isFavorite ? 'นำออกจากรายการโปรด / Remove from favorites' : 'เพิ่มในรายการโปรด / Add to favorites'}
    >
      <Star
        className={cn(
          'h-4 w-4 transition-colors',
          isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
        )}
      />
      {showLabel && (
        <span className="ml-2">
          {isFavorite ? 'นำออก' : 'บันทึก'}
        </span>
      )}
    </Button>
  )
}
```

---

## Favorites List Component

```typescript
// components/favorites/favorites-list.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Star, Trash2, GripVertical, Package, FileText, Search } from 'lucide-react'
import { Favorite, FavoriteType } from '@/lib/favorites/service'
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from '@hello-pangea/dnd'

interface FavoritesListProps {
  type?: FavoriteType
  limit?: number
  showReorder?: boolean
}

export function FavoritesList({
  type,
  limit,
  showReorder = false
}: FavoritesListProps) {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFavorites = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (type) params.append('type', type)
      if (limit) params.append('limit', limit.toString())

      const response = await fetch(`/api/favorites?${params}`)
      const data = await response.json()
      setFavorites(data.favorites || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFavorites()
  }, [type, limit])

  const handleRemove = async (id: number) => {
    await fetch(`/api/favorites/${id}`, { method: 'DELETE' })
    fetchFavorites()
  }

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(favorites)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setFavorites(items)

    // Update order on server
    await fetch('/api/favorites/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        favoriteIds: items.map(f => f.id)
      })
    })
  }

  const getTypeIcon = (favType: FavoriteType) => {
    switch (favType) {
      case 'item': return Package
      case 'request': return FileText
      case 'search': return Search
      default: return Star
    }
  }

  const getItemLink = (favorite: Favorite): string => {
    switch (favorite.type) {
      case 'item': return `/inventory/${favorite.entityId}`
      case 'request': return `/requests/${favorite.entityId}`
      case 'user': return `/users/${favorite.entityId}`
      case 'warehouse': return `/warehouse/${favorite.entityId}`
      case 'search': return `/inventory?saved=${favorite.id}`
      default: return '#'
    }
  }

  if (loading) {
    return <div className="text-center py-4">Loading...</div>
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>ไม่มีรายการโปรด / No favorites</p>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
          รายการโปรด / Favorites
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="favorites">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {favorites.map((favorite, index) => {
                      const Icon = getTypeIcon(favorite.type)

                      return (
                        <Draggable
                          key={favorite.id}
                          draggableId={favorite.id.toString()}
                          index={index}
                          isDragDisabled={!showReorder}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`
                                flex items-center gap-2 p-2 rounded-lg
                                hover:bg-muted transition-colors
                                ${snapshot.isDragging ? 'bg-muted shadow-lg' : ''}
                              `}
                            >
                              {showReorder && (
                                <div {...provided.dragHandleProps}>
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}

                              <Icon className="h-4 w-4 text-muted-foreground" />

                              <Link
                                href={getItemLink(favorite)}
                                className="flex-1 truncate text-sm hover:underline"
                              >
                                {favorite.name}
                              </Link>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemove(favorite.id)}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </div>
                          )}
                        </Draggable>
                      )
                    })}
                    {provided.placeholder}
                  </div>
                </ScrollArea>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </CardContent>
    </Card>
  )
}
```

---

## Quick Access Sidebar

```typescript
// components/favorites/quick-access.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Star, ChevronRight, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Favorite, FavoriteType } from '@/lib/favorites/service'

interface QuickAccessProps {
  collapsed?: boolean
}

export function QuickAccess({ collapsed = false }: QuickAccessProps) {
  const [favorites, setFavorites] = useState<Favorite[]>([])

  useEffect(() => {
    const fetch = async () => {
      const response = await fetch('/api/favorites?limit=10')
      const data = await response.json()
      setFavorites(data.favorites || [])
    }
    fetch()
  }, [])

  const getItemLink = (favorite: Favorite): string => {
    switch (favorite.type) {
      case 'item': return `/inventory/${favorite.entityId}`
      case 'request': return `/requests/${favorite.entityId}`
      default: return '#'
    }
  }

  if (collapsed) {
    return (
      <div className="p-2">
        <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
      </div>
    )
  }

  return (
    <div className="py-2">
      <div className="flex items-center justify-between px-3 mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase">
          Quick Access
        </span>
        <Link
          href="/favorites"
          className="text-xs text-primary hover:underline"
        >
          View All
        </Link>
      </div>

      <ScrollArea className="h-[200px]">
        <div className="space-y-1 px-2">
          {favorites.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2">
              No favorites yet
            </p>
          ) : (
            favorites.map((favorite) => (
              <Link
                key={favorite.id}
                href={getItemLink(favorite)}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted"
              >
                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                <span className="truncate">{favorite.name}</span>
              </Link>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
```

---

## API Routes

```typescript
// app/api/favorites/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  addFavorite,
  getUserFavorites,
  removeFavorite,
  FavoriteType
} from '@/lib/favorites/service'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') as FavoriteType | null
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

  const favorites = await getUserFavorites(
    parseInt(session.user.id),
    type || undefined
  )

  return NextResponse.json({
    favorites: limit ? favorites.slice(0, limit) : favorites
  })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { type, entityId, name, data } = body

  const favorite = await addFavorite({
    userId: parseInt(session.user.id),
    type,
    entityId,
    name,
    data
  })

  return NextResponse.json({ favorite })
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') as FavoriteType
  const entityId = searchParams.get('entityId') ? parseInt(searchParams.get('entityId')!) : undefined

  await removeFavorite({
    userId: parseInt(session.user.id),
    type,
    entityId
  })

  return NextResponse.json({ success: true })
}

// app/api/favorites/check/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { isFavorited, FavoriteType } from '@/lib/favorites/service'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ isFavorite: false })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') as FavoriteType
  const entityId = searchParams.get('entityId') ? parseInt(searchParams.get('entityId')!) : undefined

  const isFavorite = await isFavorited({
    userId: parseInt(session.user.id),
    type,
    entityId
  })

  return NextResponse.json({ isFavorite })
}
```

---

## Usage Examples

```tsx
// Example 1: Favorite button on item card
import { FavoriteButton } from '@/components/favorites/favorite-button'

function ItemCard({ item }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start">
        <h3>{item.name}</h3>
        <FavoriteButton
          type="item"
          entityId={item.id}
          name={item.name}
        />
      </div>
      <p>{item.description}</p>
    </div>
  )
}

// Example 2: Favorites sidebar
import { FavoritesList } from '@/components/favorites/favorites-list'

function Sidebar() {
  return (
    <aside>
      <FavoritesList type="item" limit={5} />
    </aside>
  )
}

// Example 3: Save search
import { saveSearch } from '@/lib/favorites/service'

function SearchForm() {
  const handleSaveSearch = async () => {
    await saveSearch({
      userId: session.user.id,
      name: 'My filtered items',
      type: 'item',
      filters: { category: 'electronics', status: 'available' }
    })
  }

  return (
    <Button onClick={handleSaveSearch}>
      Save Search
    </Button>
  )
}

// Example 4: Use favorites hook
import { useFavorites } from '@/hooks/use-favorites'

function FavoritesPage() {
  const { favorites, loading, add, remove, isFavorite } = useFavorites('item')

  return (
    <div>
      {favorites.map(fav => (
        <div key={fav.id}>
          {fav.name}
          <button onClick={() => remove('item', fav.entityId!)}>
            Remove
          </button>
        </div>
      ))}
    </div>
  )
}

// Example 5: Quick access in sidebar
import { QuickAccess } from '@/components/favorites/quick-access'

function MainLayout({ children }) {
  return (
    <div className="flex">
      <aside>
        <QuickAccess />
      </aside>
      <main>{children}</main>
    </div>
  )
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
