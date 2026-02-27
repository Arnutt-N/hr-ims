---
name: offline-support
description: Offline support and data synchronization for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["offline", "pwa", "service worker", "offline support", "sync", "indexeddb"]
  file_patterns: ["*offline*", "*pwa*", "*service-worker*", "lib/offline*"]
  context: offline support, PWA, service workers, data sync, IndexedDB
mcp_servers:
  - sequential
personas:
  - frontend
---

# Offline Support

## Core Role

Implement offline capabilities for HR-IMS:
- Service Worker for caching
- IndexedDB for offline storage
- Background sync
- Offline indicators

---

## Offline Storage (IndexedDB)

```typescript
// lib/offline/storage.ts

const DB_NAME = 'hr-ims-offline'
const DB_VERSION = 1

export interface OfflineStore {
  name: string
  keyPath: string
  indexes?: Array<{ name: string; keyPath: string }>
}

// Database schema
const stores: OfflineStore[] = [
  { name: 'inventory', keyPath: 'id', indexes: [{ name: 'code', keyPath: 'code' }] },
  { name: 'users', keyPath: 'id', indexes: [{ name: 'email', keyPath: 'email' }] },
  { name: 'requests', keyPath: 'id', indexes: [{ name: 'status', keyPath: 'status' }] },
  { name: 'pendingSync', keyPath: 'id', indexes: [{ name: 'timestamp', keyPath: 'timestamp' }] },
  { name: 'drafts', keyPath: 'id', indexes: [{ name: 'type', keyPath: 'type' }] }
]

// Open database
export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      stores.forEach((store) => {
        if (!db.objectStoreNames.contains(store.name)) {
          const objectStore = db.createObjectStore(store.name, { keyPath: store.keyPath })

          store.indexes?.forEach((index) => {
            objectStore.createIndex(index.name, index.keyPath)
          })
        }
      })
    }
  })
}

// Generic CRUD operations
export class OfflineStorage<T> {
  constructor(private storeName: string) {}

  // Get all items
  async getAll(): Promise<T[]> {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Get by ID
  async getById(id: number | string): Promise<T | undefined> {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Get by index
  async getByIndex(indexName: string, value: any): Promise<T[]> {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly')
      const store = transaction.objectStore(this.storeName)
      const index = store.index(indexName)
      const request = index.getAll(value)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Add item
  async add(item: T): Promise<IDBValidKey> {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.add(item)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Update item
  async put(item: T): Promise<IDBValidKey> {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(item)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Delete item
  async delete(id: number | string): Promise<void> {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Clear all items
  async clear(): Promise<void> {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Count items
  async count(): Promise<number> {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.count()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
}

// Create storage instances
export const inventoryStorage = new OfflineStorage<any>('inventory')
export const usersStorage = new OfflineStorage<any>('users')
export const requestsStorage = new OfflineStorage<any>('requests')
export const pendingSyncStorage = new OfflineStorage<any>('pendingSync')
export const draftsStorage = new OfflineStorage<any>('drafts')
```

---

## Sync Queue Manager

