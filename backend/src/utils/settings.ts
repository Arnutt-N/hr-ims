import prisma from './prisma';
import { Settings } from '@prisma/client';

/**
 * System Settings Service
 * จัดการการอ่านและเขียนข้อมูลการตั้งค่าระบบ
 */

// Cache สำหรับ Settings (ลดการ query ฐานข้อมูล)
let settingsCache: Settings | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 1 นาที

/**
 * ดึงข้อมูล Settings ทั้งหมด
 * ใช้ Cache เพื่อลดการ query ฐานข้อมูล
 */
export async function getSettings(): Promise<Settings> {
    const now = Date.now();

    // ถ้ามี Cache และยังไม่หมดอายุ
    if (settingsCache && (now - cacheTimestamp) < CACHE_TTL) {
        return settingsCache;
    }

    // ดึงจากฐานข้อมูล
    let settings = await prisma.settings.findFirst();

    // ถ้ายังไม่มี ให้สร้าง Default
    if (!settings) {
        settings = await prisma.settings.create({
            data: {}
        });
    }

    // อัปเดต Cache
    settingsCache = settings;
    cacheTimestamp = now;

    return settings;
}

/**
 * อัปเดต Settings
 * @param data ข้อมูลที่ต้องการอัปเดต
 * @param userId ID ของผู้ใช้ที่ทำการอัปเดต
 */
export async function updateSettings(
    data: Partial<Omit<Settings, 'id' | 'createdAt' | 'updatedAt'>>,
    userId?: number
): Promise<Settings> {
    const settings = await getSettings();

    const updated = await prisma.settings.update({
        where: { id: settings.id },
        data: {
            ...data,
            updatedBy: userId
        }
    });

    // Clear Cache
    settingsCache = null;
    cacheTimestamp = 0;

    return updated;
}

/**
 * ดึงค่า Setting เฉพาะบางฟิลด์
 */
export async function getSetting<K extends keyof Settings>(
    key: K
): Promise<Settings[K]> {
    const settings = await getSettings();
    return settings[key];
}

/**
 * รีเซ็ต Cache (ใช้เมื่อมีการอัปเดตจากที่อื่น)
 */
export function clearSettingsCache(): void {
    settingsCache = null;
    cacheTimestamp = 0;
}

// ==================== Helper Functions สำหรับแต่ละโมดูล ====================

/**
 * Rate Limiting Settings
 */
export async function getRateLimitSettings() {
    const settings = await getSettings();
    return {
        enabled: settings.rateLimitEnabled,
        windowMs: settings.rateLimitWindowMs,
        maxRequests: settings.rateLimitMaxRequests,
        authMaxRequests: settings.rateLimitAuthMaxRequests
    };
}

/**
 * Logging Settings
 */
export async function getLoggingSettings() {
    const settings = await getSettings();
    return {
        enabled: settings.loggingEnabled,
        level: settings.logLevel,
        retentionDays: settings.logRetentionDays,
        auditEnabled: settings.auditLogEnabled
    };
}

/**
 * Backup Settings
 */
export async function getBackupSettings() {
    const settings = await getSettings();
    return {
        enabled: settings.backupEnabled,
        schedule: settings.backupSchedule,
        retentionCount: settings.backupRetentionCount,
        storagePath: settings.backupStoragePath,
        includeUploads: settings.backupIncludeUploads
    };
}

/**
 * Password Policy Settings
 */
export async function getPasswordPolicySettings() {
    const settings = await getSettings();
    return {
        enabled: settings.passwordPolicyEnabled,
        minLength: settings.passwordMinLength,
        requireUppercase: settings.passwordRequireUppercase,
        requireLowercase: settings.passwordRequireLowercase,
        requireNumbers: settings.passwordRequireNumbers,
        requireSymbols: settings.passwordRequireSymbols,
        expiryDays: settings.passwordExpiryDays,
        historyCount: settings.passwordHistoryCount
    };
}

/**
 * Caching Settings
 */
export async function getCachingSettings() {
    const settings = await getSettings();
    return {
        enabled: settings.cachingEnabled,
        defaultTTL: settings.cacheDefaultTTL,
        maxSize: settings.cacheMaxSize
    };
}

/**
 * Email Settings
 */
export async function getEmailSettings() {
    const settings = await getSettings();
    return {
        verificationEnabled: settings.emailVerificationEnabled,
        smtpHost: settings.emailSmtpHost,
        smtpPort: settings.emailSmtpPort,
        smtpUser: settings.emailSmtpUser,
        smtpPass: settings.emailSmtpPass,
        fromAddress: settings.emailFromAddress
    };
}

/**
 * ตรวจสอบว่า Feature เปิดใช้งานหรือไม่
 */
export async function isFeatureEnabled(feature:
    'rateLimit' | 'logging' | 'backup' | 'passwordPolicy' | 'caching' | 'emailVerification'
): Promise<boolean> {
    const settings = await getSettings();

    switch (feature) {
        case 'rateLimit':
            return settings.rateLimitEnabled;
        case 'logging':
            return settings.loggingEnabled;
        case 'backup':
            return settings.backupEnabled;
        case 'passwordPolicy':
            return settings.passwordPolicyEnabled;
        case 'caching':
            return settings.cachingEnabled;
        case 'emailVerification':
            return settings.emailVerificationEnabled;
        default:
            return false;
    }
}
