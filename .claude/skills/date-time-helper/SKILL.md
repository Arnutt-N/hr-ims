---
name: date-time-helper
description: Date/time formatting, manipulation, and display utilities for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["date", "time", "datetime", "calendar", "format", "timezone", "date picker"]
  file_patterns: ["*date*", "*time*", "lib/date/**", "lib/utils/date*"]
  context: date formatting, time display, calendar components, date ranges
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# Date Time Helper

## Core Role

Handle date/time operations for HR-IMS:
- Thai/English date formatting
- Date range calculations
- Time zone handling
- Date picker components

---

## Date Formatting Utilities

### Format Functions

```typescript
// lib/date/format.ts
import { format, formatDistance, formatRelative, isValid, parseISO } from 'date-fns'
import { th, enUS } from 'date-fns/locale'

type Locale = 'th' | 'en'

const locales = { th, en: enUS }

// Format date with locale
export function formatDate(
  date: Date | string | null | undefined,
  formatStr: string = 'PP',
  locale: Locale = 'th'
): string {
  if (!date) return '-'

  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '-'

  return format(d, formatStr, { locale: locales[locale] })
}

// Common formats
export const formats = {
  // Date only
  short: 'd MMM yyyy',        // 1 ม.ค. 2024
  medium: 'd MMMM yyyy',      // 1 มกราคม 2024
  long: 'EEEE, d MMMM yyyy',  // จันทร์, 1 มกราคม 2024

  // Time only
  time: 'HH:mm',              // 14:30
  timeWithSec: 'HH:mm:ss',    // 14:30:00
  time12: 'h:mm a',           // 2:30 PM

  // Date and time
  datetime: 'd MMM yyyy HH:mm',      // 1 ม.ค. 2024 14:30
  datetimeFull: 'd MMMM yyyy HH:mm', // 1 มกราคม 2024 14:30
}

// Pre-built formatters
export function formatShort(date: Date | string, locale: Locale = 'th') {
  return formatDate(date, formats.short, locale)
}

export function formatMedium(date: Date | string, locale: Locale = 'th') {
  return formatDate(date, formats.medium, locale)
}

export function formatLong(date: Date | string, locale: Locale = 'th') {
  return formatDate(date, formats.long, locale)
}

export function formatDateTime(date: Date | string, locale: Locale = 'th') {
  return formatDate(date, formats.datetime, locale)
}

export function formatTime(date: Date | string, locale: Locale = 'th') {
  return formatDate(date, formats.time, locale)
}

// Bilingual format (Thai / English)
export function formatBilingual(date: Date | string, formatStr: string = formats.short) {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '-'

  return `${format(d, formatStr, { locale: th })} / ${format(d, formatStr, { locale: enUS })}`
}
```

### Relative Time

```typescript
// lib/date/relative.ts
import { formatDistance, formatDistanceToNow, formatRelative, parseISO, isValid } from 'date-fns'
import { th, enUS } from 'date-fns/locale'

type Locale = 'th' | 'en'

const locales = { th, en: enUS }

// Time ago (5 นาทีที่แล้ว / 5 minutes ago)
export function timeAgo(
  date: Date | string,
  locale: Locale = 'th',
  addSuffix: boolean = true
): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '-'

  return formatDistanceToNow(d, {
    addSuffix,
    locale: locales[locale]
  })
}

// Time between two dates
export function timeBetween(
  dateStart: Date | string,
  dateEnd: Date | string,
  locale: Locale = 'th'
): string {
  const start = typeof dateStart === 'string' ? parseISO(dateStart) : dateStart
  const end = typeof dateEnd === 'string' ? parseISO(dateEnd) : dateEnd

  if (!isValid(start) || !isValid(end)) return '-'

  return formatDistance(start, end, { locale: locales[locale] })
}

// Relative day (วันนี้, เมื่อวาน, พรุ่งนี้ / Today, Yesterday, Tomorrow)
export function relativeDay(
  date: Date | string,
  locale: Locale = 'th',
  baseDate: Date = new Date()
): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '-'

  return formatRelative(d, baseDate, { locale: locales[locale] })
}

// Smart display (relative for recent, absolute for old)
export function smartTimeDisplay(
  date: Date | string,
  locale: Locale = 'th',
  thresholdDays: number = 7
): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '-'

  const now = new Date()
  const diffDays = Math.abs((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < thresholdDays) {
    return timeAgo(d, locale)
  }

  return formatDate(d, formats.short, locale)
}
```

