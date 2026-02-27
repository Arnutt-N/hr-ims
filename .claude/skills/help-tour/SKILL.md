---
name: help-tour
description: Help system and guided tours for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["tour", "guide", "help", "onboarding", "walkthrough", "tutorial"]
  file_patterns: ["*tour*", "*guide*", "*help*", "*onboarding*"]
  context: tours, guides, onboarding, tutorials, walkthroughs, help tooltips
mcp_servers:
  - sequential
personas:
  - frontend
---

# Help System & Guided Tours

## Core Role

Implement help system and guided tours for HR-IMS:
- Interactive product tours
- Onboarding walkthroughs
- Help tooltips and popovers
- Feature announcements

---

## Tour Service

```typescript
// lib/tour/service.ts
import prisma from '@/lib/prisma'

export interface TourStep {
  id: string
  target: string // CSS selector
  title: string
  titleTh?: string
  content: string
  contentTh?: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  order: number
  action?: {
    type: 'click' | 'input' | 'hover' | 'scroll'
    selector?: string
    value?: string
  }
}

export interface Tour {
  id: string
  name: string
  nameTh?: string
  description: string
  descriptionTh?: string
  steps: TourStep[]
  requiredRoles?: string[]
  isActive: boolean
}

// Define tours
export const tours: Tour[] = [
  {
    id: 'welcome',
    name: 'Welcome Tour',
    nameTh: 'ทัวร์ต้อนรับ',
    description: 'Get started with HR-IMS',
    descriptionTh: 'เริ่มต้นใช้งาน HR-IMS',
    isActive: true,
    steps: [
      {
        id: 'dashboard',
        target: '[data-tour="dashboard"]',
        title: 'Dashboard',
        titleTh: 'แดชบอร์ด',
        content: 'This is your main dashboard where you can see an overview of your inventory and recent activities.',
        contentTh: 'นี่คือแดชบอร์ดหลักที่คุณสามารถดูภาพรวมของพัสดุและกิจกรรมล่าสุด',
        placement: 'bottom',
        order: 1
      },
      {
        id: 'inventory',
        target: '[data-tour="inventory"]',
        title: 'Inventory Management',
        titleTh: 'การจัดการพัสดุ',
        content: 'Click here to manage your inventory items, view stock levels, and track assets.',
        contentTh: 'คลิกที่นี่เพื่อจัดการพัสดุ ดูระดับสต็อก และติดตามสินทรัพย์',
        placement: 'right',
        order: 2
      },
      {
        id: 'requests',
        target: '[data-tour="requests"]',
        title: 'Requests',
        titleTh: 'คำขอ',
        content: 'Create and manage requisition requests for borrowing or withdrawing items.',
        contentTh: 'สร้างและจัดการคำขอเบิกพัสดุหรือยืมอุปกรณ์',
        placement: 'right',
        order: 3
      },
      {
        id: 'notifications',
        target: '[data-tour="notifications"]',
        title: 'Notifications',
        titleTh: 'การแจ้งเตือน',
        content: 'Stay updated with notifications about your requests and important updates.',
        contentTh: 'ติดตามข่าวสารด้วยการแจ้งเตือนเกี่ยวกับคำขอและการอัพเดทสำคัญ',
        placement: 'bottom',
        order: 4
      }
    ]
  },
  {
    id: 'inventory-basics',
    name: 'Inventory Basics',
    nameTh: 'พื้นฐานการจัดการพัสดุ',
    description: 'Learn how to manage inventory items',
    descriptionTh: 'เรียนรู้วิธีจัดการพัสดุ',
    isActive: true,
    steps: [
      {
        id: 'add-item',
        target: '[data-tour="add-item-btn"]',
        title: 'Add New Item',
        titleTh: 'เพิ่มพัสดุใหม่',
        content: 'Click this button to add a new inventory item to the system.',
        contentTh: 'คลิกปุ่มนี้เพื่อเพิ่มพัสดุใหม่เข้าสู่ระบบ',
        placement: 'left',
        order: 1
      },
      {
        id: 'search-filter',
        target: '[data-tour="search-filter"]',
        title: 'Search & Filter',
        titleTh: 'ค้นหาและกรอง',
        content: 'Use the search bar and filters to quickly find items.',
        contentTh: 'ใช้แถบค้นหาและตัวกรองเพื่อค้นหาพัสดุได้อย่างรวดเร็ว',
        placement: 'bottom',
        order: 2
      },
      {
        id: 'item-actions',
        target: '[data-tour="item-actions"]',
        title: 'Item Actions',
        titleTh: 'การดำเนินการกับพัสดุ',
        content: 'View details, edit, or delete items using these action buttons.',
        contentTh: 'ดูรายละเอียด แก้ไข หรือลบพัสดุด้วยปุ่มเหล่านี้',
        placement: 'left',
        order: 3
      }
    ]
  }
]

// Get tour progress for user
export async function getTourProgress(userId: number, tourId: string) {
  const progress = await prisma.userTourProgress.findUnique({
    where: {
      userId_tourId: { userId, tourId }
    }
  })

  return progress
}

// Get all tours with progress for user
export async function getToursWithProgress(userId: number) {
  const userProgress = await prisma.userTourProgress.findMany({
    where: { userId }
  })

  const progressMap = new Map(
    userProgress.map(p => [p.tourId, p])
  )

  return tours.map(tour => ({
    ...tour,
    progress: progressMap.get(tour.id) || null
  }))
}

// Start tour
export async function startTour(userId: number, tourId: string) {
  const existing = await prisma.userTourProgress.findUnique({
    where: {
      userId_tourId: { userId, tourId }
    }
  })

  if (existing) {
    return prisma.userTourProgress.update({
      where: { id: existing.id },
      data: {
        startedAt: new Date(),
        currentStep: 0,
        completedAt: null
      }
    })
  }

  return prisma.userTourProgress.create({
    data: {
      userId,
      tourId,
      startedAt: new Date(),
      currentStep: 0
    }
  })
}

// Complete step
export async function completeTourStep(
  userId: number,
  tourId: string,
  stepIndex: number
) {
  const tour = tours.find(t => t.id === tourId)
  if (!tour) throw new Error('Tour not found')

  const isLastStep = stepIndex >= tour.steps.length - 1

  return prisma.userTourProgress.upsert({
    where: {
      userId_tourId: { userId, tourId }
    },
    create: {
      userId,
      tourId,
      currentStep: stepIndex,
      completedAt: isLastStep ? new Date() : null
    },
    update: {
      currentStep: stepIndex,
      completedAt: isLastStep ? new Date() : null
    }
  })
}

// Skip tour
export async function skipTour(userId: number, tourId: string) {
  return prisma.userTourProgress.upsert({
    where: {
      userId_tourId: { userId, tourId }
    },
    create: {
      userId,
      tourId,
      skippedAt: new Date()
    },
    update: {
      skippedAt: new Date()
    }
  })
}

// Reset tour progress
export async function resetTourProgress(userId: number, tourId: string) {
  return prisma.userTourProgress.delete({
    where: {
      userId_tourId: { userId, tourId }
    }
  })
}
```