```typescript
// lib/offline/sync-queue.ts
import { pendingSyncStorage, openDatabase } from './storage'

export interface SyncQueueItem {
  id: string
  type: 'create' | 'update' | 'delete'
  entity: string
  data: any
  timestamp: number
  attempts: number
  lastError?: string
}

// Add item to sync queue
export async function addToSyncQueue(
  type: SyncQueueItem['type'],
  entity: string,
  data: any
): Promise<string> {
  const id = `${entity}-${Date.now()}-${Math.random().toString(36).slice(2)}`

  const item: SyncQueueItem = {
    id,
    type,
    entity,
    data,
    timestamp: Date.now(),
    attempts: 0
  }

  await pendingSyncStorage.add(item)
  return id
}

// Get all pending sync items
export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  return pendingSyncStorage.getAll()
}

// Remove item from sync queue
export async function removeFromSyncQueue(id: string): Promise<void> {
  await pendingSyncStorage.delete(id)
}

// Update sync attempt
export async function updateSyncAttempt(
  id: string,
  error?: string
): Promise<void> {
  const item = await pendingSyncStorage.getById(id)
  if (item) {
    item.attempts++
    item.lastError = error
    await pendingSyncStorage.put(item)
  }
}

// Process sync queue
export async function processSyncQueue(
  processor: (item: SyncQueueItem) => Promise<boolean>
): Promise<{ processed: number; failed: number }> {
  const items = await getPendingSyncItems()
  let processed = 0
  let failed = 0

  for (const item of items) {
    try {
      const success = await processor(item)
      if (success) {
        await removeFromSyncQueue(item.id)
        processed++
      } else {
        await updateSyncAttempt(item.id, 'Processing failed')
        failed++
      }
    } catch (error) {
      await updateSyncAttempt(item.id, error instanceof Error ? error.message : 'Unknown error')
      failed++
    }
  }

  return { processed, failed }
}

// Get sync queue status
export async function getSyncQueueStatus(): Promise<{
  pending: number
  oldestTimestamp?: number
}> {
  const items = await getPendingSyncItems()

  return {
    pending: items.length,
    oldestTimestamp: items.length > 0
      ? Math.min(...items.map(i => i.timestamp))
      : undefined
  }
}
```

---

## Network Status Hook

```typescript
// hooks/use-network-status.ts
'use client'

import { useState, useEffect, useCallback } from 'react'

export interface NetworkStatus {
  isOnline: boolean
  isSlowConnection: boolean
  effectiveType: string
  downlink: number
  rtt: number
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlowConnection: false,
    effectiveType: '4g',
    downlink: 10,
    rtt: 50
  })

  useEffect(() => {
    const updateStatus = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

      setStatus({
        isOnline: navigator.onLine,
        isSlowConnection: connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g',
        effectiveType: connection?.effectiveType || '4g',
        downlink: connection?.downlink || 10,
        rtt: connection?.rtt || 50
      })
    }

    updateStatus()

    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)

    const connection = (navigator as any).connection
    if (connection) {
      connection.addEventListener('change', updateStatus)
    }

    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)

      if (connection) {
        connection.removeEventListener('change', updateStatus)
      }
    }
  }, [])

  return status
}

// Offline action wrapper
export function useOfflineAction<T>(
  action: () => Promise<T>,
  options: {
    offlineMessage?: string
    onSuccess?: (result: T) => void
    onOffline?: () => void
  } = {}
) {
  const { isOnline } = useNetworkStatus()
  const [pending, setPending] = useState(false)

  const execute = useCallback(async () => {
    if (!isOnline) {
      options.onOffline?.()
      return
    }

    setPending(true)
    try {
      const result = await action()
      options.onSuccess?.(result)
      return result
    } finally {
      setPending(false)
    }
  }, [action, isOnline, options])

  return { execute, pending, isOnline }
}
```

---

## Offline Indicator Component

