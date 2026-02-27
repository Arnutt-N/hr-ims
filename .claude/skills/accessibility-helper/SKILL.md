---
name: accessibility-helper
description: Accessibility (a11y) utilities and WCAG compliance for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["accessibility", "a11y", "wcag", "aria", "screen reader", "keyboard navigation"]
  file_patterns: ["*accessibility*", "*a11y*", "lib/accessibility*"]
  context: accessibility, WCAG compliance, screen readers, keyboard navigation, ARIA
mcp_servers:
  - sequential
personas:
  - frontend
---

# Accessibility Helper

## Core Role

Ensure accessibility compliance for HR-IMS:
- WCAG 2.1 AA compliance
- Screen reader support
- Keyboard navigation
- ARIA attributes

---

## Accessibility Utilities

```typescript
// lib/accessibility/utils.ts

// Generate unique IDs for accessibility
let idCounter = 0
export function generateA11yId(prefix = 'a11y'): string {
  return `${prefix}-${++idCounter}`
}

// Create accessible label
export function createAccessibleLabel(
  text: string,
  options: {
    describedBy?: string
    labelledBy?: string
    required?: boolean
  } = {}
): Record<string, string> {
  const attrs: Record<string, string> = {}

  if (options.labelledBy) {
    attrs['aria-labelledby'] = options.labelledBy
  }
  if (options.describedBy) {
    attrs['aria-describedby'] = options.describedBy
  }
  if (options.required) {
    attrs['aria-required'] = 'true'
  }

  return attrs
}

// Announce to screen readers
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message

  document.body.appendChild(announcement)

  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

// Focus management
export class FocusManager {
  private focusStack: HTMLElement[] = []

  // Save current focus
  saveFocus(): void {
    const activeElement = document.activeElement as HTMLElement
    if (activeElement) {
      this.focusStack.push(activeElement)
    }
  }

  // Restore previous focus
  restoreFocus(): void {
    const element = this.focusStack.pop()
    if (element && document.body.contains(element)) {
      element.focus()
    }
  }

  // Focus first focusable element in container
  focusFirst(container: HTMLElement): void {
    const focusable = this.getFocusableElements(container)[0]
    if (focusable) {
      focusable.focus()
    }
  }

  // Focus last focusable element in container
  focusLast(container: HTMLElement): void {
    const focusable = this.getFocusableElements(container)
    if (focusable.length > 0) {
      focusable[focusable.length - 1].focus()
    }
  }

  // Get all focusable elements
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ')

    return Array.from(container.querySelectorAll<HTMLElement>(selector))
      .filter(el => el.offsetParent !== null) // Filter out hidden elements
  }

  // Trap focus within container (for modals)
  trapFocus(container: HTMLElement): () => void {
    const focusable = this.getFocusableElements(container)
    const firstFocusable = focusable[0]
    const lastFocusable = focusable[focusable.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          e.preventDefault()
          lastFocusable?.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          e.preventDefault()
          firstFocusable?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }
}

// Color contrast checker
export function getContrastRatio(foreground: string, background: string): number {
  const getLuminance = (hex: string): number => {
    const rgb = hex.replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16) / 255) || [0, 0, 0]

    const [r, g, b] = rgb.map(c =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    )

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  const l1 = getLuminance(foreground)
  const l2 = getLuminance(background)

  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

// Check WCAG compliance
export function checkWCAGCompliance(
  contrastRatio: number,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): { passes: boolean; level: string } {
  const requirements = {
    AA: { normal: 4.5, large: 3 },
    AAA: { normal: 7, large: 4.5 }
  }

  const required = requirements[level][isLargeText ? 'large' : 'normal']

  return {
    passes: contrastRatio >= required,
    level: contrastRatio >= 7 ? 'AAA' : contrastRatio >= 4.5 ? 'AA' : 'Fail'
  }
}
```

---

## Accessible Component Patterns

