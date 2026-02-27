---
name: email-helper
description: Email sending and template management for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["email", "send email", "mail", "smtp", "nodemailer", "email template"]
  file_patterns: ["*email*", "lib/email*", "lib/mail*"]
  context: Email sending, notifications, templates
mcp_servers:
  - sequential
personas:
  - backend
---

# Email Helper

## Core Role

Handle email communication for HR-IMS:
- Email sending via SMTP
- Template management
- Notification emails
- Bulk email support

---

## Install Dependencies

```bash
npm install nodemailer
npm install @types/nodemailer -D
npm install @react-email/components @react-email/render
```

---

## Email Client Setup

```typescript
// lib/email/client.ts
import nodemailer from 'nodemailer'

interface EmailConfig {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
}

const getConfig = (): EmailConfig => ({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.SMTP_FROM || 'HR-IMS <noreply@hr-ims.com>'
})

export function createTransporter() {
  const config = getConfig()

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  })
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
  cc?: string | string[]
  bcc?: string | string[]
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const transporter = createTransporter()
  const config = getConfig()

  try {
    await transporter.sendMail({
      from: config.from,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      cc: options.cc
        ? Array.isArray(options.cc)
          ? options.cc.join(', ')
          : options.cc
        : undefined,
      bcc: options.bcc
        ? Array.isArray(options.bcc)
          ? options.bcc.join(', ')
          : options.bcc
        : undefined,
      attachments: options.attachments
    })

    return true
  } catch (error) {
    console.error('Email sending failed:', error)
    return false
  }
}
```

---

## Email Templates

```typescript
// lib/email/templates/base.ts

interface EmailTemplateData {
  title: string
  preheader?: string
  content: string
  buttonText?: string
  buttonUrl?: string
  footer?: string
}

export function renderEmailTemplate(data: EmailTemplateData): string {
  const year = new Date().getFullYear()

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>
    body {
      font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 30px;
    }
    .preheader {
      color: #666;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 30px;
      border-radius: 6px;
      text-decoration: none;
      margin-top: 20px;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>🏛️ HR-IMS</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">
          ระบบบริหารจัดการทรัพยากรบุคคลและคลังวัสดุ
        </p>
      </div>

      <div class="content">
        ${data.preheader ? `<p class="preheader">${data.preheader}</p>` : ''}
        ${data.content}

        ${data.buttonText && data.buttonUrl ? `
          <div style="text-align: center; margin-top: 30px;">
            <a href="${data.buttonUrl}" class="button">${data.buttonText}</a>
          </div>
        ` : ''}
      </div>

      <div class="footer">
        <p>© ${year} HR-IMS - Human Resource & Inventory Management System</p>
        <p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}">เว็บไซต์</a> |
          <a href="mailto:${process.env.SMTP_USER}">ติดต่อเรา</a>
        </p>
        ${data.footer || ''}
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}
```

---

## Notification Emails

```typescript
// lib/email/templates/notifications.ts
import { renderEmailTemplate } from './base'

// Request approval notification
export function renderRequestApprovedEmail(data: {
  requesterName: string
  requestType: string
  requestId: number
  items: Array<{ name: string; quantity: number }>
  approvedBy: string
  approvedAt: Date
  notes?: string
}): string {
  const typeLabels: Record<string, string> = {
    BORROW: 'ยืม',
    WITHDRAW: 'เบิก',
    RETURN: 'คืน'
  }

  return renderEmailTemplate({
    title: 'คำขอได้รับการอนุมัติ / Request Approved',
    preheader: `คำขอ${typeLabels[data.requestType] || data.requestType} #${data.requestId} ได้รับการอนุมัติแล้ว`,
    content: `
      <p>เรียน <strong>${data.requesterName}</strong>,</p>

      <p>คำขอ${typeLabels[data.requestType] || data.requestType}ของคุณได้รับการอนุมัติแล้ว</p>

      <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>รายละเอียดคำขอ:</strong></p>
        <p style="margin: 0;">หมายเลขคำขอ: <strong>#${data.requestId}</strong></p>
        <p style="margin: 0;">ประเภท: <strong>${typeLabels[data.requestType] || data.requestType}</strong></p>
        <p style="margin: 0;">อนุมัติโดย: <strong>${data.approvedBy}</strong></p>
        <p style="margin: 0;">วันที่อนุมัติ: <strong>${data.approvedAt.toLocaleDateString('th-TH')}</strong></p>
      </div>

      <p><strong>รายการที่อนุมัติ:</strong></p>
      <ul style="margin: 10px 0;">
        ${data.items.map(item => `
          <li>${item.name} × ${item.quantity}</li>
        `).join('')}
      </ul>

      ${data.notes ? `
        <p><strong>หมายเหตุ:</strong> ${data.notes}</p>
      ` : ''}

      <p>กรุณาติดต่อเจ้าหน้าที่คลังเพื่อรับของ</p>
    `,
    buttonText: 'ดูรายละเอียดคำขอ / View Request',
    buttonUrl: `${process.env.NEXT_PUBLIC_APP_URL}/requests/${data.requestId}`
  })
}

