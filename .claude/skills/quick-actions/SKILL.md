---
name: quick-actions
description: Quick actions and keyboard shortcuts for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["shortcut", "quick action", "hotkey", "keyboard", "command palette"]
  file_patterns: ["*shortcut*", "*hotkey*", "*quick-action*"]
  context: shortcuts, hotkeys, quick actions, command palette, keyboard navigation
mcp_servers:
  - sequential
personas:
  - frontend
---

# Quick Actions & Keyboard Shortcuts

## Core Role

Implement quick actions and keyboard shortcuts for HR-IMS:
- Command palette (Cmd+K)
- Global keyboard shortcuts
- Quick action buttons
- Context menus

---

## Command Palette Component

```typescript
// components/quick-actions/command-palette.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useI18n } from '@/hooks/use-i18n'
import { Search, Command, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CommandAction {
  id: string
  label: string
  labelTh?: string
  icon?: React.ReactNode
  shortcut?: string
  category: string
  categoryTh?: string
  action: () => void | Promise<void>
  keywords?: string[]
}

interface CommandPaletteProps {
  actions: CommandAction[]
  isOpen: boolean
  onClose: () => void
}

export function CommandPalette({ actions, isOpen, onClose }: CommandPaletteProps) {
  const { locale } = useI18n()
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const debouncedSearch = useDebounce(search, 150)

  // Filter actions based on search
  const filteredActions = useMemo(() => {
    if (!debouncedSearch) return actions

    const query = debouncedSearch.toLowerCase()
    return actions.filter(action => {
      const label = locale === 'th' && action.labelTh ? action.labelTh : action.label
      const keywords = action.keywords || []

      return (
        label.toLowerCase().includes(query) ||
        keywords.some(k => k.toLowerCase().includes(query))
      )
    })
  }, [actions, debouncedSearch, locale])

  // Group by category
  const groupedActions = useMemo(() => {
    const groups: Record<string, CommandAction[]> = {}

    filteredActions.forEach(action => {
      const category = locale === 'th' && action.categoryTh ? action.categoryTh : action.category
      if (!groups[category]) groups[category] = []
      groups[category].push(action)
    })

    return groups
  }, [filteredActions, locale])

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev =>
            prev < filteredActions.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : filteredActions.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (filteredActions[selectedIndex]) {
            executeAction(filteredActions[selectedIndex])
          }
          break
        case 'Escape':
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredActions, selectedIndex])

  const executeAction = useCallback(async (action: CommandAction) => {
    onClose()
    await action.action()
  }, [onClose])

  // Flatten for index tracking
  const flatActions = useMemo(() =>
    Object.values(groupedActions).flat(),
    [groupedActions]
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 max-w-xl gap-0">
        {/* Search Input */}
        <div className="flex items-center border-b px-4">
          <Search className="h-4 w-4 text-muted-foreground mr-3" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'th' ? 'ค้นหาคำสั่ง...' : 'Search commands...'}
            className="border-0 focus-visible:ring-0 px-0"
            autoFocus
          />
          <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs">
            esc
          </kbd>
        </div>

        {/* Actions List */}
        <ScrollArea className="max-h-80">
          {Object.entries(groupedActions).length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              {locale === 'th' ? 'ไม่พบคำสั่ง' : 'No commands found'}
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedActions).map(([category, categoryActions]) => (
                <div key={category}>
                  <div className="px-4 py-1.5 text-xs text-muted-foreground font-medium">
                    {category}
                  </div>
                  {categoryActions.map((action) => {
                    const globalIndex = flatActions.indexOf(action)
                    return (
                      <button
                        key={action.id}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-2 text-sm",
                          "hover:bg-muted/50 transition-colors",
                          globalIndex === selectedIndex && "bg-muted"
                        )}
                        onClick={() => executeAction(action)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                      >
                        <div className="flex items-center gap-3">
                          {action.icon && (
                            <span className="text-muted-foreground">{action.icon}</span>
                          )}
                          <span>
                            {locale === 'th' && action.labelTh ? action.labelTh : action.label}
                          </span>
                        </div>
                        {action.shortcut && (
                          <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs">
                            {action.shortcut}
                          </kbd>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ArrowRight className="h-3 w-3" />
            {locale === 'th' ? 'เลือก' : 'Select'}
          </span>
          <span className="flex items-center gap-1">
            ↑↓
            {locale === 'th' ? 'นำทาง' : 'Navigate'}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Keyboard Shortcuts Hook

```typescript
// hooks/use-keyboard-shortcuts.ts
'use client'