---

## Date Calculations

```typescript
// lib/date/calculations.ts
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  differenceInYears,
  differenceInBusinessDays,
  isAfter,
  isBefore,
  isWithinInterval,
  isToday,
  isYesterday,
  isTomorrow,
  isThisWeek,
  isThisMonth,
  isThisYear,
  isWeekend,
  isSameDay,
  isSameWeek,
  isSameMonth,
  isSameYear,
  min,
  max,
  parseISO,
  isValid
} from 'date-fns'

// Date range helpers
export function getDayRange(date: Date = new Date()) {
  return { start: startOfDay(date), end: endOfDay(date) }
}

export function getWeekRange(date: Date = new Date(), weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0) {
  return {
    start: startOfWeek(date, { weekStartsOn }),
    end: endOfWeek(date, { weekStartsOn })
  }
}

export function getMonthRange(date: Date = new Date()) {
  return { start: startOfMonth(date), end: endOfMonth(date) }
}

export function getYearRange(date: Date = new Date()) {
  return { start: startOfYear(date), end: endOfYear(date) }
}

// Common date ranges
export function getLast7Days() {
  const end = new Date()
  const start = subDays(end, 6)
  return { start: startOfDay(start), end: endOfDay(end) }
}

export function getLast30Days() {
  const end = new Date()
  const start = subDays(end, 29)
  return { start: startOfDay(start), end: endOfDay(end) }
}

export function getLast90Days() {
  const end = new Date()
  const start = subDays(end, 89)
  return { start: startOfDay(start), end: endOfDay(end) }
}

export function getThisWeek() {
  return getWeekRange(new Date())
}

export function getThisMonth() {
  return getMonthRange(new Date())
}

export function getThisYear() {
  return getYearRange(new Date())
}

// Working days calculation
export function getWorkingDaysBetween(start: Date | string, end: Date | string): number {
  const startDate = typeof start === 'string' ? parseISO(start) : start
  const endDate = typeof end === 'string' ? parseISO(end) : end

  return differenceInBusinessDays(endDate, startDate)
}

// Age calculation
export function calculateAge(birthDate: Date | string): number {
  const birth = typeof birthDate === 'string' ? parseISO(birthDate) : birthDate
  return differenceInYears(new Date(), birth)
}

// Duration in human-readable format
export function formatDuration(
  startDate: Date | string,
  endDate: Date | string
): { years: number; months: number; days: number } {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate

  let remaining = end.getTime() - start.getTime()

  const years = differenceInYears(end, start)
  remaining -= years * 365.25 * 24 * 60 * 60 * 1000

  const months = differenceInMonths(end, addYears(start, years))
  remaining -= months * 30.44 * 24 * 60 * 60 * 1000

  const days = Math.round(remaining / (24 * 60 * 60 * 1000))

  return { years, months, days }
}

// Thai Buddhist year conversion
export function toBuddhistYear(date: Date | string): number {
  const d = typeof date === 'string' ? parseISO(date) : date
  return d.getFullYear() + 543
}

export function fromBuddhistYear(year: number): number {
  return year - 543
}
```

---

## Date Picker Component

```typescript
// components/ui/date-picker.tsx
'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { th, enUS } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DatePickerProps {
  date?: Date
  onDateChange: (date: Date | undefined) => void
  placeholder?: string
  formatStr?: string
  locale?: 'th' | 'en'
  disabled?: boolean
  className?: string
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = 'เลือกวันที่ / Pick a date',
  formatStr = 'PP',
  locale = 'th',
  disabled,
  className
}: DatePickerProps) {
  const locales = { th, en: enUS }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, formatStr, { locale: locales[locale] }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          initialFocus
          locale={locales[locale]}
        />
      </PopoverContent>
    </Popover>
  )
}
```

### Date Range Picker

