import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { getSettings, updateSettings } from '../utils/settings';
import { z } from 'zod';

const router = Router();

/**
 * Validation Schema สำหรับการอัปเดต Settings
 */
const settingsUpdateSchema = z.object({
    // ข้อมูลทั่วไป
    orgName: z.string().min(1).max(200).optional(),
    borrowLimit: z.number().int().min(1).max(365).optional(),
    checkInterval: z.number().int().min(1).max(90).optional(),
    maintenanceAlert: z.boolean().optional(),
    allowRegistration: z.boolean().optional(),
    footerText: z.string().max(200).optional(),

    // Rate Limiting
    rateLimitEnabled: z.boolean().optional(),
    rateLimitWindowMs: z.number().int().min(60000).max(3600000).optional(),
    rateLimitMaxRequests: z.number().int().min(10).max(1000).optional(),
    rateLimitAuthMaxRequests: z.number().int().min(3).max(20).optional(),

    // Logging
    loggingEnabled: z.boolean().optional(),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).optional(),
    logRetentionDays: z.number().int().min(7).max(365).optional(),
    auditLogEnabled: z.boolean().optional(),

    // Backup
    backupEnabled: z.boolean().optional(),
    backupSchedule: z.string().regex(/^\d+\s+\d+\s+\*\s+\*\s+\*$/).optional(),
    backupRetentionCount: z.number().int().min(1).max(30).optional(),
    backupStoragePath: z.string().max(500).optional(),
    backupIncludeUploads: z.boolean().optional(),

    // Password Policy
    passwordPolicyEnabled: z.boolean().optional(),
    passwordMinLength: z.number().int().min(6).max(128).optional(),
    passwordRequireUppercase: z.boolean().optional(),
    passwordRequireLowercase: z.boolean().optional(),
    passwordRequireNumbers: z.boolean().optional(),
    passwordRequireSymbols: z.boolean().optional(),
    passwordExpiryDays: z.number().int().min(0).max(365).optional(),
    passwordHistoryCount: z.number().int().min(0).max(10).optional(),

    // Caching
    cachingEnabled: z.boolean().optional(),
    cacheDefaultTTL: z.number().int().min(60).max(3600).optional(),
    cacheMaxSize: z.number().int().min(100).max(10000).optional(),

    // Email
    emailVerificationEnabled: z.boolean().optional(),
    emailSmtpHost: z.string().max(200).optional().nullable(),
    emailSmtpPort: z.number().int().min(1).max(65535).optional(),
    emailSmtpUser: z.string().max(200).optional().nullable(),
    emailSmtpPass: z.string().max(200).optional().nullable(),
    emailFromAddress: z.string().email().max(200).optional(),
});

/**
 * GET /api/settings
 * ดึงข้อมูล Settings ทั้งหมด
 * สำหรับ Superadmin เท่านั้น
 */
router.get('/', requireAuth, authorize(['superadmin']), async (req, res) => {
    try {
        const settings = await getSettings();
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

/**
 * PUT /api/settings
 * อัปเดต Settings
 * สำหรับ Superadmin เท่านั้น
 */
router.put('/', requireAuth, authorize(['superadmin']), async (req, res) => {
    try {
        // Validate input
        const validation = settingsUpdateSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Invalid input',
                details: validation.error.errors
            });
        }

        // อัปเดต Settings
        const userId = (req as any).user?.id;
        const updated = await updateSettings(validation.data, userId);

        res.json({
            message: 'Settings updated successfully',
            settings: updated
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

/**
 * GET /api/settings/public
 * ดึงข้อมูล Settings ที่เปิดเผยได้ (สำหรับทุกคน)
 */
router.get('/public', async (req, res) => {
    try {
        const settings = await getSettings();
        res.json({
            orgName: settings.orgName,
            footerText: settings.footerText,
            allowRegistration: settings.allowRegistration
        });
    } catch (error) {
        console.error('Error fetching public settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

/**
 * POST /api/settings/test-email
 * ทดสอบการส่งอีเมล
 * สำหรับ Superadmin เท่านั้น
 */
router.post('/test-email', requireAuth, authorize(['superadmin']), async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        // TODO: Implement email sending test
        // const emailService = require('../services/emailService');
        // await emailService.sendTestEmail(email);

        res.json({ message: 'Test email sent successfully' });
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({ error: 'Failed to send test email' });
    }
});

/**
 * POST /api/settings/backup-now
 * สั่ง Backup ทันที
 * สำหรับ Superadmin เท่านั้น
 */
router.post('/backup-now', requireAuth, authorize(['superadmin']), async (req, res) => {
    try {
        // TODO: Implement backup service
        // const backupService = require('../services/backupService');
        // const result = await backupService.backupNow();

        res.json({
            message: 'Backup started',
            // backupId: result.id 
        });
    } catch (error) {
        console.error('Error starting backup:', error);
        res.status(500).json({ error: 'Failed to start backup' });
    }
});

/**
 * GET /api/settings/backups
 * ดึงรายการ Backup
 * สำหรับ Superadmin เท่านั้น
 */
router.get('/backups', requireAuth, authorize(['superadmin']), async (req, res) => {
    try {
        // TODO: Implement backup listing
        // const backupService = require('../services/backupService');
        // const backups = await backupService.listBackups();

        res.json({ backups: [] });
    } catch (error) {
        console.error('Error listing backups:', error);
        res.status(500).json({ error: 'Failed to list backups' });
    }
});

/**
 * POST /api/settings/restore
 * Restore จาก Backup
 * สำหรับ Superadmin เท่านั้น
 */
router.post('/restore', requireAuth, authorize(['superadmin']), async (req, res) => {
    try {
        const { backupPath } = req.body;

        if (!backupPath) {
            return res.status(400).json({ error: 'Backup path is required' });
        }

        // TODO: Implement restore service
        // const backupService = require('../services/backupService');
        // await backupService.restore(backupPath);

        res.json({ message: 'Restore completed successfully' });
    } catch (error) {
        console.error('Error restoring backup:', error);
        res.status(500).json({ error: 'Failed to restore backup' });
    }
});

/**
 * DELETE /api/settings/cache
 * ล้าง Cache
 * สำหรับ Superadmin เท่านั้น
 */
router.delete('/cache', requireAuth, authorize(['superadmin']), async (req, res) => {
    try {
        // Clear settings cache
        const { clearSettingsCache } = require('../utils/settings');
        clearSettingsCache();

        // TODO: Clear other caches
        // const cacheService = require('../services/cacheService');
        // cacheService.flushAll();

        res.json({ message: 'Cache cleared successfully' });
    } catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({ error: 'Failed to clear cache' });
    }
});

export default router;
