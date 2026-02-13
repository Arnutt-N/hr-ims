import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { sendVerificationEmail, sendTestEmail, verifyEmailConnection } from '../services/emailService';
import { createVerificationToken, verifyToken, createPasswordResetToken, verifyPasswordResetToken, usePasswordResetToken, getVerificationStatus } from '../services/verificationService';
import { cacheGet, cacheSet } from '../utils/cache';
import prisma from '../utils/prisma';
import bcrypt from 'bcrypt';
import { validatePassword } from '../utils/passwordPolicy';

const router = Router();

/**
 * @route POST /api/email/send-verification
 * @desc ส่งอีเมลยืนยัน
 * @access Private
 */
router.post('/send-verification', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // ตรวจสอบสถานะการยืนยัน
        const status = await getVerificationStatus(userId);
        if (status.verified) {
            return res.status(400).json({ error: 'Email already verified' });
        }

        // ตรวจสอบ rate limit
        const cacheKey = `email_verification_${userId}`;
        const lastSent = await cacheGet<number>(cacheKey);
        if (lastSent && Date.now() - lastSent < 60000) { // 1 นาที
            return res.status(429).json({
                error: 'Please wait 1 minute before requesting another email'
            });
        }

        // สร้างโทเค็นและส่งอีเมล
        const token = await createVerificationToken(userId);
        const sent = await sendVerificationEmail(user.email, token);

        if (!sent) {
            return res.status(500).json({ error: 'Failed to send email' });
        }

        // บันทึกเวลาส่งอีเมลล่าสุด
        await cacheSet(cacheKey, Date.now(), 60);

        res.json({
            success: true,
            message: 'Verification email sent'
        });
    } catch (error) {
        console.error('Send verification error:', error);
        res.status(500).json({ error: 'Failed to send verification email' });
    }
});

/**
 * @route POST /api/email/verify
 * @desc ยืนยันอีเมลด้วยโทเค็น
 * @access Public
 */
router.post('/verify', async (req: Request, res: Response) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const result = await verifyToken(token);

        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }

        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({ error: 'Failed to verify email' });
    }
});

/**
 * @route POST /api/email/forgot-password
 * @desc ขอรีเซ็ตรหัสผ่าน
 * @access Public
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // สร้างโทเค็น (ไม่เปิดเผยว่าอีเมลมีในระบบหรือไม่)
        const token = await createPasswordResetToken(email);

        if (token) {
            const { sendPasswordResetEmail } = await import('../services/emailService');
            await sendPasswordResetEmail(email, token);
        }

        // ตอบกลับเหมือนกันไม่ว่าอีเมลจะมีในระบบหรือไม่
        res.json({
            success: true,
            message: 'If the email exists, a password reset link has been sent'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

/**
 * @route POST /api/email/reset-password
 * @desc รีเซ็ตรหัสผ่านด้วยโทเค็น
 * @access Public
 */
router.post('/reset-password', async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        // ตรวจสอบโทเค็น
        // [2026-02-10] Modified by CodeX: enforce password policy (if enabled)
        const policy = await validatePassword(newPassword);
        if (!policy.valid) {
            return res.status(400).json({ error: policy.errors[0] || 'Invalid password' });
        }

        const verification = await verifyPasswordResetToken(token);

        if (!verification.valid) {
            return res.status(400).json({ error: verification.message });
        }

        // อัปเดตรหัสผ่าน
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: verification.userId },
            data: { password: hashedPassword },
        });

        // ลบโทเค็น
        await usePasswordResetToken(token);

        res.json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

/**
 * @route GET /api/email/status
 * @desc ดึงสถานะการยืนยันอีเมล
 * @access Private
 */
router.get('/status', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const status = await getVerificationStatus(userId);

        res.json(status);
    } catch (error) {
        console.error('Get verification status error:', error);
        res.status(500).json({ error: 'Failed to get verification status' });
    }
});

/**
 * @route POST /api/email/test
 * @desc ทดสอบการส่งอีเมล
 * @access Private (Admin only)
 */
router.post('/test', requireAuth, requireRole(['superadmin']), async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const sent = await sendTestEmail(email);

        if (!sent) {
            return res.status(500).json({ error: 'Failed to send test email' });
        }

        res.json({
            success: true,
            message: 'Test email sent successfully'
        });
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({ error: 'Failed to send test email' });
    }
});

/**
 * @route GET /api/email/verify-connection
 * @desc ตรวจสอบการเชื่อมต่อ SMTP
 * @access Private (Admin only)
 */
router.get('/verify-connection', requireAuth, requireRole(['superadmin']), async (req: Request, res: Response) => {
    try {
        const result = await verifyEmailConnection();

        res.json(result);
    } catch (error) {
        console.error('Verify connection error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify connection'
        });
    }
});

export default router;
