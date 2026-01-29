import { z } from 'zod';
import bcrypt from 'bcrypt';
import prisma from './prisma';
import { getPasswordPolicySettings } from './settings';

/**
 * Password Policy Service
 * ตรวจสอบและจัดการนโยบายรหัสผ่าน
 */

/**
 * ตรวจสอบความแข็งแกร่งของรหัสผ่าน
 */
export async function validatePassword(password: string): Promise<{
    valid: boolean;
    errors: string[];
    strength: 'weak' | 'fair' | 'good' | 'strong';
}> {
    const settings = await getPasswordPolicySettings();
    const errors: string[] = [];

    // ถ้าไม่เปิดใช้งาน Password Policy
    if (!settings.enabled) {
        return { valid: true, errors: [], strength: 'good' };
    }

    // ตรวจสอบความยาว
    if (password.length < settings.minLength) {
        errors.push(`รหัสผ่านต้องมีความยาวอย่างน้อย ${settings.minLength} ตัวอักษร`);
    }

    // ตรวจสอบตัวพิมพ์ใหญ่
    if (settings.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('รหัสผ่านต้องมีตัวพิมพ์ใหญ่ (A-Z)');
    }

    // ตรวจสอบตัวพิมพ์เล็ก
    if (settings.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('รหัสผ่านต้องมีตัวพิมพ์เล็ก (a-z)');
    }

    // ตรวจสอบตัวเลข
    if (settings.requireNumbers && !/[0-9]/.test(password)) {
        errors.push('รหัสผ่านต้องมีตัวเลข (0-9)');
    }

    // ตรวจสอบอักขระพิเศษ
    if (settings.requireSymbols && !/[^A-Za-z0-9]/.test(password)) {
        errors.push('รหัสผ่านต้องมีอักขระพิเศษ (!@#$%^&*)');
    }

    // ตรวจสอบตัวอักษรซ้ำติดกัน
    if (/(.)\1{2,}/.test(password)) {
        errors.push('ห้ามมีตัวอักษรซ้ำติดกันเกิน 2 ตัว');
    }

    // คำนวณความแข็งแกร่ง
    const strength = calculatePasswordStrength(password);

    return {
        valid: errors.length === 0,
        errors,
        strength
    };
}

/**
 * คำนวณความแข็งแกร่งของรหัสผ่าน
 */
export function calculatePasswordStrength(password: string): 'weak' | 'fair' | 'good' | 'strong' {
    let score = 0;

    // ความยาว
    if (password.length >= 12) score += 2;
    else if (password.length >= 8) score += 1;

    // ความหลากหลาย
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    // Bonus
    if (password.length >= 16) score += 1;

    // แปลงเป็นระดับ
    if (score >= 6) return 'strong';
    if (score >= 4) return 'good';
    if (score >= 2) return 'fair';
    return 'weak';
}

/**
 * ตรวจสอบว่ารหัสผ่านเคยใช้มาก่อนหรือไม่
 */
export async function isPasswordReused(
    userId: number,
    newPassword: string
): Promise<boolean> {
    const settings = await getPasswordPolicySettings();

    // ถ้าไม่ต้องการตรวจสอบประวัติ
    if (settings.historyCount <= 0) {
        return false;
    }

    // ดึงประวัติรหัสผ่าน
    const history = await prisma.passwordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: settings.historyCount
    });

    // ตรวจสอบว่าตรงกับรหัสผ่านเก่าหรือไม่
    for (const record of history) {
        const isMatch = await bcrypt.compare(newPassword, record.password);
        if (isMatch) {
            return true;
        }
    }

    return false;
}

/**
 * บันทึกรหัสผ่านลงประวัติ
 */
export async function savePasswordToHistory(
    userId: number,
    hashedPassword: string
): Promise<void> {
    const settings = await getPasswordPolicySettings();

    // ถ้าไม่ต้องการเก็บประวัติ
    if (settings.historyCount <= 0) {
        return;
    }

    // บันทึกรหัสผ่านใหม่
    await prisma.passwordHistory.create({
        data: {
            userId,
            password: hashedPassword
        }
    });

    // ลบประวัติเก่าที่เกินจำนวนที่กำหนด
    const history = await prisma.passwordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: settings.historyCount
    });

    for (const record of history) {
        await prisma.passwordHistory.delete({
            where: { id: record.id }
        });
    }
}

/**
 * ตรวจสอบว่ารหัสผ่านหมดอายุหรือไม่
 */
export async function isPasswordExpired(
    userId: number,
    passwordUpdatedAt: Date | null
): Promise<boolean> {
    const settings = await getPasswordPolicySettings();

    // ถ้าไม่กำหนดวันหมดอายุ
    if (settings.expiryDays <= 0) {
        return false;
    }

    // ถ้ายังไม่เคยอัปเดตรหัสผ่าน
    if (!passwordUpdatedAt) {
        return false;
    }

    const expiryDate = new Date(passwordUpdatedAt);
    expiryDate.setDate(expiryDate.getDate() + settings.expiryDays);

    return new Date() > expiryDate;
}

/**
 * สร้าง Schema สำหรับ Zod Validation
 */
export async function createPasswordSchema() {
    const settings = await getPasswordPolicySettings();

    let schema = z.string();

    if (settings.enabled) {
        schema = schema.min(
            settings.minLength,
            `รหัสผ่านต้องมีความยาวอย่างน้อย ${settings.minLength} ตัวอักษร`
        );

        if (settings.requireUppercase) {
            schema = schema.regex(/[A-Z]/, 'ต้องมีตัวพิมพ์ใหญ่ (A-Z)');
        }

        if (settings.requireLowercase) {
            schema = schema.regex(/[a-z]/, 'ต้องมีตัวพิมพ์เล็ก (a-z)');
        }

        if (settings.requireNumbers) {
            schema = schema.regex(/[0-9]/, 'ต้องมีตัวเลข (0-9)');
        }

        if (settings.requireSymbols) {
            schema = schema.regex(/[^A-Za-z0-9]/, 'ต้องมีอักขระพิเศษ');
        }
    }

    return schema;
}

/**
 * สร้างข้อความแนะนำรหัสผ่าน
 */
export async function getPasswordRequirements(): Promise<string[]> {
    const settings = await getPasswordPolicySettings();

    if (!settings.enabled) {
        return ['รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'];
    }

    const requirements: string[] = [
        `ความยาวอย่างน้อย ${settings.minLength} ตัวอักษร`
    ];

    if (settings.requireUppercase) {
        requirements.push('ต้องมีตัวพิมพ์ใหญ่ (A-Z)');
    }

    if (settings.requireLowercase) {
        requirements.push('ต้องมีตัวพิมพ์เล็ก (a-z)');
    }

    if (settings.requireNumbers) {
        requirements.push('ต้องมีตัวเลข (0-9)');
    }

    if (settings.requireSymbols) {
        requirements.push('ต้องมีอักขระพิเศษ (!@#$%^&*)');
    }

    if (settings.expiryDays > 0) {
        requirements.push(`หมดอายุทุก ${settings.expiryDays} วัน`);
    }

    if (settings.historyCount > 0) {
        requirements.push(`ห้ามใช้รหัสผ่านเดิม ${settings.historyCount} รุ่นล่าสุด`);
    }

    return requirements;
}
