---
name: keyboard-shortcuts
description: Keyboard shortcut handling and management for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["keyboard", "shortcut", "hotkey", "key binding", "keypress"]
  file_patterns: ["*shortcut*", "*hotkey*", "hooks/use-keyboard*"]
  context: keyboard navigation, shortcuts, accessibility
mcp_servers:
  - sequential
personas:
  - frontend
---

# Keyboard Shortcuts

## Core Role

Implement keyboard shortcuts for HR-IMS:
- Global and local shortcuts
- Keyboard navigation
- Accessibility compliance
- Shortcut help display

---

## Shortcut Hook

```typescript
// hooks/use-keyboard-shortcut.ts
'use client'

import { useEffect, useCallback, useRef } from 'react'

type KeyboardShortcut = {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  action: () => void
  description?: string
  preventDefault?: boolean
}

export function useKeyboardShortcut(shortcut: KeyboardShortcut) {
  const callbackRef = useRef(shortcut.action)
  callbackRef.current = shortcut.action

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const {
        key,
        ctrl = false,
        shift = false,
        alt = false,
        meta = false,
        preventDefault = true
      } = shortcut

      const matchKey = event.key.toLowerCase() === key.toLowerCase()
      const matchCtrl = ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey
      const matchShift = shift ? event.shiftKey : !event.shiftKey
      const matchAlt = alt ? event.altKey : !event.altKey
      const matchMeta = meta ? event.metaKey : true

      if (matchKey && matchCtrl && matchShift && matchAlt && matchMeta) {
        if (preventDefault) {
          event.preventDefault()
        }
        callbackRef.current()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcut])
}

// Multiple shortcuts
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  shortcuts.forEach((shortcut) => {
    useKeyboardShortcut(shortcut)
  })
}
```

### Usage

```typescript
// Example: Save with Ctrl+S
function MyForm() {
  const [isDirty, setIsDirty] = useState(false)

  useKeyboardShortcut({
    key: 's',
    ctrl: true,
    action: () => {
      if (isDirty) {
        saveForm()
      }
    },
    description: 'บันทึก / Save'
  })

  return <form>...</form>
}
```

---

## Global Shortcuts Provider

```typescript
// components/providers/shortcuts-provider.tsx
'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { useKeyboardShortcuts, KeyboardShortcut } from '@/hooks/use-keyboard-shortcut'

interface ShortcutsContextType {
  shortcuts: KeyboardShortcut[]
  registerShortcut: (shortcut: KeyboardShortcut) => void
  unregisterShortcut: (key: string) => void
  isHelpOpen: boolean
  openHelp: () => void
  closeHelp: () => void
}

const ShortcutsContext = createContext<ShortcutsContextType | null>(null)

export function ShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([])
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setShortcuts((prev) => [...prev, shortcut])
  }, [])

  const unregisterShortcut = useCallback((key: string) => {
    setShortcuts((prev) => prev.filter((s) => s.key !== key))
  }, [])

  // Global help shortcut (?)
  useKeyboardShortcut({
    key: '?',
    shift: true,
    action: () => setIsHelpOpen((prev) => !prev),
    description: 'แสดงคีย์ลัด / Show shortcuts'
  })

  return (
    <ShortcutsContext.Provider
      value={{
        shortcuts,
        registerShortcut,
        unregisterShortcut,
        isHelpOpen,
        openHelp: () => setIsHelpOpen(true),
        closeHelp: () => setIsHelpOpen(false)
      }}
    >
      {children}
    </ShortcutsContext.Provider>
  )
}

export function useShortcuts() {
  const context = useContext(ShortcutsContext)
  if (!context) {
    throw new Error('useShortcuts must be used within ShortcutsProvider')
  }
  return context
}
```

---

## Shortcut Help Dialog