// Request rejected notification
export function renderRequestRejectedEmail(data: {
  requesterName: string
  requestType: string
  requestId: number
  rejectedBy: string
  rejectedAt: Date
  reason: string
}): string {
  const typeLabels: Record<string, string> = {
    BORROW: 'ยืม',
    WITHDRAW: 'เบิก',
    RETURN: 'คืน'
  }

  return renderEmailTemplate({
    title: 'คำขอถูกปฏิเสธ / Request Rejected',
    preheader: `คำขอ${typeLabels[data.requestType] || data.requestType} #${data.requestId} ถูกปฏิเสธ`,
    content: `
      <p>เรียน <strong>${data.requesterName}</strong>,</p>

      <p>คำขอ${typeLabels[data.requestType] || data.requestType}ของคุณถูกปฏิเสธ</p>

      <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <p style="margin: 0 0 10px 0;"><strong>รายละเอียดคำขอ:</strong></p>
        <p style="margin: 0;">หมายเลขคำขอ: <strong>#${data.requestId}</strong></p>
        <p style="margin: 0;">ประเภท: <strong>${typeLabels[data.requestType] || data.requestType}</strong></p>
        <p style="margin: 0;">ปฏิเสธโดย: <strong>${data.rejectedBy}</strong></p>
        <p style="margin: 0;">วันที่: <strong>${data.rejectedAt.toLocaleDateString('th-TH')}</strong></p>
      </div>

      <div style="background: #f8d7da; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0;"><strong>เหตุผล:</strong> ${data.reason}</p>
      </div>

      <p>หากมีข้อสงสัย กรุณาติดต่อผู้อนุมัติ</p>
    `,
    buttonText: 'ดูรายละเอียดคำขอ / View Request',
    buttonUrl: `${process.env.NEXT_PUBLIC_APP_URL}/requests/${data.requestId}`
  })
}

// Low stock alert
export function renderLowStockAlertEmail(data: {
  warehouseName: string
  items: Array<{
    name: string
    code: string
    currentStock: number
    minStock: number
  }>
}): string {
  return renderEmailTemplate({
    title: 'แจ้งเตือนสินค้าใกล้หมด / Low Stock Alert',
    preheader: `พบ ${data.items.length} รายการใกล้หมดสต็อกใน${data.warehouseName}`,
    content: `
      <p>เรียน ผู้ดูแลระบบ,</p>

      <p>พบสินค้าที่มีจำนวนต่ำกว่าระดับขั้นต่ำใน${data.warehouseName}</p>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background: #667eea; color: white;">
            <th style="padding: 10px; text-align: left;">รหัส</th>
            <th style="padding: 10px; text-align: left;">ชื่อสินค้า</th>
            <th style="padding: 10px; text-align: right;">จำนวนปัจจุบัน</th>
            <th style="padding: 10px; text-align: right;">ขั้นต่ำ</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map((item, i) => `
            <tr style="background: ${i % 2 === 0 ? '#f8f9fa' : 'white'};">
              <td style="padding: 10px;">${item.code}</td>
              <td style="padding: 10px;">${item.name}</td>
              <td style="padding: 10px; text-align: right; color: #dc3545; font-weight: bold;">
                ${item.currentStock}
              </td>
              <td style="padding: 10px; text-align: right;">${item.minStock}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <p>กรุณาดำเนินการเพิ่มสต็อกสินค้าโดยเร็ว</p>
    `,
    buttonText: 'จัดการสินค้าคงคลัง / Manage Inventory',
    buttonUrl: `${process.env.NEXT_PUBLIC_APP_URL}/inventory?warehouse=${data.warehouseName}`
  })
}
```

---

## Authentication Emails

```typescript
// lib/email/templates/auth.ts
import { renderEmailTemplate } from './base'
import { randomBytes } from 'crypto'

// Welcome email for new users
export function renderWelcomeEmail(data: {
  name: string
  email: string
  temporaryPassword?: string
}): string {
  return renderEmailTemplate({
    title: 'ยินดีต้อนรับสู่ HR-IMS / Welcome to HR-IMS',
    preheader: 'บัญชีผู้ใช้ของคุณพร้อมใช้งานแล้ว',
    content: `
      <p>เรียน <strong>${data.name}</strong>,</p>

      <p>ยินดีต้อนรับสู่ระบบบริหารจัดการทรัพยากรบุคคลและคลังวัสดุ (HR-IMS)</p>

      <p>บัญชีผู้ใช้ของคุณถูกสร้างเรียบร้อยแล้ว</p>

      <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>ข้อมูลบัญชี:</strong></p>
        <p style="margin: 0;">อีเมล: <strong>${data.email}</strong></p>
        ${data.temporaryPassword ? `
          <p style="margin: 0;">รหัสผ่านชั่วคราว: <strong>${data.temporaryPassword}</strong></p>
        ` : ''}
      </div>

      <p>กรุณาเปลี่ยนรหัสผ่านหลังจากเข้าสู่ระบบครั้งแรก</p>

      <p>หากมีข้อสงสัย กรุณาติดต่อผู้ดูแลระบบ</p>
    `,
    buttonText: 'เข้าสู่ระบบ / Login',
    buttonUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`
  })
}

