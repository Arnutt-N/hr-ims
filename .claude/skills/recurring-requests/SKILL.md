---
name: recurring-requests
description: Recurring and scheduled requests for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["recurring", "schedule", "repeat", "auto request", "periodic"]
  file_patterns: ["*recurring*", "*scheduled-request*", "*auto-request*"]
  context: recurring requests, scheduled requests, periodic requests, repeat requests
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# Recurring Requests System

## Core Role

Implement recurring and scheduled requests for HR-IMS:
- Create recurring request templates
- Schedule periodic requests
- Auto-generate requests on schedule
- Manage recurring request patterns

---

## Recurring Request Service

```typescript
// lib/recurring/service.ts
import prisma from '@/lib/prisma'
import { createAuditLog, AuditAction } from '@/lib/audit/logger'

export type RecurrencePattern = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'

export interface RecurringRequestTemplate {
  id: number
  name: string
  description?: string
  userId: number
  type: 'BORROW' | 'WITHDRAW'
  warehouseId: number
  recurrencePattern: RecurrencePattern
  recurrenceInterval: number // e.g., every 2 weeks
  recurrenceDays?: number[] // 0-6 for weekly, 1-31 for monthly
  startDate: Date
  endDate?: Date
  maxOccurrences?: number
  currentOccurrences: number
  nextOccurrenceAt?: Date
  isActive: boolean
  items: Array<{
    itemId: number
    quantity: number
    notes?: string
  }>
  createdAt: Date
  updatedAt: Date
}

// Create recurring request template
export async function createRecurringTemplate(data: {
  name: string
  description?: string
  userId: number
  type: 'BORROW' | 'WITHDRAW'
  warehouseId: number
  recurrencePattern: RecurrencePattern
  recurrenceInterval?: number
  recurrenceDays?: number[]
  startDate: Date
  endDate?: Date
  maxOccurrences?: number
  items: Array<{ itemId: number; quantity: number; notes?: string }>
}): Promise<RecurringRequestTemplate> {
  const interval = data.recurrenceInterval || 1
  const nextOccurrenceAt = calculateNextOccurrence(
    data.startDate,
    data.recurrencePattern,
    interval,
    data.recurrenceDays
  )

  const template = await prisma.recurringRequestTemplate.create({
    data: {
      name: data.name,
      description: data.description,
      userId: data.userId,
      type: data.type,
      warehouseId: data.warehouseId,
      recurrencePattern: data.recurrencePattern,
      recurrenceInterval: interval,
      recurrenceDays: data.recurrenceDays ? JSON.stringify(data.recurrenceDays) : null,
      startDate: data.startDate,
      endDate: data.endDate,
      maxOccurrences: data.maxOccurrences,
      currentOccurrences: 0,
      nextOccurrenceAt,
      isActive: true,
      items: JSON.stringify(data.items)
    }
  })

  await createAuditLog({
    action: AuditAction.CREATE,
    tableName: 'RecurringRequestTemplate',
    recordId: template.id,
    userId: data.userId,
    oldData: null,
    newData: template
  })

  return template as RecurringRequestTemplate
}

// Update recurring template
export async function updateRecurringTemplate(
  id: number,
  userId: number,
  data: Partial<{
    name: string
    description: string
    recurrencePattern: RecurrencePattern
    recurrenceInterval: number
    recurrenceDays: number[]
    startDate: Date
    endDate: Date
    maxOccurrences: number
    isActive: boolean
    items: Array<{ itemId: number; quantity: number; notes?: string }>
  }>
): Promise<RecurringRequestTemplate | null> {
  const existing = await prisma.recurringRequestTemplate.findUnique({
    where: { id }
  })

  if (!existing || existing.userId !== userId) {
    return null
  }

  const updateData: any = { ...data }

  if (data.recurrenceDays) {
    updateData.recurrenceDays = JSON.stringify(data.recurrenceDays)
  }

  if (data.items) {
    updateData.items = JSON.stringify(data.items)
  }

  // Recalculate next occurrence if pattern changed
  if (data.recurrencePattern || data.recurrenceInterval || data.recurrenceDays) {
    updateData.nextOccurrenceAt = calculateNextOccurrence(
      new Date(),
      data.recurrencePattern || existing.recurrencePattern as RecurrencePattern,
      data.recurrenceInterval || existing.recurrenceInterval,
      data.recurrenceDays || (existing.recurrenceDays ? JSON.parse(existing.recurrenceDays as string) : undefined)
    )
  }

  const updated = await prisma.recurringRequestTemplate.update({
    where: { id },
    data: updateData
  })

  return updated as RecurringRequestTemplate
}

// Get user's recurring templates
export async function getUserRecurringTemplates(
  userId: number,
  options: { includeInactive?: boolean } = {}
): Promise<RecurringRequestTemplate[]> {
  const templates = await prisma.recurringRequestTemplate.findMany({
    where: {
      userId,
      ...(options.includeInactive ? {} : { isActive: true })
    },
    orderBy: { createdAt: 'desc' }
  })

  return templates.map(t => ({
    ...t,
    recurrenceDays: t.recurrenceDays ? JSON.parse(t.recurrenceDays as string) : null,
    items: JSON.parse(t.items as string)
  })) as RecurringRequestTemplate[]
}

// Generate request from template
export async function generateRequestFromTemplate(
  templateId: number
): Promise<{ requestId: number; requestCode: string }> {
  const template = await prisma.recurringRequestTemplate.findUnique({
    where: { id: templateId }
  })

  if (!template || !template.isActive) {
    throw new Error('Template not found or inactive')
  }

  // Check if should still generate
  if (template.endDate && new Date() > template.endDate) {
    await prisma.recurringRequestTemplate.update({
      where: { id: templateId },
      data: { isActive: false }
    })
    throw new Error('Template has ended')
  }

  if (template.maxOccurrences && template.currentOccurrences >= template.maxOccurrences) {
    await prisma.recurringRequestTemplate.update({
      where: { id: templateId },
      data: { isActive: false }
    })
    throw new Error('Max occurrences reached')
  }

  const items = JSON.parse(template.items as string)
  const requestCode = await generateRequestCode()

  // Create request
  const request = await prisma.request.create({
    data: {
      requestCode,
      userId: template.userId,
      type: template.type as any,
      status: 'PENDING',
      warehouseId: template.warehouseId,
      notes: `Auto-generated from recurring template: ${template.name}`,
      recurringTemplateId: templateId
    }
  })

  // Create request items
  for (const item of items) {
    await prisma.requestItem.create({
      data: {
        requestId: request.id,
        itemId: item.itemId,
        quantity: item.quantity,
        notes: item.notes
      }
    })
  }

  // Update template
  const nextOccurrence = calculateNextOccurrence(
    new Date(),
    template.recurrencePattern as RecurrencePattern,
    template.recurrenceInterval,
    template.recurrenceDays ? JSON.parse(template.recurrenceDays as string) : undefined
  )

  await prisma.recurringRequestTemplate.update({
    where: { id: templateId },
    data: {
      currentOccurrences: { increment: 1 },
      lastOccurrenceAt: new Date(),
      nextOccurrenceAt: nextOccurrence
    }
  })

  await createAuditLog({
    action: AuditAction.CREATE,
    tableName: 'Request',
    recordId: request.id,
    userId: template.userId,
    oldData: null,
    newData: {
      ...request,
      generatedFromTemplate: templateId
    }
  })

  return { requestId: request.id, requestCode }
}

// Process all due recurring requests
export async function processDueRecurringRequests(): Promise<{
  processed: number
  generated: Array<{ templateId: number; requestId: number; requestCode: string }>
  errors: Array<{ templateId: number; error: string }>
}> {
  const now = new Date()

  const dueTemplates = await prisma.recurringRequestTemplate.findMany({
    where: {
      isActive: true,
      nextOccurrenceAt: { lte: now },
      OR: [
        { endDate: null },
        { endDate: { gte: now } }
      ]
    }
  })

  const generated: Array<{ templateId: number; requestId: number; requestCode: string }> = []
  const errors: Array<{ templateId: number; error: string }> = []

  for (const template of dueTemplates) {
    try {
      const result = await generateRequestFromTemplate(template.id)
      generated.push({
        templateId: template.id,
        requestId: result.requestId,
        requestCode: result.requestCode
      })
    } catch (error: any) {
      errors.push({
        templateId: template.id,
        error: error.message
      })
    }
  }

  return {
    processed: dueTemplates.length,
    generated,
    errors
  }
}

// Calculate next occurrence
function calculateNextOccurrence(
  fromDate: Date,
  pattern: RecurrencePattern,
  interval: number,
  days?: number[]
): Date {
  const next = new Date(fromDate)

  switch (pattern) {
    case 'DAILY':
      next.setDate(next.getDate() + interval)
      break

    case 'WEEKLY':
      if (days && days.length > 0) {
        // Find next day in the specified days
        const currentDay = next.getDay()
        const sortedDays = [...days].sort((a, b) => a - b)

        // Find next day this week
        let nextDay = sortedDays.find(d => d > currentDay)

        if (nextDay === undefined) {
          // Move to next week and use first day
          nextDay = sortedDays[0]
          next.setDate(next.getDate() + (7 - currentDay + nextDay) + (interval - 1) * 7)
        } else {
          next.setDate(next.getDate() + (nextDay - currentDay))
        }
      } else {
        next.setDate(next.getDate() + 7 * interval)
      }
      break

    case 'MONTHLY':
      if (days && days.length > 0) {
        // Use specific day of month
        const targetDay = Math.min(days[0], 28) // Avoid issues with month lengths
        next.setMonth(next.getMonth() + interval)
        next.setDate(targetDay)
      } else {
        next.setMonth(next.getMonth() + interval)
      }
      break

    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3 * interval)
      break

    case 'YEARLY':
      next.setFullYear(next.getFullYear() + interval)
      break
  }

  return next
}

// Generate unique request code
async function generateRequestCode(): Promise<string> {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const prefix = `REQ${year}${month}`

  const lastRequest = await prisma.request.findFirst({
    where: { requestCode: { startsWith: prefix } },
    orderBy: { requestCode: 'desc' }
  })

  let nextNum = 1
  if (lastRequest) {
    const lastNum = parseInt(lastRequest.requestCode.slice(-4))
    nextNum = lastNum + 1
  }

  return `${prefix}${nextNum.toString().padStart(4, '0')}`
}

// Delete recurring template
export async function deleteRecurringTemplate(
  id: number,
  userId: number
): Promise<boolean> {
  const template = await prisma.recurringRequestTemplate.findUnique({
    where: { id }
  })

  if (!template || template.userId !== userId) {
    return false
  }

  await prisma.recurringRequestTemplate.delete({
    where: { id }
  })

  await createAuditLog({
    action: AuditAction.DELETE,
    tableName: 'RecurringRequestTemplate',
    recordId: id,
    userId,
    oldData: template,
    newData: null
  })

  return true
}

// Pause/Resume recurring template
export async function toggleRecurringTemplate(
  id: number,
  userId: number,
  isActive: boolean
): Promise<RecurringRequestTemplate | null> {
  const template = await prisma.recurringRequestTemplate.findUnique({
    where: { id }
  })

  if (!template || template.userId !== userId) {
    return null
  }

  const updated = await prisma.recurringRequestTemplate.update({
    where: { id },
    data: { isActive }
  })

  return updated as RecurringRequestTemplate
}
```