import { useEffect, useCallback, useRef } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  action: () => void | Promise<void>
  description?: string
  descriptionTh?: string
  preventDefault?: boolean
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow specific shortcuts even in inputs (like Cmd+K)
        const isCmdK = (e.metaKey || e.ctrlKey) && e.key === 'k'
        if (!isCmdK) return
      }

      for (const shortcut of shortcutsRef.current) {
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey
        const altMatch = shortcut.alt ? e.altKey : !e.altKey
        const metaMatch = shortcut.meta ? e.metaKey : true

        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          ctrlMatch &&
          shiftMatch &&
          altMatch &&
          metaMatch
        ) {
          if (shortcut.preventDefault !== false) {
            e.preventDefault()
          }
          await shortcut.action()
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}

// Global shortcuts provider
export function useGlobalShortcuts(onOpenCommandPalette: () => void) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'k',
      ctrl: true,
      action: onOpenCommandPalette,
      description: 'Open command palette',
      descriptionTh: 'เปิด command palette'
    },
    {
      key: '/',
      action: onOpenCommandPalette,
      description: 'Quick search',
      descriptionTh: 'ค้นหาด่วน'
    }
  ]

  useKeyboardShortcuts(shortcuts)
}

// Navigation shortcuts
export function useNavigationShortcuts(router: {
  push: (url: string) => void
  back: () => void
}) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'g',
      shift: true,
      action: () => router.push('/dashboard'),
      description: 'Go to dashboard',
      descriptionTh: 'ไปแดชบอร์ด'
    },
    {
      key: 'i',
      shift: true,
      action: () => router.push('/inventory'),
      description: 'Go to inventory',
      descriptionTh: 'ไปคลังพัสดุ'
    },
    {
      key: 'r',
      shift: true,
      action: () => router.push('/requests'),
      description: 'Go to requests',
      descriptionTh: 'ไปคำขอ'
    },
    {
      key: 'u',
      shift: true,
      action: () => router.push('/users'),
      description: 'Go to users',
      descriptionTh: 'ไปผู้ใช้งาน'
    }
  ]

  useKeyboardShortcuts(shortcuts)
}
```

---

## Quick Action Button Component

```typescript
// components/quick-actions/quick-action-button.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickActionButtonProps {
  icon: React.ReactNode
  label: string
  labelTh?: string
  onClick: () => void | Promise<void>
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  shortcut?: string
  disabled?: boolean
  loading?: boolean
  className?: string
}

export function QuickActionButton({
  icon,
  label,
  labelTh,
  onClick,
  variant = 'ghost',
  size = 'icon',
  shortcut,
  disabled,
  loading,
  className
}: QuickActionButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { locale } = useI18n()

  const handleClick = async () => {
    if (loading || isLoading || disabled) return

    setIsLoading(true)
    try {
      await onClick()
    } finally {
      setIsLoading(false)
    }
  }

  const button = (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn(className)}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
    </Button>
  )

  if (shortcut) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{locale === 'th' && labelTh ? labelTh : label}</p>
            <p className="text-xs text-muted-foreground">{shortcut}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return button
}
```

---

## Quick Action Toolbar

```typescript
// components/quick-actions/quick-action-toolbar.tsx
'use client'

import { useI18n } from '@/hooks/use-i18n'
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Trash2
} from 'lucide-react'
import { QuickActionButton } from './quick-action-button'
import { Separator } from '@/components/ui/separator'

interface QuickActionToolbarProps {
  onAdd?: () => void
  onSearch?: () => void
  onFilter?: () => void
  onExport?: () => void
  onImport?: () => void
  onRefresh?: () => void
  onDelete?: () => void
  selectedCount?: number
  hideActions?: string[]
}

