---
name: bulk-email
description: Bulk email and mass notification system for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["bulk email", "mass email", "newsletter", "broadcast", "email campaign"]
  file_patterns: ["*email*", "*bulk-email*", "*newsletter*"]
  context: bulk emails, mass notifications, email campaigns, broadcast messages
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# Bulk Email System

## Core Role

Implement bulk email and mass notification system for HR-IMS:
- Email campaign management
- Recipient selection and filtering
- Email templates with variables
- Delivery tracking and analytics

---

## Email Campaign Service

```typescript
// lib/email/campaign-service.ts
import prisma from '@/lib/prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailCampaign {
  id: number
  name: string
  subject: string
  content: string
  htmlContent?: string
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED'
  recipientType: 'ALL' | 'ROLE' | 'DEPARTMENT' | 'CUSTOM'
  recipientFilter?: Record<string, any>
  scheduledAt?: Date
  sentAt?: Date
  totalRecipients: number
  sentCount: number
  openedCount: number
  clickedCount: number
  createdAt: Date
}

export interface EmailRecipient {
  id: number
  campaignId: number
  userId: number
  email: string
  name: string
  status: 'PENDING' | 'SENT' | 'FAILED' | 'BOUNCED'
  sentAt?: Date
  openedAt?: Date
  clickedAt?: Date
  error?: string
}

// Create campaign
export async function createCampaign(data: {
  name: string
  subject: string
  content: string
  htmlContent?: string
  recipientType: EmailCampaign['recipientType']
  recipientFilter?: Record<string, any>
  scheduledAt?: Date
}): Promise<EmailCampaign> {
  // Calculate total recipients
  const totalRecipients = await getRecipientCount(
    data.recipientType,
    data.recipientFilter
  )

  const campaign = await prisma.emailCampaign.create({
    data: {
      name: data.name,
      subject: data.subject,
      content: data.content,
      htmlContent: data.htmlContent,
      status: data.scheduledAt ? 'SCHEDULED' : 'DRAFT',
      recipientType: data.recipientType,
      recipientFilter: data.recipientFilter ? JSON.stringify(data.recipientFilter) : null,
      scheduledAt: data.scheduledAt,
      totalRecipients
    }
  })

  return campaign as EmailCampaign
}

// Get recipient count based on filter
async function getRecipientCount(
  recipientType: EmailCampaign['recipientType'],
  recipientFilter?: Record<string, any>
): Promise<number> {
  switch (recipientType) {
    case 'ALL':
      return prisma.user.count({ where: { status: 'ACTIVE' } })

    case 'ROLE':
      return prisma.user.count({
        where: {
          status: 'ACTIVE',
          userRoles: {
            some: {
              role: { slug: { in: recipientFilter?.roles || [] } }
            }
          }
        }
      })

    case 'DEPARTMENT':
      return prisma.user.count({
        where: {
          status: 'ACTIVE',
          department: { slug: { in: recipientFilter?.departments || [] } }
        }
      })

    case 'CUSTOM':
      return prisma.user.count({
        where: {
          id: { in: recipientFilter?.userIds || [] }
        }
      })

    default:
      return 0
  }
}

// Get recipients for campaign
async function getRecipients(
  recipientType: EmailCampaign['recipientType'],
  recipientFilter?: Record<string, any>
): Promise<Array<{ id: number; email: string; name: string }>> {
  let where: any = { status: 'ACTIVE' }

  switch (recipientType) {
    case 'ROLE':
      where.userRoles = {
        some: {
          role: { slug: { in: recipientFilter?.roles || [] } }
        }
      }
      break

    case 'DEPARTMENT':
      where.department = { slug: { in: recipientFilter?.departments || [] } }
      break

    case 'CUSTOM':
      where.id = { in: recipientFilter?.userIds || [] }
      break
  }

  return prisma.user.findMany({
    where,
    select: { id: true, email: true, name: true }
  })
}

// Send campaign
export async function sendCampaign(campaignId: number): Promise<void> {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId }
  })

  if (!campaign) throw new Error('Campaign not found')

  // Update status
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: { status: 'SENDING' }
  })

  try {
    const recipients = await getRecipients(
      campaign.recipientType as any,
      campaign.recipientFilter ? JSON.parse(campaign.recipientFilter as string) : null
    )

    // Create recipient records
    await prisma.emailRecipient.createMany({
      data: recipients.map(r => ({
        campaignId,
        userId: r.id,
        email: r.email,
        name: r.name,
        status: 'PENDING'
      })),
      skipDuplicates: true
    })

    // Send emails in batches
    const batchSize = 50
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)

      await Promise.all(
        batch.map(async (recipient) => {
          try {
            // Replace variables in content
            const personalizedContent = personalizeContent(
              campaign.htmlContent || campaign.content,
              { name: recipient.name, email: recipient.email }
            )

            await resend.emails.send({
              from: process.env.SMTP_FROM || 'noreply@hr-ims.com',
              to: recipient.email,
              subject: campaign.subject,
              html: personalizedContent,
              tags: [{ name: 'campaign_id', value: String(campaignId) }]
            })

            // Update recipient status
            await prisma.emailRecipient.updateMany({
              where: { campaignId, userId: recipient.id },
              data: { status: 'SENT', sentAt: new Date() }
            })

            // Increment sent count
            await prisma.emailCampaign.update({
              where: { id: campaignId },
              data: { sentCount: { increment: 1 } }
            })
          } catch (error: any) {
            // Mark as failed
            await prisma.emailRecipient.updateMany({
              where: { campaignId, userId: recipient.id },
              data: { status: 'FAILED', error: error.message }
            })
          }
        })
      )

      // Rate limiting delay
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Mark campaign as sent
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'SENT', sentAt: new Date() }
    })
  } catch (error) {
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'FAILED' }
    })
    throw error
  }
}

// Personalize content with variables
function personalizeContent(
  content: string,
  variables: Record<string, string>
): string {
  let result = content

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    result = result.replace(regex, value)
  })

  return result
}

// Track email open
export async function trackOpen(campaignId: number, userId: number): Promise<void> {
  await prisma.emailRecipient.updateMany({
    where: { campaignId, userId },
    data: { openedAt: new Date() }
  })

  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: { openedCount: { increment: 1 } }
  })
}

// Track email click
export async function trackClick(campaignId: number, userId: number): Promise<void> {
  await prisma.emailRecipient.updateMany({
    where: { campaignId, userId },
    data: { clickedAt: new Date() }
  })

  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: { clickedCount: { increment: 1 } }
  })
}

// Get campaign statistics
export async function getCampaignStats(campaignId: number) {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    include: {
      _count: {
        select: {
          recipients: {
            where: { status: 'SENT' }
          }
        }
      }
    }
  })

  if (!campaign) return null

  const openRate = campaign.sentCount > 0
    ? (campaign.openedCount / campaign.sentCount) * 100
    : 0

  const clickRate = campaign.sentCount > 0
    ? (campaign.clickedCount / campaign.sentCount) * 100
    : 0

  const bounceRate = campaign.totalRecipients > 0
    ? ((campaign.totalRecipients - campaign.sentCount) / campaign.totalRecipients) * 100
    : 0

  return {
    ...campaign,
    openRate: openRate.toFixed(2),
    clickRate: clickRate.toFixed(2),
    bounceRate: bounceRate.toFixed(2)
  }
}
```