---

## Recurring Request Form Component

```typescript
// components/recurring/recurring-form.tsx
'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, Plus, Trash2, Repeat } from 'lucide-react'
import { format } from 'date-fns'

const recurringSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['BORROW', 'WITHDRAW']),
  warehouseId: z.number(),
  recurrencePattern: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  recurrenceInterval: z.number().min(1).default(1),
  recurrenceDays: z.array(z.number()).optional(),
  startDate: z.date(),
  endDate: z.date().optional().nullable(),
  maxOccurrences: z.number().optional().nullable(),
  items: z.array(z.object({
    itemId: z.number(),
    quantity: z.number().min(1),
    notes: z.string().optional()
  })).min(1)
})

type RecurringFormData = z.infer<typeof recurringSchema>

interface RecurringFormProps {
  warehouses: Array<{ id: number; name: string }>
  items: Array<{ id: number; name: string; unit: string }>
  onSubmit: (data: RecurringFormData) => Promise<void>
  initialData?: Partial<RecurringFormData>
}

export function RecurringForm({
  warehouses,
  items,
  onSubmit,
  initialData
}: RecurringFormProps) {
  const { locale } = useI18n()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<RecurringFormData>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'BORROW',
      recurrencePattern: 'WEEKLY',
      recurrenceInterval: 1,
      recurrenceDays: [],
      startDate: new Date(),
      endDate: null,
      maxOccurrences: null,
      items: [{ itemId: 0, quantity: 1 }],
      ...initialData
    }
  })

  const watchPattern = form.watch('recurrencePattern')
  const watchItems = form.watch('items')

  const handleSubmit = async (data: RecurringFormData) => {
    setSubmitting(true)
    try {
      await onSubmit(data)
    } finally {
      setSubmitting(false)
    }
  }

  const addItem = () => {
    const currentItems = form.getValues('items')
    form.setValue('items', [...currentItems, { itemId: 0, quantity: 1 }])
  }

  const removeItem = (index: number) => {
    const currentItems = form.getValues('items')
    if (currentItems.length > 1) {
      form.setValue('items', currentItems.filter((_, i) => i !== index))
    }
  }

  const patternLabels: Record<string, { en: string; th: string }> = {
    DAILY: { en: 'Daily', th: 'ทุกวัน' },
    WEEKLY: { en: 'Weekly', th: 'ทุกสัปดาห์' },
    MONTHLY: { en: 'Monthly', th: 'ทุกเดือน' },
    QUARTERLY: { en: 'Quarterly', th: 'ทุก 3 เดือน' },
    YEARLY: { en: 'Yearly', th: 'ทุกปี' }
  }

  const weekDays = [
    { value: 0, label: { en: 'Sun', th: 'อา' } },
    { value: 1, label: { en: 'Mon', th: 'จ' } },
    { value: 2, label: { en: 'Tue', th: 'อ' } },
    { value: 3, label: { en: 'Wed', th: 'พ' } },
    { value: 4, label: { en: 'Thu', th: 'พฤ' } },
    { value: 5, label: { en: 'Fri', th: 'ศ' } },
    { value: 6, label: { en: 'Sat', th: 'ส' } }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Repeat className="h-5 w-5" />
          {locale === 'th' ? 'สร้างคำขอประจำ' : 'Create Recurring Request'}
        </CardTitle>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{locale === 'th' ? 'ชื่อเทมเพลต' : 'Template Name'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={locale === 'th' ? 'ตั้งชื่อ' : 'Enter name'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{locale === 'th' ? 'ประเภท' : 'Type'}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BORROW">
                          {locale === 'th' ? 'ยืม' : 'Borrow'}
                        </SelectItem>
                        <SelectItem value="WITHDRAW">
                          {locale === 'th' ? 'เบิก' : 'Withdraw'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="warehouseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{locale === 'th' ? 'คลังสินค้า' : 'Warehouse'}</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    value={String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={locale === 'th' ? 'เลือกคลัง' : 'Select warehouse'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recurrence Settings */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-medium">{locale === 'th' ? 'การตั้งเวลา' : 'Schedule'}</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="recurrencePattern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{locale === 'th' ? 'รูปแบบ' : 'Pattern'}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(patternLabels).map(([value, labels]) => (
                            <SelectItem key={value} value={value}>
                              {locale === 'th' ? labels.th : labels.en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recurrenceInterval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{locale === 'th' ? 'ทุกๆ (จำนวน)' : 'Every (n)'}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Day selection for weekly */}
              {watchPattern === 'WEEKLY' && (
                <FormField
                  control={form.control}
                  name="recurrenceDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{locale === 'th' ? 'วันในสัปดาห์' : 'Days of Week'}</FormLabel>
                      <div className="flex gap-2">
                        {weekDays.map((day) => (
                          <Badge
                            key={day.value}
                            variant={field.value?.includes(day.value) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => {
                              const current = field.value || []
                              if (current.includes(day.value)) {
                                field.onChange(current.filter((d) => d !== day.value))
                              } else {
                                field.onChange([...current, day.value])
                              }
                            }}
                          >
                            {locale === 'th' ? day.label.th : day.label.en}
                          </Badge>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Date range */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{locale === 'th' ? 'วันเริ่มต้น' : 'Start Date'}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className="w-full justify-start">
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              {field.value ? format(field.value, 'PPP') : 'Pick date'}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent>
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{locale === 'th' ? 'วันสิ้นสุด (ไม่บังคับ)' : 'End Date (optional)'}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className="w-full justify-start">
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              {field.value ? format(field.value, 'PPP') : 'No end date'}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent>
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{locale === 'th' ? 'รายการพัสดุ' : 'Items'}</h3>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  {locale === 'th' ? 'เพิ่มรายการ' : 'Add Item'}
                </Button>
              </div>

              {watchItems.map((_, index) => (
                <div key={index} className="flex items-end gap-4 p-3 border rounded-lg">
                  <FormField
                    control={form.control}
                    name={`items.${index}.itemId`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>{locale === 'th' ? 'พัสดุ' : 'Item'}</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(Number(v))}
                          value={String(field.value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={locale === 'th' ? 'เลือก' : 'Select'} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {items.map((item) => (
                              <SelectItem key={item.id} value={String(item.id)}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem className="w-24">
                        <FormLabel>{locale === 'th' ? 'จำนวน' : 'Qty'}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? locale === 'th' ? 'กำลังบันทึก...' : 'Saving...'
                : locale === 'th' ? 'บันทึก' : 'Save'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}
```

