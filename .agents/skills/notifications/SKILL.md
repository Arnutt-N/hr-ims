---
name: Notifications System
description: Email, Telegram, and In-app notifications for HR-IMS
---

# ระบบแจ้งเตือน

This skill covers the multi-channel notification system in HR-IMS: Email (Nodemailer), Telegram, and In-app notifications.

## ภาพรวม

HR-IMS supports **three notification channels**:
1. **อีเมล** - Nodemailer พร้อมเทมเพลต HTML
2. **Telegram** - Bot API สำหรับการแจ้งเตือนผู้ดูแล
3. **ในแอป** - การแจ้งเตือนผ่านฐานข้อมูล

## การตั้งค่า

### ตัวแปรสภาพแวดล้อม

**Backend `.env`:**
```env
# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=HR-IMS <noreply@hr-ims.com>

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_ADMIN_CHAT_ID=your-group-chat-id
```

### Get Telegram Credentials

1. **Create Bot**: Message `@BotFather` on Telegram → `/newbot`
2. **Get Token**: Copy bot token
3. **Get Chat ID**:
   - Add bot to group
   - Visit: `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Find `chat.id` in response

### การแจ้งเตือนทางอีเมล

### ไฟล์ Service: `backend/src/services/notificationService.ts`

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendEmail = async (
    to: string,
    subject: string,
    html: string
): Promise<boolean> => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('[Email] SMTP not configured');
        return false;
    }
    
    try {
        await transporter.sendMail({
            from: `"HR-IMS System" <${process.env.SMTP_FROM}>`,
            to,
            subject,
            html,
        });
        console.log('[Email] Sent to:', to);
        return true;
    } catch (error) {
        console.error('[Email] Failed:', error);
        return false;
    }
};
```

### เทมเพลตอีเมล

```typescript
export const emailTemplates = {
    requestCreated: (data: {
        userName: string;
        requestId: number;
        requestType: string;
        items: string;
        date: string;
    }) => {
        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background: #f4f7fa; }
        .container { max-width: 600px; margin: 40px auto; background: #fff; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; }
        .content { padding: 30px; }
        .info-box { background: #f8fafc; padding: 16px; margin: 20px 0; }
        .status-badge { padding: 6px 16px; border-radius: 20px; background: #fef3c7; color: #d97706; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📦 คำขอใหม่ถูกสร้างแล้ว</h1>
        </div>
        <div class="content">
            <p>สวัสดีคุณ <strong>${data.userName}</strong>,</p>
            <p>คำขอของคุณได้ถูกบันทึกเข้าสู่ระบบเรียบร้อยแล้ว</p>
            
            <div class="info-box">
                <p><strong>หมายเลขคำขอ:</strong> #${data.requestId}</p>
                <p><strong>ประเภท:</strong> ${data.requestType}</p>
                <p><strong>รายการ:</strong> ${data.items}</p>
                <p><strong>วันที่:</strong> ${data.date}</p>
                <p><span class="status-badge">รอดำเนินการ</span></p>
            </div>
            
            <p>กรุณารอการอนุมัติจากผู้ดูแลระบบ</p>
        </div>
    </div>
</body>
</html>
        `;
    },
    
    lowStockAlert: (data: {
        itemName: string;
        itemId: number;
        warehouseName: string;
        currentStock: number;
        minStock: number;
    }) => {
        return `
<!DOCTYPE html>
<html>
<body>
    <h2>⚠️ แจ้งเตือนสินค้าใกล้หมด</h2>
    <p>สินค้า <strong>${data.itemName}</strong> (#${data.itemId})</p>
    <p>คลัง: ${data.warehouseName}</p>
    <p>จำนวนคงเหลือ: <strong style="color: red;">${data.currentStock}</strong></p>
    <p>จำนวนขั้นต่ำ: ${data.minStock}</p>
    <p>กรุณาดำเนินการสั่งซื้อเพิ่มเติม</p>
</body>
</html>
        `;
    },
};
```

### Usage in Controller

```typescript
import { sendEmail, emailTemplates } from '../services/notificationService';