---

## Campaign List Component

```typescript
// components/email/campaign-list.tsx
'use client'

import { useI18n } from '@/hooks/use-i18n'
import { EmailCampaign } from '@/lib/email/campaign-service'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Send,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  BarChart3
} from 'lucide-react'

interface CampaignListProps {
  campaigns: EmailCampaign[]
  onSend?: (id: number) => void
  onEdit?: (id: number) => void
  onDelete?: (id: number) => void
  onDuplicate?: (id: number) => void
  onViewStats?: (id: number) => void
}

export function CampaignList({
  campaigns,
  onSend,
  onEdit,
  onDelete,
  onDuplicate,
  onViewStats
}: CampaignListProps) {
  const { locale } = useI18n()

  const getStatusBadge = (status: EmailCampaign['status']) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      DRAFT: 'secondary',
      SCHEDULED: 'outline',
      SENDING: 'default',
      SENT: 'default',
      FAILED: 'destructive'
    }

    const labels: Record<string, { en: string; th: string }> = {
      DRAFT: { en: 'Draft', th: 'ร่าง' },
      SCHEDULED: { en: 'Scheduled', th: 'ตั้งเวลาแล้ว' },
      SENDING: { en: 'Sending', th: 'กำลังส่ง' },
      SENT: { en: 'Sent', th: 'ส่งแล้ว' },
      FAILED: { en: 'Failed', th: 'ล้มเหลว' }
    }

    const label = labels[status] || { en: status, th: status }

    return (
      <Badge variant={variants[status] || 'default'}>
        {locale === 'th' ? label.th : label.en}
      </Badge>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{locale === 'th' ? 'ชื่อแคมเปญ' : 'Campaign Name'}</TableHead>
          <TableHead>{locale === 'th' ? 'หัวข้อ' : 'Subject'}</TableHead>
          <TableHead>{locale === 'th' ? 'สถานะ' : 'Status'}</TableHead>
          <TableHead>{locale === 'th' ? 'ผู้รับ' : 'Recipients'}</TableHead>
          <TableHead>{locale === 'th' ? 'ส่งแล้ว' : 'Sent'}</TableHead>
          <TableHead>{locale === 'th' ? 'เปิดอ่าน' : 'Opened'}</TableHead>
          <TableHead>{locale === 'th' ? 'วันที่' : 'Date'}</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {campaigns.map((campaign) => (
          <TableRow key={campaign.id}>
            <TableCell className="font-medium">{campaign.name}</TableCell>
            <TableCell>{campaign.subject}</TableCell>
            <TableCell>{getStatusBadge(campaign.status)}</TableCell>
            <TableCell>{campaign.totalRecipients}</TableCell>
            <TableCell>{campaign.sentCount}</TableCell>
            <TableCell>
              {campaign.openedCount}
              {campaign.sentCount > 0 && (
                <span className="text-xs text-muted-foreground ml-1">
                  ({((campaign.openedCount / campaign.sentCount) * 100).toFixed(0)}%)
                </span>
              )}
            </TableCell>
            <TableCell>
              {formatRelativeTime(campaign.createdAt, locale)}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {campaign.status === 'DRAFT' && onSend && (
                    <DropdownMenuItem onClick={() => onSend(campaign.id)}>
                      <Send className="h-4 w-4 mr-2" />
                      {locale === 'th' ? 'ส่งทันที' : 'Send Now'}
                    </DropdownMenuItem>
                  )}
                  {campaign.status === 'DRAFT' && onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(campaign.id)}>
                      <Edit className="h-4 w-4 mr-2" />
                      {locale === 'th' ? 'แก้ไข' : 'Edit'}
                    </DropdownMenuItem>
                  )}
                  {onViewStats && (
                    <DropdownMenuItem onClick={() => onViewStats(campaign.id)}>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      {locale === 'th' ? 'สถิติ' : 'Statistics'}
                    </DropdownMenuItem>
                  )}
                  {onDuplicate && (
                    <DropdownMenuItem onClick={() => onDuplicate(campaign.id)}>
                      <Copy className="h-4 w-4 mr-2" />
                      {locale === 'th' ? 'คัดลอก' : 'Duplicate'}
                    </DropdownMenuItem>
                  )}
                  {onDelete && campaign.status !== 'SENDING' && (
                    <DropdownMenuItem
                      onClick={() => onDelete(campaign.id)}
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

## Campaign Editor Component

```typescript
// components/email/campaign-editor.tsx
'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
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
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Save, Send, Eye, Clock } from 'lucide-react'