```typescript
// lib/accessibility/components.tsx
'use client'

import React, { createContext, useContext, useRef, useEffect, useState, useCallback } from 'react'
import { announceToScreenReader, FocusManager } from './utils'

// Screen Reader Only wrapper
export function SrOnly({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only">
      {children}
    </span>
  )
}

// Visually Hidden but accessible
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0
      }}
    >
      {children}
    </span>
  )
}

// Skip Link component
export function SkipLink({ targetId, label }: { targetId: string; label?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-background focus:border focus:rounded-md"
    >
      {label || 'ข้ามไปเนื้อหาหลัก / Skip to main content'}
    </a>
  )
}

// Accessible modal/dialog
interface AccessibleModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  description,
  children
}: AccessibleModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const focusManager = useRef(new FocusManager())
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2)}`)
  const descriptionId = description ? `modal-desc-${Math.random().toString(36).slice(2)}` : undefined
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Save current focus
      focusManager.current.saveFocus()

      // Trap focus
      cleanupRef.current = focusManager.current.trapFocus(modalRef.current)

      // Focus first element
      setTimeout(() => {
        focusManager.current.focusFirst(modalRef.current!)
      }, 0)

      // Announce to screen readers
      announceToScreenReader(`${title} dialog opened`, 'assertive')

      // Prevent body scroll
      document.body.style.overflow = 'hidden'
    }

    return () => {
      cleanupRef.current?.()
      document.body.style.overflow = ''

      if (isOpen) {
        focusManager.current.restoreFocus()
        announceToScreenReader('Dialog closed', 'polite')
      }
    }
  }, [isOpen, title])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId.current}
      aria-describedby={descriptionId}
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative bg-background rounded-lg shadow-lg max-w-lg w-full mx-4 p-6">
        <h2 id={titleId.current} className="text-lg font-semibold">
          {title}
        </h2>

        {description && (
          <p id={descriptionId} className="text-sm text-muted-foreground mt-1">
            {description}
          </p>
        )}

        <div className="mt-4">
          {children}
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-md hover:bg-muted"
          aria-label="ปิด / Close"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// Accessible dropdown menu
interface AccessibleMenuProps {
  trigger: React.ReactNode
  label: string
  children: React.ReactNode
}

export function AccessibleMenu({ trigger, label, children }: AccessibleMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLUListElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [focusIndex, setFocusIndex] = useState(0)

  const menuItems = React.Children.toArray(children)

  useEffect(() => {
    if (isOpen && menuRef.current) {
      const items = menuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]')
      items[focusIndex]?.focus()
    }
  }, [isOpen, focusIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        setIsOpen(false)
        triggerRef.current?.focus()
        break
      case 'ArrowDown':
        e.preventDefault()
        setFocusIndex(prev => (prev + 1) % menuItems.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusIndex(prev => (prev - 1 + menuItems.length) % menuItems.length)
        break
      case 'Home':
        e.preventDefault()
        setFocusIndex(0)
        break
      case 'End':
        e.preventDefault()
        setFocusIndex(menuItems.length - 1)
        break
    }
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={label}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center"
      >
        {trigger}
      </button>

      {isOpen && (
        <ul
          ref={menuRef}
          role="menu"
          aria-label={label}
          onKeyDown={handleKeyDown}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setIsOpen(false)
            }
          }}
          className="absolute top-full left-0 mt-1 bg-background border rounded-md shadow-lg py-1 min-w-[200px] z-50"
        >
          {children}
        </ul>
      )}
    </div>
  )
}

// Accessible menu item
export function AccessibleMenuItem({
  children,
  onClick,
  disabled = false
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <li role="none">
      <button
        role="menuitem"
        onClick={onClick}
        disabled={disabled}
        className="w-full text-left px-4 py-2 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {children}
      </button>
    </li>
  )
}

// Live region for announcements
interface LiveRegionProps {
  children: React.ReactNode
  priority?: 'polite' | 'assertive'
  atomic?: boolean
}

export function LiveRegion({
  children,
  priority = 'polite',
  atomic = true
}: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic={atomic}
      className="sr-only"
    >
      {children}
    </div>
  )
}
```

---

## Accessibility Hook

```typescript
// hooks/use-accessibility.ts
'use client'

import { useEffect, useState, useCallback } from 'react'
import { announceToScreenReader, FocusManager } from '@/lib/accessibility/utils'

// Detect reduced motion preference
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}

// Detect high contrast mode
export function usePrefersHighContrast(): boolean {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: more)')
    setPrefersHighContrast(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersHighContrast
}

// Focus trap hook
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const focusManager = new FocusManager()
    const cleanup = focusManager.trapFocus(containerRef.current)

    return cleanup
  }, [isActive, containerRef])
}