---

## Tour Component

```typescript
// components/tour/tour-guide.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { TourStep } from '@/lib/tour/service'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Spotlight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TourGuideProps {
  steps: TourStep[]
  currentStep: number
  onComplete: () => void
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  onClose: () => void
}

export function TourGuide({
  steps,
  currentStep,
  onComplete,
  onNext,
  onPrev,
  onSkip,
  onClose
}: TourGuideProps) {
  const { locale } = useI18n()
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const step = steps[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1
  const progress = ((currentStep + 1) / steps.length) * 100

  // Find target element
  useEffect(() => {
    if (!step?.target) return

    const findElement = () => {
      const el = document.querySelector(step.target) as HTMLElement
      if (el) {
        setTargetElement(el)
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }

    // Try immediately
    findElement()

    // Retry after a short delay for dynamic content
    const timeout = setTimeout(findElement, 500)

    return () => clearTimeout(timeout)
  }, [step?.target])

  // Calculate tooltip position
  useEffect(() => {
    if (!targetElement) return

    const updatePosition = () => {
      const rect = targetElement.getBoundingClientRect()
      const placement = step.placement || 'bottom'
      const offset = 10

      let top = 0
      let left = 0

      switch (placement) {
        case 'top':
          top = rect.top - offset
          left = rect.left + rect.width / 2
          break
        case 'bottom':
          top = rect.bottom + offset
          left = rect.left + rect.width / 2
          break
        case 'left':
          top = rect.top + rect.height / 2
          left = rect.left - offset
          break
        case 'right':
          top = rect.top + rect.height / 2
          left = rect.right + offset
          break
      }

      setPosition({ top, left })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [targetElement, step?.placement])

  // Highlight target element
  useEffect(() => {
    if (!targetElement) return

    targetElement.style.position = 'relative'
    targetElement.style.zIndex = '9999'
    targetElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2')

    return () => {
      targetElement.style.position = ''
      targetElement.style.zIndex = ''
      targetElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2')
    }
  }, [targetElement])

  const title = locale === 'th' && step.titleTh ? step.titleTh : step.title
  const content = locale === 'th' && step.contentTh ? step.contentTh : step.content

  const placement = step.placement || 'bottom'

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998]"
        onClick={onClose}
      />

      {/* Tooltip */}
      <Card
        className={cn(
          "fixed z-[9999] w-80 shadow-xl",
          "animate-in fade-in-0 zoom-in-95"
        )}
        style={{
          top: placement === 'bottom' ? position.top : placement === 'top' ? 'auto' : position.top,
          bottom: placement === 'top' ? `calc(100vh - ${position.top}px)` : 'auto',
          left: placement === 'left' ? 'auto' : placement === 'right' ? position.left : position.left - 160,
          right: placement === 'left' ? `calc(100vw - ${position.left}px)` : 'auto',
          transform: placement === 'top' || placement === 'bottom'
            ? 'translateX(-50%)'
            : placement === 'right'
              ? 'translateY(-50%)'
              : 'translateY(-50%)'
        }}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{title}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={progress} className="h-1" />
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">{content}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {locale === 'th'
              ? `ขั้นตอน ${currentStep + 1} จาก ${steps.length}`
              : `Step ${currentStep + 1} of ${steps.length}`}
          </p>
        </CardContent>

        <CardFooter className="justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
          >
            {locale === 'th' ? 'ข้าม' : 'Skip'}
          </Button>

          <div className="flex gap-2">
            {!isFirstStep && (
              <Button variant="outline" size="sm" onClick={onPrev}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                {locale === 'th' ? 'ก่อนหน้า' : 'Back'}
              </Button>
            )}

            {isLastStep ? (
              <Button size="sm" onClick={onComplete}>
                <Check className="h-4 w-4 mr-1" />
                {locale === 'th' ? 'เสร็จสิ้น' : 'Finish'}
              </Button>
            ) : (
              <Button size="sm" onClick={onNext}>
                {locale === 'th' ? 'ถัดไป' : 'Next'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </>
  )
}
```