export function QuickActionToolbar({
  onAdd,
  onSearch,
  onFilter,
  onExport,
  onImport,
  onRefresh,
  onDelete,
  selectedCount = 0,
  hideActions = []
}: QuickActionToolbarProps) {
  const { locale } = useI18n()

  return (
    <div className="flex items-center gap-1 p-2 bg-muted/50 rounded-lg">
      {!hideActions.includes('add') && onAdd && (
        <QuickActionButton
          icon={<Plus className="h-4 w-4" />}
          label="Add new"
          labelTh="เพิ่มใหม่"
          onClick={onAdd}
          shortcut="N"
        />
      )}

      {!hideActions.includes('search') && onSearch && (
        <QuickActionButton
          icon={<Search className="h-4 w-4" />}
          label="Search"
          labelTh="ค้นหา"
          onClick={onSearch}
          shortcut="⌘K"
        />
      )}

      {!hideActions.includes('filter') && onFilter && (
        <QuickActionButton
          icon={<Filter className="h-4 w-4" />}
          label="Filter"
          labelTh="กรอง"
          onClick={onFilter}
        />
      )}

      {(onExport || onImport) && <Separator orientation="vertical" className="h-6 mx-1" />}

      {!hideActions.includes('export') && onExport && (
        <QuickActionButton
          icon={<Download className="h-4 w-4" />}
          label="Export"
          labelTh="ส่งออก"
          onClick={onExport}
        />
      )}

      {!hideActions.includes('import') && onImport && (
        <QuickActionButton
          icon={<Upload className="h-4 w-4" />}
          label="Import"
          labelTh="นำเข้า"
          onClick={onImport}
        />
      )}

      {!hideActions.includes('refresh') && onRefresh && (
        <QuickActionButton
          icon={<RefreshCw className="h-4 w-4" />}
          label="Refresh"
          labelTh="รีเฟรช"
          onClick={onRefresh}
          shortcut="R"
        />
      )}

      {selectedCount > 0 && onDelete && (
        <>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <QuickActionButton
            icon={<Trash2 className="h-4 w-4" />}
            label={`Delete (${selectedCount})`}
            labelTh={`ลบ (${selectedCount})`}
            onClick={onDelete}
            variant="destructive"
          />
        </>
      )}
    </div>
  )
}
```

---

## Shortcut Help Dialog

```typescript
// components/quick-actions/shortcut-help-dialog.tsx
'use client'

import { useI18n } from '@/hooks/use-i18n'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

interface ShortcutGroup {
  category: string
  categoryTh?: string
  shortcuts: Array<{
    keys: string
    description: string
    descriptionTh?: string
  }>
}

const shortcutGroups: ShortcutGroup[] = [
  {
    category: 'General',
    categoryTh: 'ทั่วไป',
    shortcuts: [
      { keys: '⌘ K', description: 'Open command palette', descriptionTh: 'เปิด command palette' },
      { keys: '/', description: 'Quick search', descriptionTh: 'ค้นหาด่วน' },
      { keys: '?', description: 'Show keyboard shortcuts', descriptionTh: 'แสดงคีย์ลัด' },
      { keys: 'Esc', description: 'Close dialog', descriptionTh: 'ปิดไดอะล็อก' }
    ]
  },
  {
    category: 'Navigation',
    categoryTh: 'การนำทาง',
    shortcuts: [
      { keys: 'G D', description: 'Go to Dashboard', descriptionTh: 'ไปแดชบอร์ด' },
      { keys: 'G I', description: 'Go to Inventory', descriptionTh: 'ไปคลังพัสดุ' },
      { keys: 'G R', description: 'Go to Requests', descriptionTh: 'ไปคำขอ' },
      { keys: 'G U', description: 'Go to Users', descriptionTh: 'ไปผู้ใช้งาน' }
    ]
  },
  {
    category: 'Actions',
    categoryTh: 'การดำเนินการ',
    shortcuts: [
      { keys: 'N', description: 'New item', descriptionTh: 'สร้างรายการใหม่' },
      { keys: 'E', description: 'Edit selected', descriptionTh: 'แก้ไขที่เลือก' },
      { keys: 'Del', description: 'Delete selected', descriptionTh: 'ลบที่เลือก' },
      { keys: '⌘ S', description: 'Save', descriptionTh: 'บันทึก' }
    ]
  },
  {
    category: 'Selection',
    categoryTh: 'การเลือก',
    shortcuts: [
      { keys: '⌘ A', description: 'Select all', descriptionTh: 'เลือกทั้งหมด' },
      { keys: 'Shift Click', description: 'Range select', descriptionTh: 'เลือกช่วง' },
      { keys: '⌘ Click', description: 'Multi select', descriptionTh: 'เลือกหลายรายการ' }
    ]
  }
]