export const createRequest = async (req: Request, res: Response) => {
    // Create request...
    const request = await prisma.request.create({ data });
    
    // Send email notification
    if (user.email) {
        const emailHtml = emailTemplates.requestCreated({
            userName: user.name || user.email,
            requestId: request.id,
            requestType: request.type,
            items: '...',
            date: new Date().toLocaleDateString('th-TH'),
        });
        
        await sendEmail(
            user.email,
            'คำขอใหม่ถูกสร้างแล้ว - HR-IMS',
            emailHtml
        );
    }
    
    res.json(request);
};
```

### การแจ้งเตือนผ่าน Telegram

### Setup Telegram Bot

```typescript
import TelegramBot from 'node-telegram-bot-api';

let telegramBot: TelegramBot | null = null;
if (process.env.TELEGRAM_BOT_TOKEN) {
    telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
        polling: false  // Send-only mode
    });
}

export const sendTelegramAlert = async (message: string): Promise<boolean> => {
    if (!telegramBot || !process.env.TELEGRAM_ADMIN_CHAT_ID) {
        console.log('[Telegram] Not configured');
        return false;
    }
    
    try {
        await telegramBot.sendMessage(
            process.env.TELEGRAM_ADMIN_CHAT_ID,
            message,
            { parse_mode: 'HTML' }
        );
        console.log('[Telegram] Alert sent');
        return true;
    } catch (error) {
        console.error('[Telegram] Failed:', error);
        return false;
    }
};
```

### เทมเพลต Telegram

```typescript
export const telegramTemplates = {
    newRequest: (data: {
        requestId: number;
        userName: string;
        department: string;
        requestType: string;
        items: string;
    }) => `
🆕 <b>คำขอใหม่เข้าสู่ระบบ</b>

📋 <b>หมายเลข:</b> #${data.requestId}
👤 <b>ผู้ขอ:</b> ${data.userName}
🏢 <b>แผนก:</b> ${data.department || 'ไม่ระบุ'}
📦 <b>ประเภท:</b> ${data.requestType}
📝 <b>รายการ:</b> ${data.items}

⏳ รอการอนุมัติ
    `,
    
    lowStock: (data: {
        itemName: string;
        itemId: number;
        warehouseName: string;
        currentStock: number;
        minStock: number;
    }) => `
⚠️ <b>แจ้งเตือนสินค้าใกล้หมด!</b>

📦 <b>สินค้า:</b> ${data.itemName} (#${data.itemId})
🏭 <b>คลัง:</b> ${data.warehouseName}
📊 <b>คงเหลือ:</b> ${data.currentStock} ชิ้น
📉 <b>ขั้นต่ำ:</b> ${data.minStock} ชิ้น

🔴 กรุณาดำเนินการสั่งซื้อเพิ่ม
    `,
};
```

### Usage

```typescript
import { sendTelegramAlert, telegramTemplates } from '../services/notificationService';

// Send new request alert
await sendTelegramAlert(telegramTemplates.newRequest({
    requestId: request.id,
    userName: user.name,
    department: user.department,
    requestType: request.type,
    items: 'Laptop x2'
}));
```

## การแจ้งเตือนในแอป

### สคีมาฐานข้อมูล

```prisma
model Notification {
  id        Int      @id @default(autoincrement())
  userId    Int?     // Optional: if null, global notification
  user      User?    @relation(fields: [userId], references: [id])
  text      String
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

### การสร้างการแจ้งเตือน

```typescript
// User-specific notification
await prisma.notification.create({
    data: {
        userId: user.id,
        text: `คำขอ #${requestId} ของคุณได้รับการอนุมัติแล้ว`,
        read: false,
    },
});

// Global notification (all admins)
await prisma.notification.create({
    data: {
        userId: null,
        text: `⚠️ สินค้า "${itemName}" เหลือ ${stock} ชิ้น`,
        read: false,
    },
});
```

### ฝั่ง Frontend - ดึงการแจ้งเตือน

**Server Action:**
```typescript
'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function getNotifications() {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };
    
    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    
    const notifications = await prisma.notification.findMany({
        where: {
            OR: [
                { userId: user.id },        // User-specific
                { userId: null },           // Global
            ],
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
    });
    
    return { notifications };
}