// Announce changes hook
export function useAnnounce() {
  return useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announceToScreenReader(message, priority)
  }, [])
}

// Keyboard navigation hook
export function useKeyboardNavigation(
  items: any[],
  onSelect: (index: number) => void,
  options: {
    loop?: boolean
    autoFocus?: boolean
  } = {}
) {
  const [activeIndex, setActiveIndex] = useState(0)
  const { loop = true, autoFocus = false } = options

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(prev => {
          const next = prev + 1
          return next >= items.length ? (loop ? 0 : prev) : next
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(prev => {
          const next = prev - 1
          return next < 0 ? (loop ? items.length - 1 : 0) : next
        })
        break
      case 'Home':
        e.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        e.preventDefault()
        setActiveIndex(items.length - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        onSelect(activeIndex)
        break
    }
  }, [items.length, loop, activeIndex, onSelect])

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown
  }
}

// Screen reader detection (approximate)
export function useScreenReader(): boolean {
  const [isScreenReader, setIsScreenReader] = useState(false)

  useEffect(() => {
    // Check for common screen reader indicators
    const hasScreenReader =
      window.navigator.userAgent.includes('NVDA') ||
      window.navigator.userAgent.includes('JAWS') ||
      window.navigator.userAgent.includes('VoiceOver') ||
      'speechSynthesis' in window

    setIsScreenReader(hasScreenReader)
  }, [])

  return isScreenReader
}
```

---

## Accessibility Testing Utilities

```typescript
// lib/accessibility/testing.ts

// Accessibility audit for component
export interface A11yIssue {
  element: string
  issue: string
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  suggestion: string
}

export function auditAccessibility(container: HTMLElement): A11yIssue[] {
  const issues: A11yIssue[] = []

  // Check for images without alt text
  container.querySelectorAll('img').forEach((img) => {
    if (!img.alt && !img.getAttribute('aria-label') && !img.getAttribute('aria-labelledby')) {
      issues.push({
        element: 'img',
        issue: 'รูปภาพไม่มีข้อความทางเลือก / Image missing alt text',
        impact: 'critical',
        suggestion: 'เพิ่ม alt attribute หรือ aria-label'
      })
    }
  })

  // Check for buttons without accessible name
  container.querySelectorAll('button').forEach((button) => {
    if (!button.textContent?.trim() &&
        !button.getAttribute('aria-label') &&
        !button.getAttribute('aria-labelledby')) {
      issues.push({
        element: 'button',
        issue: 'ปุ่มไม่มีชื่อที่เข้าถึงได้ / Button missing accessible name',
        impact: 'critical',
        suggestion: 'เพิ่มข้อความหรือ aria-label'
      })
    }
  })

  // Check for links without accessible name
  container.querySelectorAll('a').forEach((link) => {
    if (!link.textContent?.trim() &&
        !link.getAttribute('aria-label') &&
        !link.getAttribute('aria-labelledby')) {
      issues.push({
        element: 'a',
        issue: 'ลิงก์ไม่มีข้อความ / Link missing text',
        impact: 'serious',
        suggestion: 'เพิ่มข้อความหรือ aria-label'
      })
    }
  })

  // Check for form inputs without labels
  container.querySelectorAll('input, select, textarea').forEach((input) => {
    const hasLabel = input.id && container.querySelector(`label[for="${input.id}"]`)
    const hasAriaLabel = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby')

    if (!hasLabel && !hasAriaLabel) {
      issues.push({
        element: input.tagName.toLowerCase(),
        issue: 'ช่องกรอกไม่มีป้ายกำกับ / Input missing label',
        impact: 'critical',
        suggestion: 'เพิ่ม label element หรือ aria-label'
      })
    }
  })

  // Check for headings hierarchy
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
  let lastLevel = 0
  headings.forEach((heading) => {
    const level = parseInt(heading.tagName.charAt(1))
    if (level > lastLevel + 1) {
      issues.push({
        element: heading.tagName.toLowerCase(),
        issue: `หัวข้อข้ามระดับ (h${lastLevel} → h${level}) / Skipped heading level`,
        impact: 'moderate',
        suggestion: 'ใช้หัวข้อตามลำดับ / Use headings in order'
      })
    }
    lastLevel = level
  })

  // Check for interactive elements without focus indicator
  container.querySelectorAll('button, a, input, select, textarea').forEach((el) => {
    const style = window.getComputedStyle(el)
    if (style.outline === 'none' && !el.className.includes('focus:')) {
      issues.push({
        element: el.tagName.toLowerCase(),
        issue: 'ไม่มี focus indicator / Missing focus indicator',
        impact: 'serious',
        suggestion: 'เพิ่ม focus:ring หรือ outline style'
      })
    }
  })

  return issues
}