---

## Recurring List Component

```typescript
// components/recurring/recurring-list.tsx
'use client'

import { useI18n } from '@/hooks/use-i18n'
import { RecurringRequestTemplate } from '@/lib/recurring/service'
import { formatRelativeTime } from '@/lib/i18n/format'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Edit, Trash2, Play, Pause } from 'lucide-react'

interface RecurringListProps {
  templates: RecurringRequestTemplate[]
  onToggle: (id: number, isActive: boolean) => void
  onEdit?: (id: number) => void
  onDelete?: (id: number) => void
  onGenerateNow?: (id: number) => void
}

export function RecurringList({
  templates,
  onToggle,
  onEdit,
  onDelete,
  onGenerateNow
}: RecurringListProps) {
  const { locale } = useI18n()

  const patternLabels: Record<string, { en: string; th: string }> = {
    DAILY: { en: 'Daily', th: 'ทุกวัน' },
    WEEKLY: { en: 'Weekly', th: 'ทุกสัปดาห์' },
    MONTHLY: { en: 'Monthly', th: 'ทุกเดือน' },
    QUARTERLY: { en: 'Quarterly', th: 'ทุก 3 เดือน' },
    YEARLY: { en: 'Yearly', th: 'ทุกปี' }
  }

  const typeLabels = {
    BORROW: { en: 'Borrow', th: 'ยืม' },
    WITHDRAW: { en: 'Withdraw', th: 'เบิก' }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{locale === 'th' ? 'ชื่อ' : 'Name'}</TableHead>
          <TableHead>{locale === 'th' ? 'ประเภท' : 'Type'}</TableHead>
          <TableHead>{locale === 'th' ? 'รูปแบบ' : 'Pattern'}</TableHead>
          <TableHead>{locale === 'th' ? 'ครั้งถัดไป' : 'Next'}</TableHead>
          <TableHead>{locale === 'th' ? 'สถานะ' : 'Status'}</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {templates.map((template) => (
          <TableRow key={template.id}>
            <TableCell>
              <div>
                <p className="font-medium">{template.name}</p>
                <p className="text-xs text-muted-foreground">
                  {template.items.length} {locale === 'th' ? 'รายการ' : 'items'}
                </p>
              </div>
            </TableCell>

            <TableCell>
              <Badge variant="outline">
                {locale === 'th'
                  ? typeLabels[template.type as keyof typeof typeLabels].th
                  : typeLabels[template.type as keyof typeof typeLabels].en}
              </Badge>
            </TableCell>

            <TableCell>
              {locale === 'th'
                ? patternLabels[template.recurrencePattern].th
                : patternLabels[template.recurrencePattern].en}
              {template.recurrenceInterval > 1 && ` (${template.recurrenceInterval})`}
            </TableCell>

            <TableCell>
              {template.nextOccurrenceAt
                ? formatRelativeTime(new Date(template.nextOccurrenceAt), locale)
                : '-'}
            </TableCell>

            <TableCell>
              <div className="flex items-center gap-2">
                <Switch
                  checked={template.isActive}
                  onCheckedChange={(checked) => onToggle(template.id, checked)}
                />
                <Badge variant={template.isActive ? 'default' : 'secondary'}>
                  {template.isActive
                    ? locale === 'th' ? 'เปิด' : 'Active'
                    : locale === 'th' ? 'ปิด' : 'Paused'}
                </Badge>
              </div>
            </TableCell>

            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onGenerateNow && (
                    <DropdownMenuItem onClick={() => onGenerateNow(template.id)}>
                      <Play className="h-4 w-4 mr-2" />
                      {locale === 'th' ? 'สร้างทันที' : 'Generate Now'}
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(template.id)}>
                      <Edit className="h-4 w-4 mr-2" />
                      {locale === 'th' ? 'แก้ไข' : 'Edit'}
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={() => onDelete(template.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {locale === 'th' ? 'ลบ' : 'Delete'}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

---

## Usage Examples

```tsx
// Example 1: Create recurring request page
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RecurringForm } from '@/components/recurring/recurring-form'
import { createRecurringTemplate } from '@/lib/recurring/service'