export async function markNotificationRead(notificationId: number) {
    await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
    });
}
```

**Component:**
```tsx
'use client';

import { useState, useEffect } from 'react';
import { getNotifications, markNotificationRead } from '@/lib/actions/notifications';

export default function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    
    useEffect(() => {
        fetchNotifications();
    }, []);
    
    const fetchNotifications = async () => {
        const result = await getNotifications();
        if (result.notifications) {
            setNotifications(result.notifications);
            setUnreadCount(
                result.notifications.filter(n => !n.read).length
            );
        }
    };
    
    const handleMarkRead = async (id: number) => {
        await markNotificationRead(id);
        fetchNotifications();
    };
    
    return (
        <div>
            <button>🔔 {unreadCount > 0 && <span>{unreadCount}</span>}</button>
            <ul>
                {notifications.map(notif => (
                    <li 
                        key={notif.id}
                        onClick={() => handleMarkRead(notif.id)}
                        style={{ fontWeight: notif.read ? 'normal' : 'bold' }}
                    >
                        {notif.text}
                    </li>
                ))}
            </ul>
        </div>
    );
}
```

## การแจ้งเตือนสินค้าคงเหลือน้อย

### Automatic Check Function

```typescript
export const checkAndAlertLowStock = async (
    itemId: number,
    warehouseId: number,
    prisma: any
): Promise<void> => {
    const stockLevel = await prisma.stockLevel.findUnique({
        where: {
            warehouseId_itemId: { warehouseId, itemId },
        },
        include: { item: true, warehouse: true },
    });
    
    if (!stockLevel || !stockLevel.minStock) return;
    
    // Check if below minimum
    if (stockLevel.quantity <= stockLevel.minStock) {
        const alertData = {
            itemName: stockLevel.item.name,
            itemId: stockLevel.item.id,
            warehouseName: stockLevel.warehouse.name,
            currentStock: stockLevel.quantity,
            minStock: stockLevel.minStock,
        };
        
        // Send Telegram alert
        await sendTelegramAlert(telegramTemplates.lowStock(alertData));
        
        // Create in-app notification
        await prisma.notification.create({
            data: {
                text: `⚠️ สินค้า "${alertData.itemName}" ในคลัง "${alertData.warehouseName}" เหลือ ${alertData.currentStock} ชิ้น`,
                userId: null, // Global for admins
            },
        });
    }
};
```

### Usage After Stock Change

```typescript
// After updating stock level
await prisma.stockLevel.update({
    where: { id: stockLevelId },
    data: { quantity: { decrement: amount } },
});

// Check if low stock
await checkAndAlertLowStock(itemId, warehouseId, prisma);
```

## แนวปฏิบัติที่ดีที่สุด

1. ✅ Use HTML templates for professional emails
2. ✅ Use Telegram for urgent admin alerts
3. ✅ Use in-app notifications for user updates
4. ✅ Check environment variables before sending
5. ✅ Log all notification attempts
6. ✅ Handle errors gracefully (don't block operations)
7. ✅ Batch notifications when possible
8. ❌ Don't expose email credentials in code
9. ❌ Don't send too many notifications (spam)
10. ❌ Don't make notifications blocking (use async)

## อ้างอิงอย่างรวดเร็ว

| Channel | Use Case | Configuration |
|---------|----------|---------------|
| Email | User notifications, status updates | SMTP credentials |
| Telegram | Admin alerts, low stock warnings | Bot token + Chat ID |
| In-app | Real-time user notifications | Database only |

| Event | Email | Telegram | In-app |
|-------|-------|----------|--------|
| Request created | ✅ User | ✅ Admin | ✅ User |
| Request approved | ✅ User | ❌ | ✅ User |
| Low stock | ❌ | ✅ Admin | ✅ Admin |
| System error | ❌ | ✅ Admin | ❌ |