```typescript
// components/offline/offline-indicator.tsx
'use client'

import { useNetworkStatus } from '@/hooks/use-network-status'
import { useSyncQueueStatus } from '@/hooks/use-sync-status'
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export function OfflineIndicator() {
  const { isOnline, isSlowConnection } = useNetworkStatus()
  const { pending, oldestTimestamp } = useSyncQueueStatus()

  if (isOnline && pending === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg',
        isOnline
          ? 'bg-yellow-500 text-yellow-900'
          : 'bg-red-500 text-white'
      )}
    >
      {isOnline ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">
            กำลังซิงค์ {pending} รายการ / Syncing {pending} items
          </span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm">
            ออฟไลน์ - {pending} รายการรอซิงค์ / Offline - {pending} pending
          </span>
        </>
      )}
    </div>
  )
}

// Network status banner
export function NetworkStatusBanner() {
  const { isOnline, isSlowConnection, effectiveType } = useNetworkStatus()

  if (isOnline && !isSlowConnection) {
    return null
  }

  return (
    <div
      className={cn(
        'w-full py-2 px-4 text-center text-sm',
        isOnline
          ? 'bg-yellow-100 text-yellow-800 border-b border-yellow-200'
          : 'bg-red-100 text-red-800 border-b border-red-200'
      )}
    >
      {isOnline ? (
        <>
          <Cloud className="inline h-4 w-4 mr-2" />
          การเชื่อมต่อช้า ({effectiveType}) - บางฟีเจอร์อาจทำงานช้า
        </>
      ) : (
        <>
          <CloudOff className="inline h-4 w-4 mr-2" />
          คุณกำลังออฟไลน์ - ข้อมูลจะถูกซิงค์เมื่อกลับมาออนไลน์
        </>
      )}
    </div>
  )
}
```

---

## Sync Status Hook

```typescript
// hooks/use-sync-status.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSyncQueueStatus, processSyncQueue, SyncQueueItem } from '@/lib/offline/sync-queue'

export function useSyncQueueStatus() {
  const [status, setStatus] = useState({
    pending: 0,
    oldestTimestamp: undefined as number | undefined
  })

  const refresh = useCallback(async () => {
    const newStatus = await getSyncQueueStatus()
    setStatus(newStatus)
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [refresh])

  return { ...status, refresh }
}

// Background sync hook
export function useBackgroundSync(
  syncHandler: (item: SyncQueueItem) => Promise<boolean>
) {
  const { isOnline } = useNetworkStatus()
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    if (isOnline) {
      syncNow()
    }
  }, [isOnline])

  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncing) return

    setIsSyncing(true)
    try {
      await processSyncQueue(syncHandler)
    } finally {
      setIsSyncing(false)
    }
  }, [isOnline, isSyncing, syncHandler])

  return { isSyncing, syncNow }
}
```

---

## Offline-First Server Action Wrapper

```typescript
// lib/offline/offline-action.ts
import { addToSyncQueue } from './sync-queue'
import { useNetworkStatus } from '@/hooks/use-network-status'

// Server action with offline support
export function createOfflineAction<TInput, TOutput>(
  action: string,
  serverAction: (input: TInput) => Promise<TOutput>,
  options: {
    entity: string
    operation: 'create' | 'update' | 'delete'
    cacheResult?: (result: TOutput) => Promise<void>
  }
) {
  return async (input: TInput): Promise<{ success: boolean; data?: TOutput; offline?: boolean; error?: string }> => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

    if (!isOnline) {
      // Queue for later sync
      await addToSyncQueue(options.operation, options.entity, {
        action,
        input
      })

      return {
        success: true,
        offline: true
      }
    }

    try {
      const result = await serverAction(input)

      // Cache result if provided
      if (options.cacheResult) {
        await options.cacheResult(result)
      }

      return {
        success: true,
        data: result
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// Example usage:
// 'use server'
//
// import { createOfflineAction } from '@/lib/offline/offline-action'
// import { inventoryStorage } from '@/lib/offline/storage'
//
// export const createItemOffline = createOfflineAction(
//   'createItem',
//   async (input: CreateItemInput) => {
//     return prisma.inventoryItem.create({ data: input })
//   },
//   {
//     entity: 'inventory',
//     operation: 'create',
//     cacheResult: async (item) => {
//       await inventoryStorage.add(item)
//     }
//   }
// )
```

---

## Draft Persistence

