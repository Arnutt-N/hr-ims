import nodemailer from 'nodemailer';
import TelegramBot from 'node-telegram-bot-api';

// ==========================================
// Configuration
// ==========================================

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '';

// ==========================================
// Email Transporter
// ==========================================

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
});

// ==========================================
// Telegram Bot (Polling disabled - send only)
// ==========================================

let telegramBot: TelegramBot | null = null;
if (TELEGRAM_BOT_TOKEN) {
    telegramBot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
}

// ==========================================
// HTML Email Templates
// ==========================================

const baseTemplate = (content: string, title: string) => `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f7fa;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
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
            font-weight: 600;
        }
        .header p {
            margin: 8px 0 0;
            opacity: 0.9;
            font-size: 14px;
        }
        .content {
            padding: 30px;
        }
        .info-box {
            background: #f8fafc;
            border-left: 4px solid #667eea;
            padding: 16px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .info-label {
            color: #64748b;
            font-size: 14px;
        }
        .info-value {
            color: #1e293b;
            font-weight: 600;
            font-size: 14px;
        }
        .status-badge {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-pending {
            background: #fef3c7;
            color: #d97706;
        }
        .status-approved {
            background: #d1fae5;
            color: #059669;
        }
        .status-rejected {
            background: #fee2e2;
            color: #dc2626;
        }
        .footer {
            background: #f8fafc;
            padding: 20px;
            text-align: center;
            color: #64748b;
            font-size: 12px;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
        .alert-box {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
        }
        .alert-box.warning {
            background: #fffbeb;
            border-color: #fde68a;
        }
        .alert-title {
            color: #dc2626;
            font-weight: 600;
            margin-bottom: 8px;
        }
        .alert-box.warning .alert-title {
            color: #d97706;
        }
    </style>
</head>
<body>
    <div class="container">
        ${content}
        <div class="footer">
            <p>© ${new Date().getFullYear()} HR-IMS | Inventory Management System</p>
            <p>This is an automated message. Please do not reply directly to this email.</p>
        </div>
    </div>
</body>
</html>
`;

// ==========================================
// Email Template Functions
// ==========================================

export const emailTemplates = {
    requestCreated: (data: {
        userName: string;
        requestId: number;
        requestType: string;
        items: string;
        date: string;
    }) => {
        const content = `
            <div class="header">
                <h1>📦 คำขอใหม่ถูกสร้างแล้ว</h1>
                <p>Request Created Successfully</p>
            </div>
            <div class="content">
                <p>สวัสดีคุณ <strong>${data.userName}</strong>,</p>
                <p>คำขอของคุณได้ถูกบันทึกเข้าสู่ระบบเรียบร้อยแล้ว รายละเอียดดังนี้:</p>
                
                <div class="info-box">
                    <div class="info-row">
                        <span class="info-label">หมายเลขคำขอ</span>
                        <span class="info-value">#${data.requestId}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">ประเภท</span>
                        <span class="info-value">${data.requestType}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">รายการ</span>
                        <span class="info-value">${data.items}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">วันที่</span>
                        <span class="info-value">${data.date}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">สถานะ</span>
                        <span class="status-badge status-pending">รอดำเนินการ</span>
                    </div>
                </div>
                
                <p>กรุณารอการอนุมัติจากผู้ดูแลระบบ คุณจะได้รับแจ้งเตือนเมื่อมีการเปลี่ยนแปลงสถานะ</p>
            </div>
        `;
        return baseTemplate(content, 'คำขอใหม่ถูกสร้างแล้ว - HR-IMS');
    },

    requestStatusChanged: (data: {
        userName: string;
        requestId: number;
        requestType: string;
        items: string;
        status: 'approved' | 'rejected' | 'pending';
        statusMessage?: string;
    }) => {
        const statusMap = {
            approved: { text: 'อนุมัติแล้ว', class: 'status-approved', emoji: '✅' },
            rejected: { text: 'ถูกปฏิเสธ', class: 'status-rejected', emoji: '❌' },
            pending: { text: 'รอดำเนินการ', class: 'status-pending', emoji: '⏳' },
        };
        const statusInfo = statusMap[data.status];

        const content = `
            <div class="header">
                <h1>${statusInfo.emoji} สถานะคำขอเปลี่ยนแปลง</h1>
                <p>Request Status Updated</p>
            </div>
            <div class="content">
                <p>สวัสดีคุณ <strong>${data.userName}</strong>,</p>
                <p>สถานะคำขอของคุณได้มีการเปลี่ยนแปลง:</p>
                
                <div class="info-box">
                    <div class="info-row">
                        <span class="info-label">หมายเลขคำขอ</span>
                        <span class="info-value">#${data.requestId}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">ประเภท</span>
                        <span class="info-value">${data.requestType}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">รายการ</span>
                        <span class="info-value">${data.items}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">สถานะใหม่</span>
                        <span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>
                    </div>
                </div>
                
                ${data.statusMessage ? `<p><strong>หมายเหตุ:</strong> ${data.statusMessage}</p>` : ''}
                
                ${data.status === 'approved' ? '<p>คุณสามารถมารับพัสดุได้ที่คลังพัสดุ ในเวลาทำการ</p>' : ''}
            </div>
        `;
        return baseTemplate(content, `สถานะคำขอเปลี่ยนแปลง - HR-IMS`);
    },

    lowStockAlert: (data: {
        itemName: string;
        itemId: number;
        warehouseName: string;
        currentStock: number;
        minStock: number;
    }) => {
        const content = `
            <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                <h1>⚠️ แจ้งเตือนสินค้าใกล้หมด</h1>
                <p>Low Stock Alert</p>
            </div>
            <div class="content">
                <div class="alert-box warning">
                    <div class="alert-title">⚠️ สินค้าใกล้หมด</div>
                    <p>สินค้า <strong>${data.itemName}</strong> ในคลัง <strong>${data.warehouseName}</strong> มีจำนวนต่ำกว่าที่กำหนด</p>
                </div>
                
                <div class="info-box">
                    <div class="info-row">
                        <span class="info-label">รหัสสินค้า</span>
                        <span class="info-value">#${data.itemId}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">ชื่อสินค้า</span>
                        <span class="info-value">${data.itemName}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">คลังสินค้า</span>
                        <span class="info-value">${data.warehouseName}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">จำนวนคงเหลือ</span>
                        <span class="info-value" style="color: #dc2626;">${data.currentStock}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">จำนวนขั้นต่ำ</span>
                        <span class="info-value">${data.minStock}</span>
                    </div>
                </div>
                
                <p>กรุณาดำเนินการสั่งซื้อเพิ่มเติมเพื่อป้องกันการขาดสต็อก</p>
            </div>
        `;
        return baseTemplate(content, 'แจ้งเตือนสินค้าใกล้หมด - HR-IMS');
    },
};

