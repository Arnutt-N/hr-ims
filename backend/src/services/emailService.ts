import nodemailer from 'nodemailer';
import { getEmailSettings, isFeatureEnabled } from '../utils/settings';
import { logInfo, logError } from '../utils/logger';

/**
 * Email Service
 * จัดการการส่งอีเมล
 */

/**
 * สร้าง Transporter
 */
async function createTransporter() {
    const settings = await getEmailSettings();

    if (!settings.smtpHost || !settings.smtpUser) {
        throw new Error('Email settings not configured');
    }

    return nodemailer.createTransport({
        host: settings.smtpHost,
        port: settings.smtpPort,
        secure: settings.smtpPort === 465,
        auth: {
            user: settings.smtpUser,
            pass: settings.smtpPass || '',
        },
    });
}

/**
 * ส่งอีเมล
 */
export async function sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
}): Promise<boolean> {
    const enabled = await isFeatureEnabled('emailVerification');

    if (!enabled) {
        console.log('Email service is disabled');
        return false;
    }

    try {
        const settings = await getEmailSettings();
        const transporter = await createTransporter();

        const result = await transporter.sendMail({
            from: settings.fromAddress,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        });

        await logInfo('Email sent successfully', {
            to: options.to,
            subject: options.subject,
            messageId: result.messageId,
        });

        return true;

    } catch (error) {
        await logError('Failed to send email', error);
        return false;
    }
}

/**
 * ส่งอีเมลยืนยัน
 */
export async function sendVerificationEmail(
    to: string,
    token: string
): Promise<boolean> {
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">ยืนยันอีเมลของคุณ</h2>
            <p>สวัสดี,</p>
            <p>กรุณาคลิกลิงก์ด้านล่างเพื่อยืนยันอีเมลของคุณ:</p>
            <p>
                <a href="${verificationUrl}" 
                   style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">
                    ยืนยันอีเมล
                </a>
            </p>
            <p>หรือคัดลอกลิงก์นี้:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            <p style="color: #999; font-size: 12px;">ลิงก์นี้จะหมดอายุใน 24 ชั่วโมง</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">
                หากคุณไม่ได้สมัครสมาชิก กรุณาละเว้นอีเมลนี้
            </p>
        </div>
    `;

    const text = `
        ยืนยันอีเมลของคุณ
        
        กรุณาคลิกลิงก์ด้านล่างเพื่อยืนยันอีเมล:
        ${verificationUrl}
        
        ลิงก์นี้จะหมดอายุใน 24 ชั่วโมง
    `;

    return sendEmail({
        to,
        subject: 'ยืนยันอีเมลสำหรับ HR-IMS',
        html,
        text,
    });
}

/**
 * ส่งอีเมลรีเซ็ตรหัสผ่าน
 */
export async function sendPasswordResetEmail(
    to: string,
    token: string
): Promise<boolean> {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">รีเซ็ตรหัสผ่าน</h2>
            <p>สวัสดี,</p>
            <p>คุณได้ขอรีเซ็ตรหัสผ่าน กรุณาคลิกลิงก์ด้านล่าง:</p>
            <p>
                <a href="${resetUrl}" 
                   style="display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px;">
                    รีเซ็ตรหัสผ่าน
                </a>
            </p>
            <p>หรือคัดลอกลิงก์นี้:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <p style="color: #999; font-size: 12px;">ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">
                หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาละเว้นอีเมลนี้
            </p>
        </div>
    `;

    const text = `
        รีเซ็ตรหัสผ่าน
        
        คุณได้ขอรีเซ็ตรหัสผ่าน กรุณาคลิกลิงก์ด้านล่าง:
        ${resetUrl}
        
        ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง
    `;

    return sendEmail({
        to,
        subject: 'รีเซ็ตรหัสผ่านสำหรับ HR-IMS',
        html,
        text,
    });
}

/**
 * ทดสอบการส่งอีเมล
 */
export async function sendTestEmail(to: string): Promise<boolean> {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">ทดสอบการส่งอีเมล</h2>
            <p>นี่คืออีเมลทดสอบจากระบบ HR-IMS</p>
            <p>หากคุณได้รับอีเมลนี้ แสดงว่าการตั้งค่าอีเมลทำงานถูกต้อง</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">
                HR-IMS System<br>
                ${new Date().toLocaleString('th-TH')}
            </p>
        </div>
    `;

    return sendEmail({
        to,
        subject: 'ทดสอบการส่งอีเมล - HR-IMS',
        html,
    });
}

/**
 * ตรวจสอบการเชื่อมต่อ SMTP
 */
export async function verifyEmailConnection(): Promise<{
    success: boolean;
    message: string;
}> {
    try {
        const transporter = await createTransporter();
        await transporter.verify();

        return {
            success: true,
            message: 'SMTP connection verified successfully',
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
            success: false,
            message,
        };
    }
}