interface ShortcutHelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShortcutHelpDialog({ open, onOpenChange }: ShortcutHelpDialogProps) {
  const { locale } = useI18n()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {locale === 'th' ? 'คีย์ลัดแป้นพิมพ์' : 'Keyboard Shortcuts'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {shortcutGroups.map((group) => (
              <div key={group.category}>
                <h3 className="font-medium mb-2">
                  {locale === 'th' && group.categoryTh ? group.categoryTh : group.category}
                </h3>
                <div className="space-y-1">
                  {group.shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span className="text-sm text-muted-foreground">
                        {locale === 'th' && shortcut.descriptionTh
                          ? shortcut.descriptionTh
                          : shortcut.description}
                      </span>
                      <kbd className="px-2 py-1 text-xs bg-muted rounded font-mono">
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Usage Examples

```tsx
// Example 1: Command palette setup
'use client'

import { useState } from 'react'
import { CommandPalette, CommandAction } from '@/components/quick-actions/command-palette'
import { useGlobalShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { useRouter } from 'next/navigation'
import {
  Plus, Search, Settings, User, Package, FileText, LogOut
} from 'lucide-react'

export function AppLayout({ children }) {
  const [commandOpen, setCommandOpen] = useState(false)
  const router = useRouter()

  useGlobalShortcuts(() => setCommandOpen(true))

  const actions: CommandAction[] = [
    {
      id: 'new-item',
      label: 'New Inventory Item',
      labelTh: 'เพิ่มพัสดุใหม่',
      icon: <Plus className="h-4 w-4" />,
      category: 'Create',
      categoryTh: 'สร้าง',
      shortcut: 'N',
      action: () => router.push('/inventory/new'),
      keywords: ['add', 'create', 'item', 'asset']
    },
    {
      id: 'search',
      label: 'Search Items',
      labelTh: 'ค้นหาพัสดุ',
      icon: <Search className="h-4 w-4" />,
      category: 'Navigation',
      categoryTh: 'นำทาง',
      shortcut: '⌘K',
      action: () => router.push('/inventory?search=true'),
      keywords: ['find', 'lookup']
    },
    {
      id: 'settings',
      label: 'Settings',
      labelTh: 'ตั้งค่า',
      icon: <Settings className="h-4 w-4" />,
      category: 'Navigation',
      shortcut: '⌘,',
      action: () => router.push('/settings'),
      keywords: ['preferences', 'config']
    },
    {
      id: 'logout',
      label: 'Log Out',
      labelTh: 'ออกจากระบบ',
      icon: <LogOut className="h-4 w-4" />,
      category: 'Account',
      categoryTh: 'บัญชี',
      action: async () => {
        await fetch('/api/auth/signout', { method: 'POST' })
        router.push('/login')
      }
    }
  ]

  return (
    <>
      {children}
      <CommandPalette
        actions={actions}
        isOpen={commandOpen}
        onClose={() => setCommandOpen(false)}
      />
    </>
  )
}

// Example 2: Quick action toolbar in inventory
import { QuickActionToolbar } from '@/components/quick-actions/quick-action-toolbar'

function InventoryPage() {
  const [selectedItems, setSelectedItems] = useState<number[]>([])

  return (
    <div>
      <QuickActionToolbar
        onAdd={() => openAddDialog()}
        onSearch={() => focusSearch()}
        onFilter={() => toggleFilter()}
        onExport={() => exportItems()}
        onRefresh={() => refetchItems()}
        onDelete={() => deleteSelected()}
        selectedCount={selectedItems.length}
        hideActions={['import']}
      />

      {/* Inventory table... */}
    </div>
  )
}

// Example 3: Show shortcuts help
import { ShortcutHelpDialog } from '@/components/quick-actions/shortcut-help-dialog'

function HelpButton() {
  const [showShortcuts, setShowShortcuts] = useState(false)

  useKeyboardShortcuts([
    {
      key: '?',
      action: () => setShowShortcuts(true),
      description: 'Show shortcuts'
    }
  ])

  return (
    <ShortcutHelpDialog
      open={showShortcuts}
      onOpenChange={setShowShortcuts}
    />
  )
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
