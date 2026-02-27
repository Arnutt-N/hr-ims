---
name: mobile-responsive
description: Mobile-first responsive design patterns and touch interactions for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["mobile", "responsive", "touch", "swipe", "mobile-first", "pwa"]
  file_patterns: ["*mobile*", "*responsive*", "*touch*"]
  context: mobile design, responsive layouts, touch interactions, PWA
mcp_servers:
  - sequential
personas:
  - frontend
---

# Mobile Responsive

## Core Role

Implement mobile-first responsive design and touch interactions:
- Responsive layouts and breakpoints
- Touch-friendly interactions
- Swipe gestures
- Mobile navigation patterns
- PWA features

---

## Responsive Breakpoints Hook

```typescript
// hooks/use-breakpoint.ts
import { useState, useEffect } from 'react'

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

interface BreakpointConfig {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
  '2xl': number
}

const breakpoints: BreakpointConfig = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
}

export function useBreakpoint() {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('xs')
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  })

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      setWindowSize({ width, height })

      // Determine current breakpoint
      let bp: Breakpoint = 'xs'
      if (width >= breakpoints['2xl']) bp = '2xl'
      else if (width >= breakpoints.xl) bp = 'xl'
      else if (width >= breakpoints.lg) bp = 'lg'
      else if (width >= breakpoints.md) bp = 'md'
      else if (width >= breakpoints.sm) bp = 'sm'

      setCurrentBreakpoint(bp)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    breakpoint: currentBreakpoint,
    width: windowSize.width,
    height: windowSize.height,
    isMobile: windowSize.width < breakpoints.md,
    isTablet: windowSize.width >= breakpoints.md && windowSize.width < breakpoints.lg,
    isDesktop: windowSize.width >= breakpoints.lg,
    isTouch: typeof window !== 'undefined' && 'ontouchstart' in window
  }
}

// Responsive value hook
export function useResponsiveValue<T>(values: Partial<Record<Breakpoint, T>>): T | undefined {
  const { breakpoint } = useBreakpoint()

  // Find the closest matching breakpoint with a value
  const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs']
  const currentIndex = breakpointOrder.indexOf(breakpoint)

  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    if (values[breakpointOrder[i]] !== undefined) {
      return values[breakpointOrder[i]]
    }
  }

  return undefined
}
```

---

## Touch Gesture Hook

```typescript
// hooks/use-gesture.ts
import { useRef, useCallback, useEffect, useState } from 'react'

interface SwipeConfig {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
  preventDefaultTouch?: boolean
}

interface SwipeState {
  startX: number
  startY: number
  currentX: number
  currentY: number
  isSwiping: boolean
}

export function useSwipe(config: SwipeConfig) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventDefaultTouch = false
  } = config

  const ref = useRef<HTMLElement>(null)
  const stateRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isSwiping: false
  })

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    stateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      isSwiping: true
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!stateRef.current.isSwiping) return

    const touch = e.touches[0]
    stateRef.current.currentX = touch.clientX
    stateRef.current.currentY = touch.clientY

    if (preventDefaultTouch) {
      e.preventDefault()
    }
  }, [preventDefaultTouch])

  const handleTouchEnd = useCallback(() => {
    if (!stateRef.current.isSwiping) return

    const { startX, startY, currentX, currentY } = stateRef.current
    const diffX = currentX - startX
    const diffY = currentY - startY

    // Determine swipe direction
    if (Math.abs(diffX) > Math.abs(diffY)) {
      // Horizontal swipe
      if (Math.abs(diffX) > threshold) {
        if (diffX > 0) {
          onSwipeRight?.()
        } else {
          onSwipeLeft?.()
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(diffY) > threshold) {
        if (diffY > 0) {
          onSwipeDown?.()
        } else {
          onSwipeUp?.()
        }
      }
    }

    stateRef.current.isSwiping = false
  }, [threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefaultTouch })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, preventDefaultTouch])

  return ref
}

// Long press hook
export function useLongPress(
  callback: () => void,
  { threshold = 500, onStart, onFinish }: {
    threshold?: number
    onStart?: () => void
    onFinish?: () => void
  } = {}
) {
  const [isPressed, setIsPressed] = useState(false)
  const timerRef = useRef<NodeJS.Timeout>()
  const isLongPress = useRef(false)

  const start = useCallback(() => {
    setIsPressed(true)
    isLongPress.current = false
    onStart?.()

    timerRef.current = setTimeout(() => {
      isLongPress.current = true
      callback()
    }, threshold)
  }, [callback, threshold, onStart])

  const stop = useCallback(() => {
    setIsPressed(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    onFinish?.()
  }, [onFinish])

  return {
    handlers: {
      onMouseDown: start,
      onMouseUp: stop,
      onMouseLeave: stop,
      onTouchStart: start,
      onTouchEnd: stop
    },
    isPressed,
    isLongPress: isLongPress.current
  }
}

// Pull to refresh hook
export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  { threshold = 80 }: { threshold?: number } = {}
) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startYRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startYRef.current === 0 || isRefreshing) return

    const currentY = e.touches[0].clientY
    const diff = currentY - startYRef.current

    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(diff, threshold * 1.5))
    }
  }, [isRefreshing, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
    setPullDistance(0)
    startYRef.current = 0
  }, [pullDistance, threshold, isRefreshing, onRefresh])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: true })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    progress: Math.min(pullDistance / threshold, 1)
  }
}
```