```typescript
// lib/offline/drafts.ts
import { draftsStorage } from './storage'

export interface Draft {
  id: string
  type: 'request' | 'item' | 'user'
  data: any
  createdAt: number
  updatedAt: number
}

// Save draft
export async function saveDraft(
  type: Draft['type'],
  data: any,
  existingId?: string
): Promise<string> {
  const id = existingId || `draft-${type}-${Date.now()}`

  const draft: Draft = {
    id,
    type,
    data,
    createdAt: existingId ? (await draftsStorage.getById(existingId))?.createdAt || Date.now() : Date.now(),
    updatedAt: Date.now()
  }

  await draftsStorage.put(draft)
  return id
}

// Get draft
export async function getDraft(id: string): Promise<Draft | undefined> {
  return draftsStorage.getById(id)
}

// Get all drafts by type
export async function getDraftsByType(type: Draft['type']): Promise<Draft[]> {
  return draftsStorage.getByIndex('type', type)
}

// Delete draft
export async function deleteDraft(id: string): Promise<void> {
  await draftsStorage.delete(id)
}

// Auto-save hook
export function useAutoSaveDraft<T>(
  type: Draft['type'],
  data: T,
  options: { delay?: number; enabled?: boolean } = {}
) {
  const { delay = 2000, enabled = true } = options
  const [draftId, setDraftId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  useEffect(() => {
    if (!enabled) return

    const timeout = setTimeout(async () => {
      setIsSaving(true)
      try {
        const id = await saveDraft(type, data, draftId || undefined)
        setDraftId(id)
        setLastSaved(new Date())
      } finally {
        setIsSaving(false)
      }
    }, delay)

    return () => clearTimeout(timeout)
  }, [data, type, delay, enabled, draftId])

  return { draftId, isSaving, lastSaved }
}
```

---

## Usage Examples

```typescript
// Example 1: Offline-aware component
import { useNetworkStatus } from '@/hooks/use-network-status'
import { OfflineIndicator } from '@/components/offline/offline-indicator'

function App() {
  return (
    <>
      <NetworkStatusBanner />
      <main>
        {/* App content */}
      </main>
      <OfflineIndicator />
    </>
  )
}

// Example 2: Offline action with queue
import { addToSyncQueue } from '@/lib/offline/sync-queue'

async function handleSubmit(data: any) {
  if (!navigator.onLine) {
    await addToSyncQueue('create', 'request', data)
    toast.success('บันทึกแบบออฟไลน์ - จะซิงค์เมื่อออนไลน์')
    return
  }

  // Normal submission
  await createRequest(data)
}

// Example 3: Auto-save draft
import { useAutoSaveDraft } from '@/lib/offline/drafts'

function RequestForm() {
  const [formData, setFormData] = useState({})

  const { isSaving, lastSaved } = useAutoSaveDraft('request', formData, {
    delay: 3000,
    enabled: true
  })

  return (
    <form>
      {/* Form fields */}
      <p className="text-sm text-muted-foreground">
        {isSaving ? 'กำลังบันทึก...' : lastSaved ? `บันทึกล่าสุด: ${lastSaved.toLocaleTimeString()}` : ''}
      </p>
    </form>
  )
}

// Example 4: Sync processor
import { processSyncQueue } from '@/lib/offline/sync-queue'

// When back online, process pending items
window.addEventListener('online', async () => {
  const result = await processSyncQueue(async (item) => {
    switch (item.entity) {
      case 'request':
        if (item.type === 'create') {
          await createRequest(item.data.input)
        }
        break
      case 'inventory':
        if (item.type === 'update') {
          await updateItem(item.data.input)
        }
        break
    }
    return true
  })

  console.log(`Synced: ${result.processed}, Failed: ${result.failed}`)
})

// Example 5: Offline storage
import { inventoryStorage } from '@/lib/offline/storage'

// Cache inventory data
async function cacheInventoryData() {
  const items = await fetch('/api/inventory').then(r => r.json())
  for (const item of items) {
    await inventoryStorage.put(item)
  }
}

// Get cached data when offline
async function getInventoryData() {
  if (!navigator.onLine) {
    return inventoryStorage.getAll()
  }
  return fetch('/api/inventory').then(r => r.json())
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