// Password reset email
export function renderPasswordResetEmail(data: {
  name: string
  email: string
  resetToken: string
  expiresIn: number // hours
}): string {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${data.resetToken}`

  return renderEmailTemplate({
    title: 'รีเซ็ตรหัสผ่าน / Password Reset',
    preheader: 'คำขอรีเซ็ตรหัสผ่านของคุณ',
    content: `
      <p>เรียน <strong>${data.name}</strong>,</p>

      <p>เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชี ${data.email}</p>

      <p>กรุณาคลิกปุ่มด้านล่างเพื่อรีเซ็ตรหัสผ่าน:</p>

      <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0;">⚠️ ลิงก์นี้จะหมดอายุใน <strong>${data.expiresIn} ชั่วโมง</strong></p>
      </div>

      <p>หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้</p>
    `,
    buttonText: 'รีเซ็ตรหัสผ่าน / Reset Password',
    buttonUrl: resetUrl
  })
}

// Generate reset token
export function generateResetToken(): string {
  return randomBytes(32).toString('hex')
}
```

---

## Email Service

```typescript
// lib/email/service.ts
import { sendEmail } from './client'
import {
  renderRequestApprovedEmail,
  renderRequestRejectedEmail,
  renderLowStockAlertEmail
} from './templates/notifications'
import {
  renderWelcomeEmail,
  renderPasswordResetEmail,
  generateResetToken
} from './templates/auth'
import prisma from '@/lib/prisma'

// Send request approval email
export async function sendRequestApprovedEmail(requestId: number) {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      requester: true,
      items: { include: { item: true } }
    }
  })

  if (!request || !request.requester.email) return false

  const html = renderRequestApprovedEmail({
    requesterName: request.requester.name,
    requestType: request.type,
    requestId: request.id,
    items: request.items.map(i => ({
      name: i.item.name,
      quantity: i.quantity
    })),
    approvedBy: request.approvedBy?.toString() || 'System',
    approvedAt: request.approvedAt || new Date(),
    notes: request.approvalNotes || undefined
  })

  return sendEmail({
    to: request.requester.email,
    subject: `[HR-IMS] คำขอ #${request.id} ได้รับการอนุมัติ`,
    html
  })
}

// Send request rejection email
export async function sendRequestRejectedEmail(
  requestId: number,
  reason: string
) {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { requester: true }
  })

  if (!request || !request.requester.email) return false

  const html = renderRequestRejectedEmail({
    requesterName: request.requester.name,
    requestType: request.type,
    requestId: request.id,
    rejectedBy: request.rejectedBy?.toString() || 'System',
    rejectedAt: new Date(),
    reason
  })

  return sendEmail({
    to: request.requester.email,
    subject: `[HR-IMS] คำขอ #${request.id} ถูกปฏิเสธ`,
    html
  })
}