---

## Mobile Navigation Component

```typescript
// components/mobile/mobile-navigation.tsx
'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { useSwipe } from '@/hooks/use-gesture'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Menu,
  X,
  Home,
  Package,
  ShoppingCart,
  Users,
  Settings,
  BarChart3,
  FileText,
  Bell,
  LogOut,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  label: { en: string; th: string }
  icon: React.ReactNode
  badge?: number
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: { en: 'Dashboard', th: 'แดชบอร์ด' }, icon: <Home className="h-5 w-5" /> },
  { href: '/inventory', label: { en: 'Inventory', th: 'พัสดุ' }, icon: <Package className="h-5 w-5" /> },
  { href: '/cart', label: { en: 'Cart', th: 'ตะกร้า' }, icon: <ShoppingCart className="h-5 w-5" /> },
  { href: '/requests', label: { en: 'Requests', th: 'คำขอ' }, icon: <FileText className="h-5 w-5" /> },
  { href: '/users', label: { en: 'Users', th: 'ผู้ใช้' }, icon: <Users className="h-5 w-5" /> },
  { href: '/reports', label: { en: 'Reports', th: 'รายงาน' }, icon: <BarChart3 className="h-5 w-5" /> },
  { href: '/settings', label: { en: 'Settings', th: 'การตั้งค่า' }, icon: <Settings className="h-5 w-5" /> }
]

export function MobileNavigation() {
  const { locale } = useI18n()
  const pathname = usePathname()
  const { isMobile } = useBreakpoint()
  const [isOpen, setIsOpen] = useState(false)

  const swipeRef = useSwipe({
    onSwipeRight: () => setIsOpen(true),
    onSwipeLeft: () => setIsOpen(false),
    threshold: 100
  })

  // Bottom navigation for mobile
  if (isMobile) {
    const bottomNavItems = navItems.slice(0, 5) // Show first 5 items

    return (
      <>
        {/* Bottom Navigation */}
        <nav
          ref={swipeRef as any}
          className="fixed bottom-0 left-0 right-0 bg-background border-t z-50 safe-area-pb"
        >
          <div className="flex justify-around items-center h-16">
            {bottomNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center justify-center flex-1 h-full',
                    'text-muted-foreground hover:text-foreground transition-colors',
                    isActive && 'text-primary'
                  )}
                >
                  <div className="relative">
                    {item.icon}
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-xs mt-1">
                    {locale === 'th' ? item.label.th : item.label.en}
                  </span>
                </Link>
              )
            })}

            {/* More button */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <button
                  className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground"
                >
                  <Menu className="h-5 w-5" />
                  <span className="text-xs mt-1">
                    {locale === 'th' ? 'เพิ่มเติม' : 'More'}
                  </span>
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="py-4">
                  <h2 className="font-semibold mb-4">
                    {locale === 'th' ? 'เมนูทั้งหมด' : 'All Menu'}
                  </h2>
                  <ScrollArea className="h-[calc(100vh-8rem)]">
                    <div className="space-y-1">
                      {navItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                              'flex items-center gap-3 px-3 py-3 rounded-lg transition-colors',
                              'hover:bg-muted',
                              isActive && 'bg-primary/10 text-primary'
                            )}
                          >
                            {item.icon}
                            <span className="flex-1">
                              {locale === 'th' ? item.label.th : item.label.en}
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </Link>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>

        {/* Spacer for bottom nav */}
        <div className="h-16" />
      </>
    )
  }

  // Desktop sidebar navigation
  return null
}

// Mobile Header Component
export function MobileHeader({
  title,
  showBack,
  onBack,
  actions
}: {
  title: string
  showBack?: boolean
  onBack?: () => void
  actions?: React.ReactNode
}) {
  const { isMobile } = useBreakpoint()

  if (!isMobile) return null

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          {showBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ChevronRight className="h-5 w-5 rotate-180" />
            </Button>
          )}
          <h1 className="font-semibold truncate">{title}</h1>
        </div>
        <div className="flex items-center gap-1">
          {actions}
        </div>
      </div>
    </header>
  )
}
```

