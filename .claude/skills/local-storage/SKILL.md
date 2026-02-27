---
name: local-storage
description: Local storage and session storage management for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["local storage", "session storage", "persist", "cache", "browser storage"]
  file_patterns: ["*storage*", "hooks/use-storage*"]
  context: client-side persistence, user preferences, cache
mcp_servers:
  - sequential
personas:
  - frontend
---

# Local Storage

## Core Role

Manage browser storage for HR-IMS:
- Type-safe storage access
- JSON serialization
- Expiration support
- Fallback handling

---

## Storage Hook

```typescript
// hooks/use-local-storage.ts
'use client'

import { useState, useEffect, useCallback } from 'react'

type StorageType = 'local' | 'session'

interface UseStorageOptions<T> {
  serializer?: (value: T) => string
  deserializer?: (value: string) => T
  initializeWithValue?: boolean
}

function getStorage(type: StorageType): Storage | null {
  if (typeof window === 'undefined') return null
  return type === 'local' ? window.localStorage : window.sessionStorage
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: UseStorageOptions<T>
): [T, (value: T | ((prev: T) => T)) => void, () => void]

export function useLocalStorage<T>(
  key: string,
  initialValue?: T,
  options?: UseStorageOptions<T>
): [T | undefined, (value: T | ((prev: T | undefined) => T)) => void, () => void]

export function useLocalStorage<T>(
  key: string,
  initialValue?: T,
  options: UseStorageOptions<T> = {}
) {
  const {
    serializer = JSON.stringify,
    deserializer = JSON.parse,
    initializeWithValue = true
  } = options

  const readValue = useCallback((): T | undefined => {
    const storage = getStorage('local')
    if (!storage) return initialValue

    try {
      const stored = storage.getItem(key)
      return stored !== null ? deserializer(stored) : initialValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  }, [key, initialValue, deserializer])

  const [storedValue, setStoredValue] = useState<T | undefined>(() => {
    if (initializeWithValue) {
      return readValue()
    }
    return initialValue
  })

  const setValue = useCallback(
    (value: T | ((prev: T | undefined) => T)) => {
      const storage = getStorage('local')
      if (!storage) return

      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value
        storage.setItem(key, serializer(valueToStore))
        setStoredValue(valueToStore)

        // Dispatch event for other tabs
        window.dispatchEvent(
          new StorageEvent('storage', {
            key,
            newValue: serializer(valueToStore),
            storageArea: storage
          })
        )
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key, serializer, storedValue]
  )

  const removeValue = useCallback(() => {
    const storage = getStorage('local')
    if (!storage) return

    try {
      storage.removeItem(key)
      setStoredValue(initialValue)
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error)
    }
  }, [key, initialValue])

  // Listen for changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.storageArea === getStorage('local')) {
        setStoredValue(
          e.newValue ? deserializer(e.newValue) : initialValue
        )
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key, deserializer, initialValue])

  return [storedValue, setValue, removeValue] as const
}
```

---

## Session Storage Hook

```typescript
// hooks/use-session-storage.ts
'use client'

import { useState, useEffect, useCallback } from 'react'

export function useSessionStorage<T>(
  key: string,
  initialValue: T,
  options: UseStorageOptions<T> = {}
) {
  const {
    serializer = JSON.stringify,
    deserializer = JSON.parse,
    initializeWithValue = true
  } = options

  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') return initialValue

    try {
      const stored = sessionStorage.getItem(key)
      return stored !== null ? deserializer(stored) : initialValue
    } catch (error) {
      console.warn(`Error reading sessionStorage key "${key}":`, error)
      return initialValue
    }
  }, [key, initialValue, deserializer])

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (initializeWithValue) {
      return readValue()
    }
    return initialValue
  })

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value
        sessionStorage.setItem(key, serializer(valueToStore))
        setStoredValue(valueToStore)
      } catch (error) {
        console.warn(`Error setting sessionStorage key "${key}":`, error)
      }
    },
    [key, serializer, storedValue]
  )

  const removeValue = useCallback(() => {
    try {
      sessionStorage.removeItem(key)
      setStoredValue(initialValue)
    } catch (error) {
      console.warn(`Error removing sessionStorage key "${key}":`, error)
    }
  }, [key, initialValue])

  return [storedValue, setValue, removeValue] as const
}
```

---

## Storage with Expiration

```typescript
// hooks/use-storage-with-expiry.ts
'use client'

import { useCallback } from 'react'

interface StoredItem<T> {
  value: T
  expiry: number
}

export function useLocalStorageWithExpiry<T>(key: string, ttl: number) {
  const setWithExpiry = useCallback(
    (value: T) => {
      const item: StoredItem<T> = {
        value,
        expiry: Date.now() + ttl
      }
      localStorage.setItem(key, JSON.stringify(item))
    },
    [key, ttl]
  )

  const getWithExpiry = useCallback((): T | null => {
    const itemStr = localStorage.getItem(key)
    if (!itemStr) return null

    try {
      const item: StoredItem<T> = JSON.parse(itemStr)

      if (Date.now() > item.expiry) {
        localStorage.removeItem(key)
        return null
      }

      return item.value
    } catch {
      return null
    }
  }, [key])

  return { setWithExpiry, getWithExpiry }
}

// Usage
function useCachedData() {
  const { setWithExpiry, getWithExpiry } = useLocalStorageWithExpiry<User[]>(
    'cached-users',
    1000 * 60 * 5 // 5 minutes
  )

  const getUsers = async () => {
    const cached = getWithExpiry()
    if (cached) return cached

    const users = await fetchUsers()
    setWithExpiry(users)
    return users
  }

  return { getUsers }
}
```

---

## Storage Utilities