// Generate accessibility report
export function generateA11yReport(issues: A11yIssue[]): string {
  const critical = issues.filter(i => i.impact === 'critical').length
  const serious = issues.filter(i => i.impact === 'serious').length
  const moderate = issues.filter(i => i.impact === 'moderate').length
  const minor = issues.filter(i => i.impact === 'minor').length

  let report = `# รายงานการตรวจสอบ Accessibility / Accessibility Audit Report\n\n`
  report += `## สรุป / Summary\n`
  report += `- Critical: ${critical}\n`
  report += `- Serious: ${serious}\n`
  report += `- Moderate: ${moderate}\n`
  report += `- Minor: ${minor}\n\n`

  if (issues.length > 0) {
    report += `## รายการปัญหา / Issues\n\n`
    issues.forEach((issue, index) => {
      report += `### ${index + 1}. ${issue.issue}\n`
      report += `- Element: \`${issue.element}\`\n`
      report += `- Impact: **${issue.impact}**\n`
      report += `- Suggestion: ${issue.suggestion}\n\n`
    })
  } else {
    report += `✅ ไม่พบปัญหา / No issues found\n`
  }

  return report
}
```

---

## Usage Examples

```tsx
// Example 1: Skip link
import { SkipLink } from '@/lib/accessibility/components'

export default function Layout({ children }) {
  return (
    <>
      <SkipLink targetId="main-content" />
      <header>...</header>
      <main id="main-content">
        {children}
      </main>
    </>
  )
}

// Example 2: Accessible modal
import { AccessibleModal } from '@/lib/accessibility/components'

function DeleteDialog({ isOpen, onClose, onConfirm }) {
  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title="ยืนยันการลบ / Confirm Delete"
      description="การดำเนินการนี้ไม่สามารถย้อนกลับได้"
    >
      <Button onClick={onConfirm}>ลบ / Delete</Button>
      <Button variant="outline" onClick={onClose}>ยกเลิก / Cancel</Button>
    </AccessibleModal>
  )
}

// Example 3: Announce changes
import { useAnnounce } from '@/hooks/use-accessibility'

function CartCounter() {
  const [count, setCount] = useState(0)
  const announce = useAnnounce()

  const addToCart = () => {
    setCount(prev => prev + 1)
    announce(`มี ${count + 1} รายการในตะกร้า / ${count + 1} items in cart`)
  }

  return (
    <button onClick={addToCart}>
      ตะกร้า ({count})
    </button>
  )
}

// Example 4: Keyboard navigation
import { useKeyboardNavigation } from '@/hooks/use-accessibility'

function MenuList({ items, onSelect }) {
  const { activeIndex, handleKeyDown } = useKeyboardNavigation(
    items,
    onSelect,
    { loop: true }
  )

  return (
    <ul role="menu" onKeyDown={handleKeyDown}>
      {items.map((item, index) => (
        <li
          key={item.id}
          role="menuitem"
          tabIndex={index === activeIndex ? 0 : -1}
          aria-selected={index === activeIndex}
        >
          {item.name}
        </li>
      ))}
    </ul>
  )
}

// Example 5: Reduced motion
import { usePrefersReducedMotion } from '@/hooks/use-accessibility'

function AnimatedComponent() {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <div
      className={prefersReducedMotion ? '' : 'animate-fade-in'}
      style={prefersReducedMotion ? { animation: 'none' } : undefined}
    >
      Content
    </div>
  )
}

// Example 6: Accessibility audit
import { auditAccessibility, generateA11yReport } from '@/lib/accessibility/testing'

// Run in development
if (process.env.NODE_ENV === 'development') {
  const issues = auditAccessibility(document.body)
  console.log(generateA11yReport(issues))
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