```typescript
// components/ui/date-range-picker.tsx
'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { th, enUS } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DateRangePickerProps {
  dateRange?: DateRange
  onDateRangeChange: (range: DateRange | undefined) => void
  placeholder?: string
  formatStr?: string
  locale?: 'th' | 'en'
  disabled?: boolean
  className?: string
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  placeholder = 'เลือกช่วงวันที่ / Select date range',
  formatStr = 'PP',
  locale = 'th',
  disabled,
  className
}: DateRangePickerProps) {
  const locales = { th, en: enUS }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !dateRange?.from && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange?.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, formatStr, { locale: locales[locale] })} -{' '}
                {format(dateRange.to, formatStr, { locale: locales[locale] })}
              </>
            ) : (
              format(dateRange.from, formatStr, { locale: locales[locale] })
            )
          ) : (
            placeholder
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={onDateRangeChange}
          numberOfMonths={2}
          initialFocus
          locale={locales[locale]}
        />
      </PopoverContent>
    </Popover>
  )
}
```

### Preset Date Range Selector

```typescript
// components/ui/date-range-presets.tsx
'use client'

import { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import {
  getLast7Days,
  getLast30Days,
  getLast90Days,
  getThisWeek,
  getThisMonth,
  getThisYear
} from '@/lib/date/calculations'

interface DateRangePreset {
  label: string
  labelEn: string
  range: () => { start: Date; end: Date }
}

const presets: DateRangePreset[] = [
  { label: '7 วันที่แล้ว', labelEn: 'Last 7 days', range: getLast7Days },
  { label: '30 วันที่แล้ว', labelEn: 'Last 30 days', range: getLast30Days },
  { label: '90 วันที่แล้ว', labelEn: 'Last 90 days', range: getLast90Days },
  { label: 'สัปดาห์นี้', labelEn: 'This week', range: getThisWeek },
  { label: 'เดือนนี้', labelEn: 'This month', range: getThisMonth },
  { label: 'ปีนี้', labelEn: 'This year', range: getThisYear }
]

interface DateRangePresetsProps {
  onSelect: (range: DateRange) => void
  selectedPreset?: string
}

export function DateRangePresets({ onSelect, selectedPreset }: DateRangePresetsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((preset) => {
        const { start, end } = preset.range()
        const isActive = selectedPreset === preset.label

        return (
          <Button
            key={preset.label}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect({ from: start, to: end })}
          >
            {preset.label} / {preset.labelEn}
          </Button>
        )
      })}
    </div>
  )
}
```

---

## Time Display Components

### Live Clock

```typescript
// components/date-time/live-clock.tsx
'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

interface LiveClockProps {
  formatStr?: string
  className?: string
}

export function LiveClock({ formatStr = 'HH:mm:ss', className }: LiveClockProps) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <span className={className}>
      {format(time, formatStr, { locale: th })}
    </span>
  )
}
```

### Timestamp Display

```typescript
// components/date-time/timestamp-display.tsx
import { timeAgo, formatDateTime } from '@/lib/date/format'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface TimestampDisplayProps {
  date: Date | string
  showRelative?: boolean
  locale?: 'th' | 'en'
}

export function TimestampDisplay({
  date,
  showRelative = true,
  locale = 'th'
}: TimestampDisplayProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help text-muted-foreground">
          {showRelative ? timeAgo(date, locale) : formatDateTime(date, locale)}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{formatDateTime(date, locale)}</p>
      </TooltipContent>
    </Tooltip>
  )
}
```

---

## Server-Side Formatting

```typescript
// lib/date/server-format.ts
import { format } from 'date-fns'
import { th, enUS } from 'date-fns/locale'
import { parseISO, isValid } from 'date-fns'

// For Prisma queries and server-side rendering
export function formatDateForQuery(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function formatDateTimeForQuery(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss")
}

// Parse date from various formats
export function parseDateInput(input: string | Date | null | undefined): Date | null {
  if (!input) return null
  if (input instanceof Date) return input

  // Try ISO format
  const isoDate = parseISO(input)
  if (isValid(isoDate)) return isoDate

  // Try Thai date format (dd/MM/yyyy)
  const thaiMatch = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (thaiMatch) {
    const [, day, month, year] = thaiMatch
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    if (isValid(date)) return date
  }

  return null
}

// Format for database storage
export function toISOString(date: Date | string | null): string | null {
  if (!date) return null
  const d = typeof date === 'string' ? parseISO(date) : date
  return isValid(d) ? d.toISOString() : null
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