// Send low stock alert
export async function sendLowStockAlert(warehouseId: number) {
  const warehouse = await prisma.warehouse.findUnique({
    where: { id: warehouseId }
  })

  if (!warehouse) return false

  const lowStockItems = await prisma.stockLevel.findMany({
    where: {
      warehouseId,
      quantity: { lte: prisma.stockLevel.fields.minStock }
    },
    include: { item: true }
  })

  if (lowStockItems.length === 0) return true

  const html = renderLowStockAlertEmail({
    warehouseName: warehouse.name,
    items: lowStockItems.map(sl => ({
      name: sl.item.name,
      code: sl.item.code || '-',
      currentStock: sl.quantity,
      minStock: sl.minStock || 0
    }))
  })

  // Send to all admins
  const admins = await prisma.user.findMany({
    where: {
      userRoles: {
        some: {
          role: { slug: { in: ['admin', 'superadmin'] } }
        }
      },
      email: { not: null }
    }
  })

  const emails = admins
    .map(a => a.email)
    .filter((e): e is string => !!e)

  if (emails.length === 0) return false

  return sendEmail({
    to: emails,
    subject: `[HR-IMS] แจ้งเตือนสินค้าใกล้หมด - ${warehouse.name}`,
    html
  })
}

// Send welcome email
export async function sendWelcomeEmail(
  userId: number,
  temporaryPassword?: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user || !user.email) return false

  const html = renderWelcomeEmail({
    name: user.name,
    email: user.email,
    temporaryPassword
  })

  return sendEmail({
    to: user.email,
    subject: '[HR-IMS] ยินดีต้อนรับสู่ระบบ HR-IMS',
    html
  })
}

// Send password reset email
export async function sendPasswordResetEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) return false // Don't reveal if user exists

  const resetToken = generateResetToken()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  // Store token
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      token: resetToken,
      expiresAt
    }
  })

  const html = renderPasswordResetEmail({
    name: user.name,
    email: user.email,
    resetToken,
    expiresIn: 24
  })

  return sendEmail({
    to: user.email,
    subject: '[HR-IMS] รีเซ็ตรหัสผ่าน',
    html
  })
}
```

---

## Server Actions

```typescript
// lib/actions/email.ts
'use server'

import { auth } from '@/auth'
import {
  sendRequestApprovedEmail,
  sendRequestRejectedEmail,
  sendLowStockAlert,
  sendWelcomeEmail,
  sendPasswordResetEmail
} from '@/lib/email/service'

export async function sendApprovalNotificationAction(requestId: number) {
  const session = await auth()
  if (!session) return { error: 'Unauthorized' }

  const success = await sendRequestApprovedEmail(requestId)
  return { success }
}

export async function sendRejectionNotificationAction(
  requestId: number,
  reason: string
) {
  const session = await auth()
  if (!session) return { error: 'Unauthorized' }

  const success = await sendRequestRejectedEmail(requestId, reason)
  return { success }
}

export async function sendLowStockAlertAction(warehouseId: number) {
  const session = await auth()
  if (!session) return { error: 'Unauthorized' }

  const success = await sendLowStockAlert(warehouseId)
  return { success }
}

export async function requestPasswordResetAction(email: string) {
  const success = await sendPasswordResetEmail(email)

  // Always return success to prevent email enumeration
  return { success: true }
}

export async function sendWelcomeEmailAction(userId: number) {
  const session = await auth()
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return { error: 'Unauthorized' }
  }

  const success = await sendWelcomeEmail(userId)
  return { success }
}
```

---

## Usage Examples

```typescript
// Example 1: Send approval email after approving
async function approveRequest(requestId: number) {
  await prisma.request.update({
    where: { id: requestId },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedBy: session.user.id
    }
  })

  // Send notification
  await sendRequestApprovedEmail(requestId)
}

// Example 2: Send low stock alert
async function checkStockLevels(warehouseId: number) {
  const lowStock = await prisma.stockLevel.findMany({
    where: {
      warehouseId,
      quantity: { lte: prisma.stockLevel.fields.minStock }
    }
  })

  if (lowStock.length > 0) {
    await sendLowStockAlert(warehouseId)
  }
}

// Example 3: Send welcome email on user creation
async function createUser(data: CreateUserInput) {
  const tempPassword = generateTempPassword()

  const user = await prisma.user.create({
    data: {
      ...data,
      password: await hash(tempPassword, 10)
    }
  })

  await sendWelcomeEmail(user.id, tempPassword)
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
