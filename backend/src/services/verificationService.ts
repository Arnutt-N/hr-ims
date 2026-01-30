import prisma from '../utils/prisma';
import { logInfo, logError } from '../utils/logger';
import crypto from 'crypto';

/**
 * Email Verification Service
 * จัดการการยืนยันอีเมล
 */

/**
 * สร้างโทเค็นยืนยัน
 */
export async function createVerificationToken(userId: number): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ชั่วโมง

    // ลบโทเค็นเก่าของผู้ใช้
    await prisma.emailVerification.deleteMany({
        where: { userId },
    });

    // สร้างโทเค็นใหม่
    await prisma.emailVerification.create({
        data: {
            userId,
            token,
            expiresAt,
        },
    });

    await logInfo('Verification token created', { userId });

    return token;
}

/**
 * ตรวจสอบโทเค็น
 */
export async function verifyToken(token: string): Promise<{
    success: boolean;
    message: string;
    userId?: number;
}> {
    try {
        const verification = await prisma.emailVerification.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!verification) {
            return {
                success: false,
                message: 'โทเค็นไม่ถูกต้อง',
            };
        }

        if (verification.expiresAt < new Date()) {
            // ลบโทเค็นที่หมดอายุ
            await prisma.emailVerification.delete({
                where: { id: verification.id },
            });

            return {
                success: false,
                message: 'โทเค็นหมดอายุแล้ว',
            };
        }

        if (verification.verifiedAt) {
            return {
                success: false,
                message: 'อีเมลนี้ได้รับการยืนยันแล้ว',
            };
        }

        // อัปเดตสถานะการยืนยัน
        await prisma.emailVerification.update({
            where: { id: verification.id },
            data: {
                verifiedAt: new Date(),
            },
        });

        await logInfo('Email verified successfully', {
            userId: verification.userId,
            email: verification.user.email,
        });

        return {
            success: true,
            message: 'ยืนยันอีเมลสำเร็จ',
            userId: verification.userId,
        };

    } catch (error) {
        await logError('Failed to verify token', error);
        return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการยืนยัน',
        };
    }
}

/**
 * สร้างโทเค็นรีเซ็ตรหัสผ่าน
 */
export async function createPasswordResetToken(email: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        return null; // ไม่เปิดเผยว่าอีเมลไม่มีในระบบ
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 ชั่วโมง

    // ลบโทเค็นเก่า
    await prisma.emailVerification.deleteMany({
        where: { userId: user.id },
    });

    // สร้างโทเค็นใหม่
    await prisma.emailVerification.create({
        data: {
            userId: user.id,
            token,
            expiresAt,
        },
    });

    await logInfo('Password reset token created', { userId: user.id });

    return token;
}

/**
 * ตรวจสอบโทเค็นรีเซ็ตรหัสผ่าน
 */
export async function verifyPasswordResetToken(token: string): Promise<{
    valid: boolean;
    userId?: number;
    message?: string;
}> {
    const verification = await prisma.emailVerification.findUnique({
        where: { token },
    });

    if (!verification) {
        return {
            valid: false,
            message: 'โทเค็นไม่ถูกต้อง',
        };
    }

    if (verification.expiresAt < new Date()) {
        await prisma.emailVerification.delete({
            where: { id: verification.id },
        });

        return {
            valid: false,
            message: 'โทเค็นหมดอายุแล้ว',
        };
    }

    return {
        valid: true,
        userId: verification.userId,
    };
}

/**
 * ใช้โทเค็นรีเซ็ตรหัสผ่าน
 */
export async function usePasswordResetToken(token: string): Promise<boolean> {
    try {
        await prisma.emailVerification.delete({
            where: { token },
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * ลบโทเค็นที่หมดอายุ
 */
export async function cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.emailVerification.deleteMany({
        where: {
            expiresAt: {
                lt: new Date(),
            },
        },
    });

    if (result.count > 0) {
        await logInfo('Cleaned up expired tokens', { count: result.count });
    }

    return result.count;
}

/**
 * ดึงสถานะการยืนยัน
 */
export async function getVerificationStatus(userId: number): Promise<{
    verified: boolean;
    verifiedAt?: Date;
    pending?: boolean;
}> {
    // ตรวจสอบว่ามีการยืนยันแล้วหรือไม่
    const verifiedRecord = await prisma.emailVerification.findFirst({
        where: {
            userId,
            verifiedAt: {
                not: null,
            },
        },
    });

    if (verifiedRecord?.verifiedAt) {
        return {
            verified: true,
            verifiedAt: verifiedRecord.verifiedAt,
        };
    }

    // ตรวจสอบว่ามีโทเค็นรออยู่หรือไม่
    const pendingToken = await prisma.emailVerification.findFirst({
        where: {
            userId,
            expiresAt: {
                gt: new Date(),
            },
            verifiedAt: null,
        },
    });

    return {
        verified: false,
        pending: !!pendingToken,
    };
}