interface CampaignEditorProps {
  initialData?: {
    name: string
    subject: string
    content: string
    htmlContent?: string
    recipientType: string
  }
  onSave: (data: any) => void
  onSend?: (data: any) => void
  onSchedule?: (data: any, date: Date) => void
  onPreview?: (data: any) => void
}

export function CampaignEditor({
  initialData,
  onSave,
  onSend,
  onSchedule,
  onPreview
}: CampaignEditorProps) {
  const { locale } = useI18n()
  const [name, setName] = useState(initialData?.name || '')
  const [subject, setSubject] = useState(initialData?.subject || '')
  const [content, setContent] = useState(initialData?.content || '')
  const [htmlContent, setHtmlContent] = useState(initialData?.htmlContent || '')
  const [recipientType, setRecipientType] = useState(initialData?.recipientType || 'ALL')

  const availableVariables = [
    { key: 'name', label: locale === 'th' ? 'ชื่อผู้รับ' : 'Recipient Name' },
    { key: 'email', label: locale === 'th' ? 'อีเมล' : 'Email' }
  ]

  const handleSave = () => {
    onSave({
      name,
      subject,
      content,
      htmlContent,
      recipientType
    })
  }

  const handleSend = () => {
    if (onSend) {
      onSend({
        name,
        subject,
        content,
        htmlContent,
        recipientType
      })
    }
  }

  const insertVariable = (variable: string) => {
    const template = `{{${variable}}}`
    setContent(prev => prev + template)
    setHtmlContent(prev => prev + template)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {initialData
            ? locale === 'th' ? 'แก้ไขแคมเปญ' : 'Edit Campaign'
            : locale === 'th' ? 'สร้างแคมเปญใหม่' : 'Create Campaign'}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Campaign Name */}
        <div className="space-y-2">
          <Label>{locale === 'th' ? 'ชื่อแคมเปญ' : 'Campaign Name'}</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={locale === 'th' ? 'ตั้งชื่อแคมเปญ' : 'Enter campaign name'}
          />
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <Label>{locale === 'th' ? 'หัวข้ออีเมล' : 'Email Subject'}</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={locale === 'th' ? 'หัวข้ออีเมล' : 'Email subject'}
          />
        </div>

        {/* Recipient Type */}
        <div className="space-y-2">
          <Label>{locale === 'th' ? 'กลุ่มผู้รับ' : 'Recipient Group'}</Label>
          <Select value={recipientType} onValueChange={setRecipientType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">
                {locale === 'th' ? 'ผู้ใช้ทั้งหมด' : 'All Users'}
              </SelectItem>
              <SelectItem value="ROLE">
                {locale === 'th' ? 'ตามบทบาท' : 'By Role'}
              </SelectItem>
              <SelectItem value="DEPARTMENT">
                {locale === 'th' ? 'ตามแผนก' : 'By Department'}
              </SelectItem>
              <SelectItem value="CUSTOM">
                {locale === 'th' ? 'กำหนดเอง' : 'Custom Selection'}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Available Variables */}
        <div className="space-y-2">
          <Label>{locale === 'th' ? 'ตัวแปรที่ใช้ได้' : 'Available Variables'}</Label>
          <div className="flex flex-wrap gap-2">
            {availableVariables.map((v) => (
              <Badge
                key={v.key}
                variant="outline"
                className="cursor-pointer hover:bg-muted"
                onClick={() => insertVariable(v.key)}
              >
                {`{{${v.key}}}`} - {v.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="plain">
          <TabsList>
            <TabsTrigger value="plain">
              {locale === 'th' ? 'ข้อความธรรมดา' : 'Plain Text'}
            </TabsTrigger>
            <TabsTrigger value="html">HTML</TabsTrigger>
          </TabsList>

          <TabsContent value="plain" className="mt-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={locale === 'th' ? 'เนื้อหาอีเมล' : 'Email content'}
              rows={10}
            />
          </TabsContent>

          <TabsContent value="html" className="mt-2">
            <Textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="<html>...</html>"
              rows={10}
              className="font-mono text-sm"
            />
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            {locale === 'th' ? 'บันทึกฉบับร่าง' : 'Save Draft'}
          </Button>

          {onPreview && (
            <Button
              variant="outline"
              onClick={() => onPreview({ name, subject, content, htmlContent, recipientType })}
            >
              <Eye className="h-4 w-4 mr-2" />
              {locale === 'th' ? 'ดูตัวอย่าง' : 'Preview'}
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {onSchedule && (
            <Button variant="outline">
              <Clock className="h-4 w-4 mr-2" />
              {locale === 'th' ? 'ตั้งเวลา' : 'Schedule'}
            </Button>
          )}

          {onSend && (
            <Button onClick={handleSend}>
              <Send className="h-4 w-4 mr-2" />
              {locale === 'th' ? 'ส่งทันที' : 'Send Now'}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
```

---

## Usage Examples

```tsx
// Example 1: Campaign management page
'use client'

import { useState, useEffect } from 'react'
import { CampaignList } from '@/components/email/campaign-list'
import { CampaignEditor } from '@/components/email/campaign-editor'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { createCampaign, sendCampaign, getCampaigns } from '@/lib/email/campaign-service'

function EmailCampaignPage() {
  const { locale } = useI18n()
  const [campaigns, setCampaigns] = useState([])
  const [showEditor, setShowEditor] = useState(false)

  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    const data = await getCampaigns()
    setCampaigns(data)
  }

  const handleSave = async (data: any) => {
    await createCampaign(data)
    setShowEditor(false)
    await loadCampaigns()
  }

  const handleSend = async (campaignId: number) => {
    if (confirm(locale === 'th' ? 'ยืนยันส่งอีเมล?' : 'Confirm send?')) {
      await sendCampaign(campaignId)
      await loadCampaigns()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1>{locale === 'th' ? 'จัดการแคมเปญอีเมล' : 'Email Campaigns'}</h1>
        <Button onClick={() => setShowEditor(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {locale === 'th' ? 'สร้างแคมเปญ' : 'New Campaign'}
        </Button>
      </div>

      {showEditor ? (
        <CampaignEditor
          onSave={handleSave}
          onSend={handleSend}
        />
      ) : (
        <CampaignList
          campaigns={campaigns}
          onSend={handleSend}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

// Example 2: Quick broadcast to selected users
import { sendBulkEmail } from '@/lib/email/bulk-sender'

async function notifySelectedUsers(userIds: number[], message: string) {
  const users = await prisma.user.findMany({
    where: { id: { in: userIdIds } },
    select: { email: true, name: true }
  })

  await sendBulkEmail({
    to: users.map(u => ({ email: u.email, name: u.name })),
    subject: 'Notification',
    content: message
  })
}
```

---

## Prisma Schema Addition

```prisma
// Add to prisma/schema.prisma

model EmailCampaign {
  id              Int       @id @default(autoincrement())
  name            String
  subject         String
  content         String
  htmlContent     String?
  status          String    @default("DRAFT") // DRAFT, SCHEDULED, SENDING, SENT, FAILED
  recipientType   String    // ALL, ROLE, DEPARTMENT, CUSTOM
  recipientFilter String?   // JSON
  scheduledAt     DateTime?
  sentAt          DateTime?
  totalRecipients Int       @default(0)
  sentCount       Int       @default(0)
  openedCount     Int       @default(0)
  clickedCount    Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  recipients      EmailRecipient[]

  @@index([status])
  @@index([scheduledAt])
}

model EmailRecipient {
  id          Int       @id @default(autoincrement())
  campaignId  Int
  userId      Int
  email       String
  name        String
  status      String    @default("PENDING") // PENDING, SENT, FAILED, BOUNCED
  sentAt      DateTime?
  openedAt    DateTime?
  clickedAt   DateTime?
  error       String?

  campaign    EmailCampaign @relation(fields: [campaignId], references: [id])

  @@unique([campaignId, userId])
  @@index([campaignId])
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