---

## Tour Provider Hook

```typescript
// hooks/use-tour.ts
'use client'

import { useState, useCallback, useEffect } from 'react'
import { Tour, TourStep, getToursWithProgress, startTour, completeTourStep, skipTour } from '@/lib/tour/service'
import { useSession } from 'next-auth/react'

export function useTour() {
  const { data: session } = useSession()
  const [tours, setTours] = useState<(Tour & { progress: any })[]>([])
  const [activeTour, setActiveTour] = useState<Tour | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Load tours
  useEffect(() => {
    if (!session?.user?.id) return

    const loadTours = async () => {
      const userId = parseInt(session.user.id)
      const toursWithProgress = await getToursWithProgress(userId)
      setTours(toursWithProgress)

      // Auto-start welcome tour for new users
      const welcomeTour = toursWithProgress.find(t => t.id === 'welcome')
      if (welcomeTour && !welcomeTour.progress) {
        await beginTour('welcome')
      }
    }

    loadTours()
  }, [session?.user?.id])

  const beginTour = useCallback(async (tourId: string) => {
    if (!session?.user?.id) return

    const userId = parseInt(session.user.id)
    const tour = tours.find(t => t.id === tourId)

    if (!tour) return

    setIsLoading(true)
    try {
      await startTour(userId, tourId)
      setActiveTour(tour)
      setCurrentStep(0)
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.id, tours])

  const nextStep = useCallback(async () => {
    if (!activeTour || !session?.user?.id) return

    const userId = parseInt(session.user.id)
    const newStep = currentStep + 1

    if (newStep < activeTour.steps.length) {
      await completeTourStep(userId, activeTour.id, newStep)
      setCurrentStep(newStep)
    }
  }, [activeTour, currentStep, session?.user?.id])

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }, [currentStep])

  const completeTour = useCallback(async () => {
    if (!activeTour || !session?.user?.id) return

    const userId = parseInt(session.user.id)
    await completeTourStep(userId, activeTour.id, activeTour.steps.length - 1)

    // Refresh tours
    const toursWithProgress = await getToursWithProgress(userId)
    setTours(toursWithProgress)

    setActiveTour(null)
    setCurrentStep(0)
  }, [activeTour, session?.user?.id])

  const skipActiveTour = useCallback(async () => {
    if (!activeTour || !session?.user?.id) return

    const userId = parseInt(session.user.id)
    await skipTour(userId, activeTour.id)

    // Refresh tours
    const toursWithProgress = await getToursWithProgress(userId)
    setTours(toursWithProgress)

    setActiveTour(null)
    setCurrentStep(0)
  }, [activeTour, session?.user?.id])

  const closeTour = useCallback(() => {
    setActiveTour(null)
    setCurrentStep(0)
  }, [])

  return {
    tours,
    activeTour,
    currentStep,
    isLoading,
    beginTour,
    nextStep,
    prevStep,
    completeTour,
    skipActiveTour,
    closeTour
  }
}
```