```typescript
// components/shortcuts/shortcut-help.tsx
'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useShortcuts } from '@/components/providers/shortcuts-provider'
import { Badge } from '@/components/ui/badge'

export function ShortcutHelpDialog() {
  const { shortcuts, isHelpOpen, closeHelp } = useShortcuts()

  return (
    <Dialog open={isHelpOpen} onOpenChange={closeHelp}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>⌨️ คีย์ลัด / Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 border-b last:border-0"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <ShortcutBadge shortcut={shortcut} />
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          กด <Badge variant="outline">Shift + ?</Badge> เพื่อเปิด/ปิดหน้านี้
        </p>
      </DialogContent>
    </Dialog>
  )
}

function ShortcutBadge({ shortcut }: { shortcut: KeyboardShortcut }) {
  const keys: string[] = []

  if (shortcut.ctrl) keys.push('Ctrl')
  if (shortcut.shift) keys.push('Shift')
  if (shortcut.alt) keys.push('Alt')
  if (shortcut.meta) keys.push('⌘')
  keys.push(shortcut.key.toUpperCase())

  return (
    <div className="flex items-center gap-1">
      {keys.map((key, i) => (
        <Badge key={i} variant="secondary" className="font-mono text-xs">
          {key}
        </Badge>
      ))}
    </div>
  )
}
```

---

## Predefined Shortcuts

```typescript
// lib/shortcuts/presets.ts
import { KeyboardShortcut } from '@/hooks/use-keyboard-shortcut'

// Navigation shortcuts
export const navigationShortcuts: KeyboardShortcut[] = [
  {
    key: 'g',
    ctrl: true,
    action: () => window.location.href = '/dashboard',
    description: 'ไปหน้า Dashboard / Go to Dashboard'
  },
  {
    key: 'i',
    ctrl: true,
    action: () => window.location.href = '/inventory',
    description: 'ไปหน้าคลัง / Go to Inventory'
  },
  {
    key: 'u',
    ctrl: true,
    action: () => window.location.href = '/users',
    description: 'ไปหน้าผู้ใช้ / Go to Users'
  },
  {
    key: 'r',
    ctrl: true,
    action: () => window.location.href = '/requests',
    description: 'ไปหน้าคำขอ / Go to Requests'
  }
]

// Action shortcuts
export const actionShortcuts: KeyboardShortcut[] = [
  {
    key: 's',
    ctrl: true,
    action: () => {}, // Context-specific
    description: 'บันทึก / Save'
  },
  {
    key: 'n',
    ctrl: true,
    action: () => {}, // Context-specific
    description: 'สร้างใหม่ / New'
  },
  {
    key: 'f',
    ctrl: true,
    action: () => {
      const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]')
      searchInput?.focus()
    },
    description: 'ค้นหา / Search'
  },
  {
    key: 'Escape',
    action: () => {
      // Close modals, clear selections
      const event = new CustomEvent('closeModal')
      window.dispatchEvent(event)
    },
    description: 'ปิด / Close',
    preventDefault: false
  }
]

// Table shortcuts
export const tableShortcuts: KeyboardShortcut[] = [
  {
    key: 'ArrowUp',
    action: () => {}, // Move selection up
    description: 'เลือกแถวบน / Select row above'
  },
  {
    key: 'ArrowDown',
    action: () => {}, // Move selection down
    description: 'เลือกแถวล่าง / Select row below'
  },
  {
    key: 'a',
    ctrl: true,
    action: () => {}, // Select all
    description: 'เลือกทั้งหมด / Select all'
  },
  {
    key: 'Delete',
    action: () => {}, // Delete selected
    description: 'ลบที่เลือก / Delete selected'
  }
]
```

---

## Focus Management

```typescript
// hooks/use-focus-trap.ts
'use client'

import { useEffect, useRef } from 'react'

export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const containerRef = useRef<T>(null)

  useEffect(() => {
    if (!active || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    firstElement?.focus()

    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [active])

  return containerRef
}

// Usage
function Modal({ isOpen }: { isOpen: boolean }) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen)

  return (
    <div ref={modalRef} role="dialog" aria-modal="true">
      {/* Modal content */}
    </div>
  )
}
```