```typescript
// lib/storage/index.ts

export const storage = {
  // Get item with JSON parsing
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue ?? null
    } catch {
      return defaultValue ?? null
    }
  },

  // Set item with JSON stringify
  set<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  },

  // Remove item
  remove(key: string): void {
    localStorage.removeItem(key)
  },

  // Clear all
  clear(): void {
    localStorage.clear()
  },

  // Check if exists
  has(key: string): boolean {
    return localStorage.getItem(key) !== null
  },

  // Get all keys
  keys(): string[] {
    return Object.keys(localStorage)
  },

  // Get size in bytes
  size(): number {
    let size = 0
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        size += localStorage.getItem(key)?.length || 0
        size += key.length
      }
    }
    return size * 2 // UTF-16
  }
}

// Session storage variant
export const sessionStorage = {
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = window.sessionStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue ?? null
    } catch {
      return defaultValue ?? null
    }
  },

  set<T>(key: string, value: T): boolean {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  },

  remove(key: string): void {
    window.sessionStorage.removeItem(key)
  },

  clear(): void {
    window.sessionStorage.clear()
  }
}
```

---

## User Preferences Storage

```typescript
// lib/storage/preferences.ts
import { useLocalStorage } from '@/hooks/use-local-storage'

interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: 'th' | 'en'
  tablePageSize: number
  sidebarCollapsed: boolean
  notifications: {
    email: boolean
    push: boolean
    sound: boolean
  }
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  language: 'th',
  tablePageSize: 20,
  sidebarCollapsed: false,
  notifications: {
    email: true,
    push: true,
    sound: false
  }
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useLocalStorage<UserPreferences>(
    'hr-ims-preferences',
    defaultPreferences
  )

  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(
      key: K,
      value: UserPreferences[K]
    ) => {
      setPreferences((prev) => ({
        ...prev!,
        [key]: value
      }))
    },
    [setPreferences]
  )

  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences)
  }, [setPreferences])

  return {
    preferences: preferences || defaultPreferences,
    updatePreference,
    resetPreferences
  }
}

// Usage
function ThemeToggle() {
  const { preferences, updatePreference } = useUserPreferences()

  return (
    <Select
      value={preferences.theme}
      onValueChange={(value) => updatePreference('theme', value as any)}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">สว่าง / Light</SelectItem>
        <SelectItem value="dark">มืด / Dark</SelectItem>
        <SelectItem value="system">ระบบ / System</SelectItem>
      </SelectContent>
    </Select>
  )
}
```

---

## Form Draft Storage

```typescript
// hooks/use-form-draft.ts
'use client'

import { useEffect } from 'react'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { useDebouncedCallback } from '@/hooks/use-debounce'

interface UseFormDraftOptions<T> {
  key: string
  initialData: T
  debounceMs?: number
  onSave?: (data: T) => void
}

export function useFormDraft<T extends Record<string, any>>({
  key,
  initialData,
  debounceMs = 500,
  onSave
}: UseFormDraftOptions<T>) {
  const [draft, setDraft] = useLocalStorage<T>(`draft-${key}`, initialData)

  const saveDraft = useDebouncedCallback((data: T) => {
    setDraft(data)
    onSave?.(data)
  }, debounceMs)

  const updateField = <K extends keyof T>(field: K, value: T[K]) => {
    const updated = { ...draft!, [field]: value }
    setDraft(updated)
    saveDraft(updated)
  }

  const clearDraft = () => {
    setDraft(initialData)
  }

  const hasDraft = draft && Object.keys(draft).some(
    (key) => draft[key as keyof T] !== initialData[key as keyof T]
  )

  return {
    draft: draft || initialData,
    updateField,
    saveDraft,
    clearDraft,
    hasDraft
  }
}

// Usage
function ItemForm({ itemId }: { itemId: number }) {
  const { draft, updateField, hasDraft, clearDraft } = useFormDraft({
    key: `item-form-${itemId}`,
    initialData: { name: '', description: '', quantity: 0 }
  })

  return (
    <form>
      {hasDraft && (
        <Alert>
          <p>มีข้อมูลที่ยังไม่บันทึก / You have unsaved changes</p>
          <Button variant="ghost" size="sm" onClick={clearDraft}>
            ล้าง / Clear
          </Button>
        </Alert>
      )}
      <Input
        value={draft.name}
        onChange={(e) => updateField('name', e.target.value)}
      />
    </form>
  )
}
```

---

## Storage Migration

```typescript
// lib/storage/migration.ts
import { storage } from './index'

interface Migration {
  version: number
  migrate: () => void
}

const migrations: Migration[] = [
  {
    version: 2,
    migrate: () => {
      // Rename old key to new key
      const oldPrefs = storage.get('preferences')
      if (oldPrefs) {
        storage.set('hr-ims-preferences', oldPrefs)
        storage.remove('preferences')
      }
    }
  },
  {
    version: 3,
    migrate: () => {
      // Add new field with default
      const prefs = storage.get<UserPreferences>('hr-ims-preferences')
      if (prefs && !prefs.notifications) {
        prefs.notifications = {
          email: true,
          push: true,
          sound: false
        }
        storage.set('hr-ims-preferences', prefs)
      }
    }
  }
]

const CURRENT_VERSION = 3
const VERSION_KEY = 'hr-ims-storage-version'

export function runMigrations() {
  const storedVersion = storage.get<number>(VERSION_KEY) || 0

  migrations
    .filter((m) => m.version > storedVersion)
    .sort((a, b) => a.version - b.version)
    .forEach((m) => {
      console.log(`Running migration v${m.version}`)
      m.migrate()
    })

  storage.set(VERSION_KEY, CURRENT_VERSION)
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