---

## Help Tooltip Component

```typescript
// components/tour/help-tooltip.tsx
'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'

interface HelpTooltipProps {
  content: string
  contentTh?: string
  children?: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export function HelpTooltip({
  content,
  contentTh,
  children,
  side = 'top'
}: HelpTooltipProps) {
  const { locale } = useI18n()
  const text = locale === 'th' && contentTh ? contentTh : content

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children || (
            <button className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground">
              <HelpCircle className="h-4 w-4" />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <p className="text-sm">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
```

---

## Feature Announcement Component

```typescript
// components/tour/feature-announcement.tsx
'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, ArrowRight, X } from 'lucide-react'

export interface Announcement {
  id: string
  title: string
  titleTh?: string
  description: string
  descriptionTh?: string
  features: Array<{
    icon?: React.ReactNode
    text: string
    textTh?: string
  }>
  action?: {
    label: string
    labelTh?: string
    href?: string
    onClick?: () => void
  }
  version?: string
  date?: string
}

interface FeatureAnnouncementProps {
  announcement: Announcement
  open: boolean
  onOpenChange: (open: boolean) => void
  onDismiss: () => void
}

export function FeatureAnnouncement({
  announcement,
  open,
  onOpenChange,
  onDismiss
}: FeatureAnnouncementProps) {
  const { locale } = useI18n()

  const title = locale === 'th' && announcement.titleTh
    ? announcement.titleTh
    : announcement.title

  const description = locale === 'th' && announcement.descriptionTh
    ? announcement.descriptionTh
    : announcement.description

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {announcement.version && (
              <Badge variant="secondary">v{announcement.version}</Badge>
            )}
            {announcement.date && (
              <span className="text-xs text-muted-foreground">
                {announcement.date}
              </span>
            )}
          </div>
          <DialogDescription className="pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {announcement.features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              {feature.icon && (
                <span className="text-primary mt-0.5">{feature.icon}</span>
              )}
              <p className="text-sm">
                {locale === 'th' && feature.textTh ? feature.textTh : feature.text}
              </p>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={onDismiss}>
            {locale === 'th' ? 'ไม่ต้องแสดงอีก' : "Don't show again"}
          </Button>
          {announcement.action && (
            <Button asChild={!!announcement.action.href}>
              {announcement.action.href ? (
                <a href={announcement.action.href}>
                  {locale === 'th' && announcement.action.labelTh
                    ? announcement.action.labelTh
                    : announcement.action.label}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              ) : (
                <button onClick={announcement.action.onClick}>
                  {locale === 'th' && announcement.action.labelTh
                    ? announcement.action.labelTh
                    : announcement.action.label}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Tour List Component

```typescript
// components/tour/tour-list.tsx
'use client'

import { useI18n } from '@/hooks/use-i18n'
import { Tour } from '@/lib/tour/service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, Check, RotateCcw } from 'lucide-react'

interface TourListProps {
  tours: (Tour & { progress: any })[]
  onStartTour: (tourId: string) => void
  onResetTour: (tourId: string) => void
}