---

## Hotkey Button Component

```typescript
// components/ui/hotkey-button.tsx
import { Button, ButtonProps } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface HotkeyButtonProps extends ButtonProps {
  hotkey?: string
  hotkeyLabel?: string
}

export function HotkeyButton({
  hotkey,
  hotkeyLabel,
  children,
  className,
  ...props
}: HotkeyButtonProps) {
  return (
    <Button className={cn('group', className)} {...props}>
      {children}
      {hotkey && (
        <Badge
          variant="outline"
          className="ml-2 opacity-50 group-hover:opacity-100 transition-opacity font-mono text-xs"
        >
          {hotkeyLabel || hotkey}
        </Badge>
      )}
    </Button>
  )
}

// Usage
<HotkeyButton hotkey="Ctrl+S">
  บันทึก / Save
</HotkeyButton>
```

---

## Keyboard Navigation Hook

```typescript
// hooks/use-list-navigation.ts
'use client'

import { useState, useCallback } from 'react'

interface UseListNavigationOptions<T> {
  items: T[]
  onSelect?: (item: T, index: number) => void
  onActivate?: (item: T, index: number) => void
  getKey?: (item: T) => string
}

export function useListNavigation<T>({
  items,
  onSelect,
  onActivate,
  getKey
}: UseListNavigationOptions<T>) {
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex((prev) => {
            const next = prev < items.length - 1 ? prev + 1 : 0
            onSelect?.(items[next], next)
            return next
          })
          break

        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : items.length - 1
            onSelect?.(items[next], next)
            return next
          })
          break

        case 'Enter':
        case ' ':
          e.preventDefault()
          if (focusedIndex >= 0) {
            onActivate?.(items[focusedIndex], focusedIndex)
          }
          break

        case 'a':
          if (e.ctrlKey) {
            e.preventDefault()
            setSelectedIndices(new Set(items.map((_, i) => i)))
          }
          break

        case 'Escape':
          setSelectedIndices(new Set())
          setFocusedIndex(-1)
          break
      }
    },
    [items, focusedIndex, onSelect, onActivate]
  )

  const toggleSelection = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  return {
    focusedIndex,
    setFocusedIndex,
    selectedIndices,
    toggleSelection,
    handleKeyDown,
    isFocused: (index: number) => focusedIndex === index,
    isSelected: (index: number) => selectedIndices.has(index)
  }
}
```

---

## Accessibility Shortcuts

```typescript
// components/accessibility/accessibility-shortcuts.tsx
'use client'

import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcut'

export function AccessibilityShortcuts() {
  // Skip to main content
  useKeyboardShortcuts([
    {
      key: 'Tab',
      action: () => {
        const skipLink = document.getElementById('skip-to-content')
        if (skipLink) {
          skipLink.focus()
        }
      },
      description: 'ข้ามไปเนื้อหาหลัก / Skip to main content',
      preventDefault: false
    },
    {
      key: 'm',
      alt: true,
      action: () => {
        const main = document.getElementById('main-content')
        if (main) {
          main.focus()
        }
      },
      description: 'ไปเนื้อหาหลัก / Go to main content'
    },
    {
      key: 'h',
      alt: true,
      action: () => {
        const heading = document.querySelector('h1, h2, h3')
        if (heading instanceof HTMLElement) {
          heading.focus()
        }
      },
      description: 'ไปหัวข้อแรก / Go to first heading'
    }
  ])

  return null
}
```

---

## Skip Link Component

```typescript
// components/accessibility/skip-link.tsx
export function SkipLink() {
  return (
    <a
      id="skip-to-content"
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
    >
      ข้ามไปเนื้อหาหลัก / Skip to main content
    </a>
  )
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
