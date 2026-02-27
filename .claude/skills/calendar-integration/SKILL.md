---
name: calendar-integration
description: Calendar views and date-based features for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["calendar", "schedule", "timeline", "date picker", "due date"]
  file_patterns: ["*calendar*", "*schedule*", "lib/calendar*"]
  context: calendar views, schedules, timelines, date pickers, due dates
mcp_servers:
  - sequential
personas:
  - frontend
---

# Calendar Integration

## Core Role

Implement calendar features for HR-IMS:
- Calendar views
- Due date tracking
- Schedule visualization
- Event management

---

## Calendar Service

```typescript
// lib/calendar/service.ts
import prisma from '@/lib/prisma'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, addMonths, subMonths, isSameDay, isToday, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  date: Date
  endDate?: Date
  type: 'request' | 'maintenance' | 'return_due' | 'meeting' | 'reminder'
  entityType?: string
  entityId?: number
  status: string
  color: string
}

export interface CalendarDay {
  date: Date
  isToday: boolean
  isCurrentMonth: boolean
  events: CalendarEvent[]
}

// Get calendar events for date range
export async function getCalendarEvents(
  startDate: Date,
  endDate: Date,
  userId?: number
): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = []

  // Get requests with due dates
  const requests = await prisma.request.findMany({
    where: {
      dueDate: {
        gte: startDate,
        lte: endDate
      },
      ...(userId && { userId })
    },
    include: {
      user: { select: { name: true } },
      requestItems: {
        include: { item: { select: { name: true } } }
      }
    }
  })

  requests.forEach(request => {
    events.push({
      id: `request-${request.id}`,
      title: `คำขอ #${request.id} - ${request.user.name}`,
      description: request.requestItems.map(ri => ri.item.name).join(', '),
      date: request.dueDate!,
      type: 'request',
      entityType: 'request',
      entityId: request.id,
      status: request.status,
      color: getRequestColor(request.status)
    })
  })

  // Get maintenance tickets
  const maintenanceTickets = await prisma.maintenanceTicket.findMany({
    where: {
      scheduledDate: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      equipment: { select: { name: true } }
    }
  })

  maintenanceTickets.forEach(ticket => {
    events.push({
      id: `maintenance-${ticket.id}`,
      title: `บำรุง: ${ticket.equipment.name}`,
      description: ticket.description || undefined,
      date: ticket.scheduledDate,
      type: 'maintenance',
      entityType: 'maintenance',
      entityId: ticket.id,
      status: ticket.status,
      color: '#3b82f6' // blue
    })
  })

  // Get return due dates
  const returnDueRequests = await prisma.request.findMany({
    where: {
      type: 'BORROW',
      dueDate: {
        gte: startDate,
        lte: endDate
      },
      status: 'APPROVED',
      ...(userId && { userId })
    },
    include: {
      user: { select: { name: true } }
    }
  })

  returnDueRequests.forEach(request => {
    events.push({
      id: `return-${request.id}`,
      title: `ครบกำหนดคืน #${request.id}`,
      description: request.user.name,
      date: request.dueDate!,
      type: 'return_due',
      entityType: 'request',
      entityId: request.id,
      status: request.status,
      color: '#f59e0b' // amber
    })
  })

  return events
}

// Get calendar month data
export async function getCalendarMonth(
  year: number,
  month: number,
  userId?: number
): Promise<CalendarDay[]> {
  const monthStart = startOfMonth(new Date(year, month - 1))
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const events = await getCalendarEvents(calendarStart, calendarEnd, userId)

  return days.map(date => ({
    date,
    isToday: isToday(date),
    isCurrentMonth: date.getMonth() === month - 1,
    events: events.filter(event => isSameDay(event.date, date))
  }))
}

// Get upcoming events
export async function getUpcomingEvents(
  userId: number,
  limit: number = 10
): Promise<CalendarEvent[]> {
  const now = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 30) // Next 30 days

  const events = await getCalendarEvents(now, endDate, userId)
  return events
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, limit)
}

// Get overdue items
export async function getOverdueItems(userId: number): Promise<CalendarEvent[]> {
  const now = new Date()

  const overdueRequests = await prisma.request.findMany({
    where: {
      userId,
      dueDate: { lt: now },
      status: { in: ['PENDING', 'APPROVED'] }
    },
    include: {
      requestItems: {
        include: { item: { select: { name: true } } }
      }
    }
  })

  return overdueRequests.map(request => ({
    id: `overdue-${request.id}`,
    title: `เกินกำหนด #${request.id}`,
    description: request.requestItems.map(ri => ri.item.name).join(', '),
    date: request.dueDate!,
    type: 'return_due' as const,
    entityType: 'request',
    entityId: request.id,
    status: 'OVERDUE',
    color: '#ef4444' // red
  }))
}