function NewRecurringPage({ session }) {
  const router = useRouter()

  const handleSubmit = async (data) => {
    await createRecurringTemplate({
      ...data,
      userId: parseInt(session.user.id)
    })
    router.push('/recurring')
  }

  return (
    <RecurringForm
      warehouses={warehouses}
      items={items}
      onSubmit={handleSubmit}
    />
  )
}

// Example 2: Recurring list page
import { RecurringList } from '@/components/recurring/recurring-list'
import { getUserRecurringTemplates, toggleRecurringTemplate, deleteRecurringTemplate, generateRequestFromTemplate } from '@/lib/recurring/service'

function RecurringPage({ session }) {
  const [templates, setTemplates] = useState([])

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    const data = await getUserRecurringTemplates(parseInt(session.user.id))
    setTemplates(data)
  }

  const handleToggle = async (id, isActive) => {
    await toggleRecurringTemplate(id, parseInt(session.user.id), isActive)
    await loadTemplates()
  }

  const handleGenerateNow = async (id) => {
    const result = await generateRequestFromTemplate(id)
    toast.success(`Created request ${result.requestCode}`)
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this template?')) {
      await deleteRecurringTemplate(id, parseInt(session.user.id))
      await loadTemplates()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1>Recurring Requests</h1>
        <Button asChild>
          <Link href="/recurring/new">New Template</Link>
        </Button>
      </div>

      <RecurringList
        templates={templates}
        onToggle={handleToggle}
        onDelete={handleDelete}
        onGenerateNow={handleGenerateNow}
      />
    </div>
  )
}