---

## Mobile List Component

```typescript
// components/mobile/mobile-list.tsx
'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { useSwipe } from '@/hooks/use-gesture'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Trash2, Edit, MoreVertical } from 'lucide-react'

interface MobileListItemProps {
  title: string
  subtitle?: string
  leftContent?: React.ReactNode
  rightContent?: React.ReactNode
  actions?: Array<{
    icon: React.ReactNode
    label: string
    onClick: () => void
    destructive?: boolean
  }>
  onClick?: () => void
}

export function MobileListItem({
  title,
  subtitle,
  leftContent,
  rightContent,
  actions = [],
  onClick
}: MobileListItemProps) {
  const [showActions, setShowActions] = useState(false)
  const [translateX, setTranslateX] = useState(0)

  const swipeRef = useSwipe({
    onSwipeLeft: () => {
      if (actions.length > 0) {
        setShowActions(true)
        setTranslateX(-80 * actions.length)
      }
    },
    onSwipeRight: () => {
      setShowActions(false)
      setTranslateX(0)
    },
    threshold: 30
  })

  const defaultActions = [
    { icon: <Edit className="h-4 w-4" />, label: 'Edit', onClick: () => {}, destructive: false },
    { icon: <Trash2 className="h-4 w-4" />, label: 'Delete', onClick: () => {}, destructive: true }
  ]

  const itemActions = actions.length > 0 ? actions : defaultActions

  return (
    <div className="relative overflow-hidden">
      {/* Action buttons (behind the item) */}
      <div className="absolute inset-y-0 right-0 flex">
        {itemActions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={cn(
              'h-full px-4 flex items-center justify-center',
              'transition-colors',
              action.destructive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {action.icon}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div
        ref={swipeRef as any}
        className={cn(
          'relative bg-background transition-transform',
          'flex items-center gap-3 p-4 border-b',
          onClick && 'cursor-pointer hover:bg-muted/50'
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onClick={onClick}
      >
        {leftContent && (
          <div className="shrink-0">
            {leftContent}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{title}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>

        {rightContent && (
          <div className="shrink-0">
            {rightContent}
          </div>
        )}
      </div>
    </div>
  )
}

// Mobile Search Component
export function MobileSearch({
  value,
  onChange,
  placeholder
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const { locale } = useI18n()

  return (
    <div className="sticky top-0 z-30 bg-background p-4 border-b">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || (locale === 'th' ? 'ค้นหา...' : 'Search...')}
          className={cn(
            'w-full h-12 pl-10 pr-4 rounded-lg',
            'bg-muted border-0',
            'focus:outline-none focus:ring-2 focus:ring-primary',
            'placeholder:text-muted-foreground'
          )}
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    </div>
  )
}

// Pull to Refresh Component
export function PullToRefresh({
  children,
  onRefresh
}: {
  children: React.ReactNode
  onRefresh: () => Promise<void>
}) {
  const { locale } = useI18n()
  const { containerRef, pullDistance, isRefreshing, progress } = usePullToRefresh(onRefresh)

  return (
    <div ref={containerRef} className="relative overflow-auto h-full">
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 flex items-center justify-center',
          'transition-all duration-200',
          isRefreshing && 'animate-spin'
        )}
        style={{
          height: pullDistance,
          opacity: Math.min(pullDistance / 80, 1)
        }}
      >
        <div className="p-2">
          <svg
            className="h-6 w-6 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div
        className="transition-transform duration-200"
        style={{ transform: `translateY(${pullDistance}px)` }}
      >
        {children}
      </div>

      {/* Refreshing indicator */}
      {isRefreshing && (
        <div className="absolute inset-0 top-20 flex items-start justify-center bg-background/80 backdrop-blur-sm">
          <div className="p-4 bg-background rounded-lg shadow-lg mt-4">
            <div className="flex items-center gap-2">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              <span>
                {locale === 'th' ? 'กำลังรีเฟรช...' : 'Refreshing...'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## PWA Utilities

```typescript
// lib/pwa/service.ts

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    console.log('Service Worker registered:', registration)
    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    return null
  }
}

// Check if app is installed
export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied'
  }

  return await Notification.requestPermission()
}

// Show notification
export function showNotification(
  title: string,
  options?: NotificationOptions
): void {
  if (!('Notification' in window)) return

  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      ...options
    })
  }
}

// Share API
export async function shareContent(data: {
  title?: string
  text?: string
  url?: string
}): Promise<boolean> {
  if (!navigator.share) {
    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(data.url || window.location.href)
      return true
    } catch {
      return false
    }
  }

  try {
    await navigator.share(data)
    return true
  } catch {
    return false
  }
}

// Vibration feedback
export function vibrate(pattern: number | number[]): void {
  if (!navigator.vibrate) return
  navigator.vibrate(pattern)
}