export function TourList({ tours, onStartTour, onResetTour }: TourListProps) {
  const { locale } = useI18n()

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {tours.map((tour) => {
        const name = locale === 'th' && tour.nameTh ? tour.nameTh : tour.name
        const description = locale === 'th' && tour.descriptionTh
          ? tour.descriptionTh
          : tour.description

        const isCompleted = tour.progress?.completedAt
        const isStarted = tour.progress?.startedAt && !tour.progress?.completedAt

        return (
          <Card key={tour.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{name}</CardTitle>
                {isCompleted && (
                  <Badge variant="secondary">
                    <Check className="h-3 w-3 mr-1" />
                    {locale === 'th' ? 'เสร็จสิ้น' : 'Completed'}
                  </Badge>
                )}
                {isStarted && (
                  <Badge variant="outline">
                    {locale === 'th' ? 'กำลังดำเนินการ' : 'In Progress'}
                  </Badge>
                )}
              </div>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {locale === 'th'
                  ? `${tour.steps.length} ขั้นตอน`
                  : `${tour.steps.length} steps`}
              </p>

              <div className="flex gap-2">
                <Button
                  onClick={() => onStartTour(tour.id)}
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isCompleted
                    ? locale === 'th' ? 'เริ่มใหม่' : 'Restart'
                    : isStarted
                      ? locale === 'th' ? 'ดำเนินการต่อ' : 'Continue'
                      : locale === 'th' ? 'เริ่ม' : 'Start'}
                </Button>

                {tour.progress && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onResetTour(tour.id)}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
```

---

## Usage Examples

```tsx
// Example 1: Tour provider in layout
'use client'

import { useTour } from '@/hooks/use-tour'
import { TourGuide } from '@/components/tour/tour-guide'

export function AppLayout({ children }) {
  const {
    activeTour,
    currentStep,
    beginTour,
    nextStep,
    prevStep,
    completeTour,
    skipActiveTour,
    closeTour
  } = useTour()

  return (
    <>
      {children}

      {activeTour && (
        <TourGuide
          steps={activeTour.steps}
          currentStep={currentStep}
          onNext={nextStep}
          onPrev={prevStep}
          onComplete={completeTour}
          onSkip={skipActiveTour}
          onClose={closeTour}
        />
      )}
    </>
  )
}

// Example 2: Add data-tour attributes to elements
function Dashboard() {
  return (
    <div>
      <nav data-tour="sidebar">
        <a href="/dashboard" data-tour="dashboard">Dashboard</a>
        <a href="/inventory" data-tour="inventory">Inventory</a>
        <a href="/requests" data-tour="requests">Requests</a>
      </nav>

      <header>
        <button data-tour="notifications">
          <Bell />
        </button>
      </header>

      {/* Content */}
    </div>
  )
}

// Example 3: Help tooltip usage
import { HelpTooltip } from '@/components/tour/help-tooltip'

function InventoryForm() {
  return (
    <div>
      <label className="flex items-center gap-2">
        Serial Number
        <HelpTooltip
          content="Enter the unique serial number of the item"
          contentTh="กรอกหมายเลขซีเรียลของพัสดุ"
        />
      </label>
      <input name="serialNumber" />
    </div>
  )
}

// Example 4: Feature announcement on first login
import { FeatureAnnouncement } from '@/components/tour/feature-announcement'

function WelcomeScreen() {
  const [showAnnouncement, setShowAnnouncement] = useState(true)

  const announcement = {
    id: 'v2.0',
    title: "What's New in HR-IMS",
    titleTh: 'มีอะไรใหม่ใน HR-IMS',
    description: 'We have added several new features to help you manage inventory more efficiently.',
    descriptionTh: 'เราได้เพิ่มฟีเจอร์ใหม่หลายอย่างเพื่อช่วยให้คุณจัดการพัสดุได้ง่ายขึ้น',
    version: '2.0.0',
    date: '2024-01-15',
    features: [
      { text: 'New QR code scanning feature', textTh: 'ฟีเจอร์สแกน QR Code ใหม่' },
      { text: 'Improved search performance', textTh: 'ปรับปรุงประสิทธิภาพการค้นหา' },
      { text: 'Dark mode support', textTh: 'รองรับโหมดมืด' }
    ],
    action: {
      label: 'Take a Tour',
      labelTh: 'ทัวร์แนะนำ',
      href: '/tour'
    }
  }

  return (
    <FeatureAnnouncement
      announcement={announcement}
      open={showAnnouncement}
      onOpenChange={setShowAnnouncement}
      onDismiss={() => {
        localStorage.setItem('announcement-dismissed', 'v2.0')
        setShowAnnouncement(false)
      }}
    />
  )
}
```

---

## Prisma Schema Addition

```prisma
// Add to prisma/schema.prisma

model UserTourProgress {
  id          Int       @id @default(autoincrement())
  userId      Int
  tourId      String
  startedAt   DateTime?
  currentStep Int       @default(0)
  completedAt DateTime?
  skippedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user        User      @relation(fields: [userId], references: [id])

  @@unique([userId, tourId])
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