// Example 3: Cron job to process recurring requests
// Add to cron-scheduler
async function processRecurringRequests() {
  const result = await processDueRecurringRequests()

  console.log(`Processed ${result.processed} templates`)
  console.log(`Generated ${result.generated.length} requests`)

  if (result.errors.length > 0) {
    console.error('Errors:', result.errors)
  }
}
```

---

## Prisma Schema Addition

```prisma
// Add to prisma/schema.prisma

model RecurringRequestTemplate {
  id                  Int       @id @default(autoincrement())
  name                String
  description         String?
  userId              Int
  type                String    // BORROW, WITHDRAW
  warehouseId         Int
  recurrencePattern   String    // DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY
  recurrenceInterval  Int       @default(1)
  recurrenceDays      String?   // JSON array of days
  startDate           DateTime
  endDate             DateTime?
  maxOccurrences      Int?
  currentOccurrences  Int       @default(0)
  lastOccurrenceAt    DateTime?
  nextOccurrenceAt    DateTime?
  isActive            Boolean   @default(true)
  items               String    // JSON array of items
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  user                User      @relation(fields: [userId], references: [id])
  warehouse           Warehouse @relation(fields: [warehouseId], references: [id])

  @@index([userId])
  @@index([isActive, nextOccurrenceAt])
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