// Helper function for request color
function getRequestColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: '#f59e0b',
    APPROVED: '#22c55e',
    REJECTED: '#ef4444',
    COMPLETED: '#6b7280',
    CANCELLED: '#9ca3af'
  }
  return colors[status] || '#6b7280'
}

// Get events by date
export async function getEventsByDate(
  date: Date,
  userId?: number
): Promise<CalendarEvent[]> {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  return getCalendarEvents(startOfDay, endOfDay, userId)
}
```

---

## Calendar Component

```typescript
// components/calendar/calendar-view.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isToday
} from 'date-fns'
import { th } from 'date-fns/locale'
import { useI18n } from '@/hooks/use-i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { CalendarDay, getCalendarMonth } from '@/lib/calendar/service'

interface CalendarViewProps {
  userId?: number
  onDateSelect?: (date: Date, events: any[]) => void
  selectedDate?: Date
}

export function CalendarView({
  userId,
  onDateSelect,
  selectedDate
}: CalendarViewProps) {
  const { locale } = useI18n()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCalendarData = useCallback(async () => {
    setLoading(true)
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1
    const data = await getCalendarMonth(year, month, userId)
    setCalendarDays(data)
    setLoading(false)
  }, [currentDate, userId])

  useEffect(() => {
    fetchCalendarData()
  }, [fetchCalendarData])

  const handlePrevMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleDateClick = (day: CalendarDay) => {
    onDateSelect?.(day.date, day.events)
  }

  const weekDays = locale === 'th'
    ? ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {format(currentDate, locale === 'th' ? 'MMMM yyyy' : 'MMMM yyyy', {
              locale: locale === 'th' ? th : undefined
            })}
          </CardTitle>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={handleToday}>
              {locale === 'th' ? 'วันนี้' : 'Today'}
            </Button>
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            {locale === 'th' ? 'กำลังโหลด...' : 'Loading...'}
          </div>
        ) : (
          <>
            {/* Week day headers */}
            <div className="grid grid-cols-7 mb-2">
              {weekDays.map(day => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => (
                <button
                  key={index}
                  onClick={() => handleDateClick(day)}
                  className={`
                    min-h-[80px] p-1 rounded-lg text-left transition-colors
                    ${!day.isCurrentMonth ? 'opacity-40' : ''}
                    ${isToday(day.date) ? 'bg-primary/10 border border-primary' : 'hover:bg-muted'}
                    ${selectedDate && isSameDay(day.date, selectedDate) ? 'bg-primary/20 ring-2 ring-primary' : ''}
                  `}
                >
                  <div className={`
                    text-sm font-medium mb-1
                    ${isToday(day.date) ? 'text-primary' : ''}
                  `}>
                    {format(day.date, 'd')}
                  </div>

                  {/* Event indicators */}
                  <div className="space-y-0.5">
                    {day.events.slice(0, 3).map((event, i) => (
                      <div
                        key={i}
                        className="text-[10px] truncate px-1 py-0.5 rounded"
                        style={{ backgroundColor: event.color + '20', color: event.color }}
                      >
                        {event.title}
                      </div>
                    ))}
                    {day.events.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1">
                        +{day.events.length - 3} more
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## Upcoming Events Component

```typescript
// components/calendar/upcoming-events.tsx
'use client'

import { useState, useEffect } from 'react'
import { format, isToday, isTomorrow } from 'date-fns'
import { th } from 'date-fns/locale'
import { useI18n } from '@/hooks/use-i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, AlertTriangle, Wrench, Package } from 'lucide-react'
import { CalendarEvent, getUpcomingEvents, getOverdueItems } from '@/lib/calendar/service'

interface UpcomingEventsProps {
  userId: number
  limit?: number
}

export function UpcomingEvents({ userId, limit = 5 }: UpcomingEventsProps) {
  const { locale } = useI18n()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [overdue, setOverdue] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const [upcoming, overdueItems] = await Promise.all([
        getUpcomingEvents(userId, limit),
        getOverdueItems(userId)
      ])
      setEvents(upcoming)
      setOverdue(overdueItems)
      setLoading(false)
    }
    fetch()
  }, [userId, limit])

  const formatEventDate = (date: Date): string => {
    if (isToday(date)) {
      return locale === 'th' ? 'วันนี้' : 'Today'
    }
    if (isTomorrow(date)) {
      return locale === 'th' ? 'พรุ่งนี้' : 'Tomorrow'
    }
    return format(date, locale === 'th' ? 'd MMM' : 'MMM d', {
      locale: locale === 'th' ? th : undefined
    })
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'request': return Package
      case 'maintenance': return Wrench
      case 'return_due': return Clock
      default: return Clock
    }
  }

  if (loading) {
    return <div className="text-center py-4">Loading...</div>
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {locale === 'th' ? 'กำหนดการ' : 'Upcoming'}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overdue items */}
        {overdue.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {locale === 'th' ? 'เกินกำหนด' : 'Overdue'}
              </span>
            </div>
            {overdue.map(event => (
              <EventItem key={event.id} event={event} locale={formatEventDate} />
            ))}
          </div>
        )}

        {/* Upcoming events */}
        {events.length === 0 && overdue.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            {locale === 'th' ? 'ไม่มีกำหนดการ' : 'No upcoming events'}
          </div>
        ) : (
          <div className="space-y-2">
            {events.map(event => (
              <EventItem key={event.id} event={event} locale={formatEventDate} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EventItem({
  event,
  locale
}: {
  event: CalendarEvent
  locale: (date: Date) => string
}) {
  const Icon = event.type === 'maintenance' ? Wrench :
              event.type === 'return_due' ? Clock : Package

  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted">
      <div
        className="p-2 rounded-lg"
        style={{ backgroundColor: event.color + '20' }}
      >
        <Icon className="h-4 w-4" style={{ color: event.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{event.title}</p>
        {event.description && (
          <p className="text-xs text-muted-foreground truncate">
            {event.description}
          </p>
        )}
      </div>

      <Badge variant="outline" className="text-xs shrink-0">
        {locale(event.date)}
      </Badge>
    </div>
  )
}
```

---

## Mini Calendar Widget

```typescript
// components/calendar/mini-calendar.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isToday
} from 'date-fns'
import { th } from 'date-fns/locale'
import { useI18n } from '@/hooks/use-i18n'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MiniCalendarProps {
  selectedDate?: Date
  onDateSelect: (date: Date) => void
  eventDates?: Date[]
}

export function MiniCalendar({
  selectedDate,
  onDateSelect,
  eventDates = []
}: MiniCalendarProps) {
  const { locale } = useI18n()
  const [currentDate, setCurrentDate] = useState(new Date())

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const weekDays = locale === 'th'
    ? ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  const hasEvent = (date: Date) =>
    eventDates.some(d => isSameDay(d, date))

  return (
    <div className="w-[280px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCurrentDate(prev => subMonths(prev, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="text-sm font-medium">
          {format(currentDate, locale === 'th' ? 'MMMM yyyy' : 'MMMM yyyy', {
            locale: locale === 'th' ? th : undefined
          })}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCurrentDate(prev => addMonths(prev, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week days */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs text-muted-foreground py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <button
            key={index}
            onClick={() => onDateSelect(day)}
            className={`
              h-8 w-8 rounded-full text-sm flex items-center justify-center relative
              ${!isSameMonth(day, currentDate) ? 'text-muted-foreground' : ''}
              ${isToday(day) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
              ${selectedDate && isSameDay(day, selectedDate) && !isToday(day) ? 'bg-muted' : ''}
            `}
          >
            {format(day, 'd')}
            {hasEvent(day) && (
              <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
```

---

## Usage Examples

```tsx
// Example 1: Full calendar view
import { CalendarView } from '@/components/calendar/calendar-view'

function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvents, setSelectedEvents] = useState([])

  const handleDateSelect = (date: Date, events: any[]) => {
    setSelectedDate(date)
    setSelectedEvents(events)
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2">
        <CalendarView
          onDateSelect={handleDateSelect}
          selectedDate={selectedDate}
        />
      </div>
      <div>
        <h3>Events for {selectedDate?.toDateString()}</h3>
        {/* Display selectedEvents */}
      </div>
    </div>
  )
}

// Example 2: Upcoming events widget
import { UpcomingEvents } from '@/components/calendar/upcoming-events'

function Dashboard({ session }) {
  return (
    <div>
      <h1>Dashboard</h1>
      <UpcomingEvents userId={parseInt(session.user.id)} limit={5} />
    </div>
  )
}

// Example 3: Mini calendar for sidebar
import { MiniCalendar } from '@/components/calendar/mini-calendar'

function Sidebar() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [eventDates, setEventDates] = useState<Date[]>([])

  return (
    <MiniCalendar
      selectedDate={selectedDate}
      onDateSelect={setSelectedDate}
      eventDates={eventDates}
    />
  )
}

// Example 4: Get events programmatically
import { getCalendarEvents, getUpcomingEvents } from '@/lib/calendar/service'

async function sendDailyDigest(userId: number) {
  const upcoming = await getUpcomingEvents(userId, 10)

  // Send email with upcoming events
  console.log('Upcoming events:', upcoming)
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