// ==========================================
// Send Email Function
// ==========================================

export const sendEmail = async (
    to: string,
    subject: string,
    html: string
): Promise<boolean> => {
    if (!SMTP_USER || !SMTP_PASS) {
        console.log('[Email] SMTP not configured. Skipping email send.');
        console.log('[Email] Would send to:', to);
        console.log('[Email] Subject:', subject);
        return false;
    }

    try {
        await transporter.sendMail({
            from: `"HR-IMS System" <${SMTP_FROM}>`,
            to,
            subject,
            html,
        });
        console.log('[Email] Sent successfully to:', to);
        return true;
    } catch (error) {
        console.error('[Email] Failed to send:', error);
        return false;
    }
};

// ==========================================
// Send Telegram Alert Function
// ==========================================

export const sendTelegramAlert = async (message: string): Promise<boolean> => {
    if (!telegramBot || !TELEGRAM_ADMIN_CHAT_ID) {
        console.log('[Telegram] Bot not configured. Skipping alert.');
        console.log('[Telegram] Would send:', message);
        return false;
    }

    try {
        await telegramBot.sendMessage(TELEGRAM_ADMIN_CHAT_ID, message, {
            parse_mode: 'HTML',
        });
        console.log('[Telegram] Alert sent to group:', TELEGRAM_ADMIN_CHAT_ID);
        return true;
    } catch (error) {
        console.error('[Telegram] Failed to send alert:', error);
        return false;
    }
};

// ==========================================
// Telegram Message Templates
// ==========================================

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

// ==========================================
// Helper: Check and Alert Low Stock
// ==========================================

export const checkAndAlertLowStock = async (
    itemId: number,
    warehouseId: number,
    prisma: any
): Promise<void> => {
    try {
        const stockLevel = await prisma.stockLevel.findUnique({
            where: {
                warehouseId_itemId: {
                    warehouseId,
                    itemId,
                },
            },
            include: {
                item: true,
                warehouse: true,
            },
        });

        if (!stockLevel || !stockLevel.minStock) return;

        if (stockLevel.quantity <= stockLevel.minStock) {
            const alertData = {
                itemName: stockLevel.item.name,
                itemId: stockLevel.item.id,
                warehouseName: stockLevel.warehouse.name,
                currentStock: stockLevel.quantity,
                minStock: stockLevel.minStock,
            };

            // Send Telegram to Admin Group
            await sendTelegramAlert(telegramTemplates.lowStock(alertData));

            // Also create in-app notification for admins
            await prisma.notification.create({
                data: {
                    text: `⚠️ สินค้า "${alertData.itemName}" ในคลัง "${alertData.warehouseName}" เหลือ ${alertData.currentStock} ชิ้น (ต่ำกว่า ${alertData.minStock})`,
                    userId: null, // Global notification
                },
            });
        }
    } catch (error) {
        console.error('[LowStock] Error checking stock level:', error);
    }
};

export default {
    sendEmail,
    sendTelegramAlert,
    emailTemplates,
    telegramTemplates,
    checkAndAlertLowStock,
};