// Common vibration patterns
export const vibrationPatterns = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 10],
  error: [30, 50, 30, 50, 30],
  warning: [20, 100, 20],
  click: 5
}
```

---

## CSS Utilities

```css
/* styles/mobile.css */

/* Safe area insets for notched devices */
.safe-area-pb {
  padding-bottom: env(safe-area-inset-bottom);
}

.safe-area-pt {
  padding-top: env(safe-area-inset-top);
}

.safe-area-pl {
  padding-left: env(safe-area-inset-left);
}

.safe-area-pr {
  padding-right: env(safe-area-inset-right);
}

/* Touch-friendly tap targets */
.tap-target {
  min-width: 44px;
  min-height: 44px;
}

/* Disable text selection on touch elements */
.no-select {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}

/* Smooth scrolling */
.smooth-scroll {
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}

/* Hide scrollbar but keep functionality */
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Touch feedback */
.touch-feedback {
  -webkit-tap-highlight-color: transparent;
}

.touch-feedback:active {
  background-color: rgba(0, 0, 0, 0.1);
}

/* Pull to refresh indicator */
@keyframes pull-refresh {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.pull-refresh-spinner {
  animation: pull-refresh 1s linear infinite;
}

/* Bottom sheet drag handle */
.drag-handle {
  width: 36px;
  height: 4px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
  margin: 8px auto;
}

/* Mobile-first responsive utilities */
@media (max-width: 767px) {
  .mobile-hide {
    display: none !important;
  }

  .mobile-full {
    width: 100% !important;
    max-width: 100% !important;
  }

  .mobile-stack {
    flex-direction: column !important;
  }
}

@media (min-width: 768px) {
  .desktop-hide {
    display: none !important;
  }
}

/* Touch ripple effect */
.ripple {
  position: relative;
  overflow: hidden;
}

.ripple::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
}

.ripple:active::after {
  width: 200%;
  height: 200%;
  opacity: 1;
  transition: width 0.3s, height 0.3s, opacity 0.3s;
}
```

---

## Usage Examples

```tsx
// Example 1: Mobile-responsive page
import { MobileNavigation, MobileHeader } from '@/components/mobile/mobile-navigation'
import { MobileSearch, MobileListItem } from '@/components/mobile/mobile-list'
import { PullToRefresh } from '@/components/mobile/mobile-list'
import { useBreakpoint } from '@/hooks/use-breakpoint'

function InventoryPage() {
  const { isMobile } = useBreakpoint()
  const [search, setSearch] = useState('')
  const [items, setItems] = useState([])

  const handleRefresh = async () => {
    // Fetch fresh data
    const data = await fetchInventory()
    setItems(data)
  }

  return (
    <div className="min-h-screen">
      <MobileNavigation />

      {isMobile && (
        <MobileHeader title="Inventory" />
      )}

      <PullToRefresh onRefresh={handleRefresh}>
        <MobileSearch value={search} onChange={setSearch} />

        <div className="divide-y">
          {items.map(item => (
            <MobileListItem
              key={item.id}
              title={item.name}
              subtitle={item.serialNumber}
              leftContent={
                <div className="w-12 h-12 bg-muted rounded-lg" />
              }
              onClick={() => router.push(`/inventory/${item.id}`)}
            />
          ))}
        </div>
      </PullToRefresh>
    </div>
  )
}

// Example 2: Swipeable card with actions
import { MobileListItem } from '@/components/mobile/mobile-list'

function RequestCard({ request, onApprove, onReject }) {
  return (
    <MobileListItem
      title={request.requestCode}
      subtitle={`${request.items.length} items`}
      actions={[
        {
          icon: <Check className="h-4 w-4" />,
          label: 'Approve',
          onClick: onApprove
        },
        {
          icon: <X className="h-4 w-4" />,
          label: 'Reject',
          onClick: onReject,
          destructive: true
        }
      ]}
    />
  )
}

// Example 3: Use responsive values
import { useResponsiveValue } from '@/hooks/use-breakpoint'

function Dashboard() {
  const columns = useResponsiveValue({
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4
  })

  const cardHeight = useResponsiveValue({
    xs: 150,
    md: 200,
    lg: 250
  })

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: 16
    }}>
      {/* Dashboard cards */}
    </div>
  )
}

// Example 4: PWA installation prompt
import { isPWAInstalled, showNotification } from '@/lib/pwa/service'

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    })
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      showNotification('App installed!', {
        body: 'You can now access HR-IMS from your home screen'
      })
    }

    setDeferredPrompt(null)
  }

  if (isPWAInstalled() || !deferredPrompt) return null

  return (
    <Button onClick={handleInstall}>
      Install App
    </Button>
  )
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
