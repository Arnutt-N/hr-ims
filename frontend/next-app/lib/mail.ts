'use server';

import nodemailer from 'nodemailer';

// Create transporter (singleton pattern)
const createTransporter = () => {
    if (!process.env.SMTP_HOST) {
        return null; // Will use fallback logging
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

/**
 * Core email sending function
 */
export async function sendEmail({
    to,
    subject,
    html
}: {
    to: string;
    subject: string;
    html: string;
}) {
    try {
        const transporter = createTransporter();

        // Fallback: Log instead of sending if SMTP not configured
        if (!transporter) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📧 [EMAIL MOCK MODE - SMTP NOT CONFIGURED]');
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log(`Body: ${html.substring(0, 200)}...`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            return { success: true, mock: true };
        }

        // Send real email
        await transporter.sendMail({
            from: process.env.SMTP_FROM || 'HR-IMS <noreply@hr-ims.com>',
            to,
            subject,
            html
        });

        console.log(`✅ Email sent successfully to ${to}`);
        return { success: true, mock: false };

    } catch (error) {
        console.error('❌ Failed to send email:', error);
        return { error: 'Failed to send email', details: error };
    }
}

/**
 * Send overdue notification email
 */
export async function sendOverdueEmail(
    user: { email: string; name: string | null },
    request: { id: number; dueDate: Date | null }
) {
    if (!user.email) return { error: 'User has no email' };

    const subject = '🚨 OVERDUE: Borrowed Items Need to be Returned';
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #ef4444; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .alert { background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
        .button { background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 15px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 0.875rem; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">⚠️ Overdue Alert</h1>
        </div>
        <div class="content">
          <p>สวัสดีครับ/ค่ะ คุณ <strong>${user.name || 'ผู้ใช้งาน'}</strong>,</p>
          
          <div class="alert">
            <strong>🔔 แจ้งเตือน:</strong> รายการที่คุณยืม (Request #${request.id}) 
            <strong>เกินกำหนดคืนแล้ว</strong>
            ${request.dueDate ? `<br>กำหนดคืน: ${new Date(request.dueDate).toLocaleDateString('th-TH')}` : ''}
          </div>

          <p>กรุณาดำเนินการคืนครุภัณฑ์ที่ยืมโดยเร็วที่สุด หากมีปัญหาหรือข้อสงสัย กรุณาติดต่อเจ้าหน้าที่พัสดุ</p>

          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/my-assets" class="button">
            ดูรายการของฉัน
          </a>

          <div class="footer">
            <p>ระบบบริหารจัดการพัสดุและครุภัณฑ์ (HR-IMS)</p>
            <p style="font-size: 0.75rem; color: #9ca3af;">
              อีเมลนี้ส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับ
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

    return await sendEmail({ to: user.email, subject, html });
}

/**
 * Send request status update email
 */
export async function sendStatusUpdateEmail(
    user: { email: string; name: string | null },
    request: { id: number; type: string },
    status: 'approved' | 'rejected' | 'cancelled'
) {
    if (!user.email) return { error: 'User has no email' };

    const statusConfig = {
        approved: {
            subject: '✅ คำขอของคุณได้รับการอนุมัติแล้ว',
            color: '#10b981',
            icon: '✅',
            text: 'อนุมัติ',
            message: `คำขอของคุณได้รับการอนุมัติแล้ว ${request.type === 'borrow' ? 'สามารถมารับครุภัณฑ์ได้ที่หน่วยงานพัสดุ' : 'กรุณาตรวจสอบรายละเอียดในระบบ'}`,
        },
        rejected: {
            subject: '❌ คำขอของคุณถูกปฏิเสธ',
            color: '#ef4444',
            icon: '❌',
            text: 'ปฏิเสธ',
            message: 'ขออภัยครับ/ค่ะ คำขอของคุณถูกปฏิเสธ หากต้องการสอบถามเพิ่มเติม กรุณาติดต่อเจ้าหน้าที่พัสดุ',
        },
        cancelled: {
            subject: '🚫 คำขอของคุณถูกยกเลิก',
            color: '#6b7280',
            icon: '🚫',
            text: 'ยกเลิก',
            message: 'คำขอของคุณถูกยกเลิกแล้ว หากยังต้องการดำเนินการ กรุณาสร้างคำขอใหม่ในระบบ',
        },
    } as const;

    const currentStatus = statusConfig[status];

    const typeText = {
        'borrow': 'ยืมครุภัณฑ์',
        'withdraw': 'เบิกวัสดุ',
        'return': 'คืนครุภัณฑ์'
    }[request.type] || request.type;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: ${currentStatus.color}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .status-badge { background-color: ${currentStatus.color}; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
        .info-box { background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #e5e7eb; }
        .button { background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 15px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 0.875rem; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">${currentStatus.icon} สถานะคำขอของคุณ</h1>
        </div>
        <div class="content">
          <p>สวัสดีครับ/ค่ะ คุณ <strong>${user.name || 'ผู้ใช้งาน'}</strong>,</p>
          
          <div class="info-box">
            <p style="margin: 0 0 10px 0;"><strong>คำขอเลขที่:</strong> #${request.id}</p>
            <p style="margin: 0 0 10px 0;"><strong>ประเภท:</strong> ${typeText}</p>
            <p style="margin: 0;"><strong>สถานะ:</strong> <span class="status-badge">${currentStatus.text}</span></p>
          </div>

          <p>${currentStatus.message}</p>

          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/history" class="button">
            ดูประวัติคำขอ
          </a>

          <div class="footer">
            <p>ระบบบริหารจัดการพัสดุและครุภัณฑ์ (HR-IMS)</p>
            <p style="font-size: 0.75rem; color: #9ca3af;">
              อีเมลนี้ส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับ
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

    return await sendEmail({ to: user.email, subject: currentStatus.subject, html });
}
