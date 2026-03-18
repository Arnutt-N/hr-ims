import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import express from 'express';
import request from 'supertest';

jest.mock('../../middleware/auth', () => ({
    requireAuth: (req: any, res: any, next: any) => {
        req.user = { id: 1, role: 'superadmin', roles: ['superadmin'] };
        next();
    },
}));

jest.mock('../../middleware/rbac', () => ({
    authorize: () => (req: any, res: any, next: any) => next(),
}));

jest.mock('../../utils/settings', () => ({
    clearSettingsCache: jest.fn(),
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
}));

jest.mock('../../services/backupService', () => ({
    createBackup: jest.fn(),
    listBackups: jest.fn(),
    restoreBackup: jest.fn(),
}));

jest.mock('../../services/emailService', () => ({
    sendTestEmail: jest.fn(),
}));

jest.mock('../../utils/cache', () => ({
    cacheFlush: jest.fn(),
    resetCache: jest.fn(),
}));

jest.mock('../../utils/prisma', () => ({
    __esModule: true,
    default: {
        $connect: jest.fn(),
        $disconnect: jest.fn(),
    },
}));

import settingsRoutes from '../../routes/settings';
import { createBackup, listBackups, restoreBackup } from '../../services/backupService';
import { sendTestEmail } from '../../services/emailService';
import { cacheFlush, resetCache } from '../../utils/cache';
import { getSettings, updateSettings } from '../../utils/settings';

const mockedGetSettings = getSettings as jest.MockedFunction<typeof getSettings>;
const mockedUpdateSettings = updateSettings as jest.MockedFunction<typeof updateSettings>;
const mockedCreateBackup = createBackup as jest.MockedFunction<typeof createBackup>;
const mockedListBackups = listBackups as jest.MockedFunction<typeof listBackups>;
const mockedRestoreBackup = restoreBackup as jest.MockedFunction<typeof restoreBackup>;
const mockedSendTestEmail = sendTestEmail as jest.MockedFunction<typeof sendTestEmail>;
const mockedResetCache = resetCache as jest.MockedFunction<typeof resetCache>;
const mockedCacheFlush = cacheFlush as jest.MockedFunction<typeof cacheFlush>;

const baseSettings = {
    id: 1,
    orgName: 'IMS Corporation',
    borrowLimit: 7,
    checkInterval: 7,
    maintenanceAlert: true,
    allowRegistration: false,
    footerText: 'IMS Asset Management System',
    backupEnabled: true,
    backupSchedule: '0 2 * * *',
    backupRetentionCount: 7,
    backupStoragePath: './backups',
    backupIncludeUploads: true,
    emailVerificationEnabled: false,
    emailSmtpHost: null,
    emailSmtpPort: 587,
    emailSmtpUser: null,
    emailSmtpPass: null,
    emailFromAddress: 'noreply@hr-ims.local',
};

const app = express();
app.use(express.json());
app.use('/api/settings', settingsRoutes);

describe('Settings API Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedGetSettings.mockResolvedValue({ ...baseSettings } as any);
        mockedUpdateSettings.mockImplementation(async (data) => ({
            ...baseSettings,
            ...data,
        }) as any);
        mockedCreateBackup.mockResolvedValue({
            success: true,
            path: 'D:/backups/backup-test.zip',
            filename: 'backup-test.zip',
            size: 1024,
            timestamp: new Date('2026-03-18T00:00:00.000Z'),
        });
        mockedListBackups.mockResolvedValue([
            {
                filename: 'backup-test.zip',
                path: 'D:/backups/backup-test.zip',
                size: 1024,
                createdAt: new Date('2026-03-18T00:00:00.000Z'),
            },
        ]);
        mockedRestoreBackup.mockResolvedValue({
            success: true,
            status: 'success',
            restoredPath: 'D:/backups/backup-test.zip',
            databasePath: 'D:/db/dev.db',
            uploadsRestored: true,
        });
        mockedSendTestEmail.mockResolvedValue(true);
        mockedResetCache.mockImplementation(() => undefined);
        mockedCacheFlush.mockResolvedValue(undefined);
    });

    describe('GET /api/settings', () => {
        it('should return settings', async () => {
            const response = await request(app)
                .get('/api/settings')
                .expect(200);

            expect(response.body).toHaveProperty('orgName', baseSettings.orgName);
            expect(response.body).toHaveProperty('borrowLimit', baseSettings.borrowLimit);
        });
    });

    describe('PUT /api/settings', () => {
        it('should update settings', async () => {
            const newSettings = {
                orgName: 'Updated Organization',
                borrowLimit: 14,
            };

            const response = await request(app)
                .put('/api/settings')
                .send(newSettings)
                .expect(200);

            expect(mockedUpdateSettings).toHaveBeenCalledWith(newSettings, 1);
            expect(response.body.message).toBe('Settings updated successfully');
            expect(response.body.settings.orgName).toBe(newSettings.orgName);
            expect(response.body.settings.borrowLimit).toBe(newSettings.borrowLimit);
        });

        it('should reject invalid settings', async () => {
            await request(app)
                .put('/api/settings')
                .send({ borrowLimit: -1 })
                .expect(400);

            expect(mockedUpdateSettings).not.toHaveBeenCalled();
        });
    });

    describe('POST /api/settings/test-email', () => {
        it('should send a test email', async () => {
            const response = await request(app)
                .post('/api/settings/test-email')
                .send({ email: 'admin@example.com' })
                .expect(200);

            expect(mockedSendTestEmail).toHaveBeenCalledWith('admin@example.com');
            expect(response.body.success).toBe(true);
        });
    });

    describe('POST /api/settings/backup-now', () => {
        it('should create a backup and return metadata', async () => {
            const response = await request(app)
                .post('/api/settings/backup-now')
                .expect(200);

            expect(mockedCreateBackup).toHaveBeenCalled();
            expect(response.body.success).toBe(true);
            expect(response.body.backup.filename).toBe('backup-test.zip');
        });
    });

    describe('GET /api/settings/backups', () => {
        it('should list backups', async () => {
            const response = await request(app)
                .get('/api/settings/backups')
                .expect(200);

            expect(mockedListBackups).toHaveBeenCalled();
            expect(response.body.count).toBe(1);
            expect(response.body.backups[0].filename).toBe('backup-test.zip');
        });
    });

    describe('GET /api/settings/backups/:filename/download', () => {
        it('should return 404 when the listed backup file is missing on disk', async () => {
            const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hr-ims-backup-'));

            mockedGetSettings.mockResolvedValueOnce({
                ...baseSettings,
                backupStoragePath: tempDir,
            } as any);
            mockedListBackups.mockResolvedValueOnce([
                {
                    filename: 'backup-missing.zip',
                    path: path.join(tempDir, 'backup-missing.zip'),
                    size: 1024,
                    createdAt: new Date('2026-03-18T00:00:00.000Z'),
                },
            ]);

            try {
                const response = await request(app)
                    .get('/api/settings/backups/backup-missing.zip/download')
                    .expect(404);

                expect(response.body.error).toBe('Backup not found');
            } finally {
                await fs.rm(tempDir, { recursive: true, force: true });
            }
        });
    });

    describe('POST /api/settings/restore', () => {
        it('should restore a backup through the service layer', async () => {
            const response = await request(app)
                .post('/api/settings/restore')
                .send({ backupPath: 'backup-test.zip' })
                .expect(200);

            expect(mockedRestoreBackup).toHaveBeenCalledWith(path.resolve(path.resolve(__dirname, '../..', '..'), 'backups', 'backup-test.zip'));
            expect(response.body.success).toBe(true);
            expect(response.body.backup.uploadsRestored).toBe(true);
        });

        it('should return 404 when restore service reports a missing backup', async () => {
            mockedRestoreBackup.mockResolvedValueOnce({
                success: false,
                status: 'not_found',
                restoredPath: 'D:/backups/backup-missing.zip',
                error: 'Backup file not found',
            });

            const response = await request(app)
                .post('/api/settings/restore')
                .send({ backupPath: 'backup-missing.zip' })
                .expect(404);

            expect(response.body.error).toBe('Backup file not found');
        });
    });

    describe('DELETE /api/settings/cache', () => {
        it('should clear caches', async () => {
            const response = await request(app)
                .delete('/api/settings/cache')
                .expect(200);

            expect(mockedResetCache).toHaveBeenCalled();
            expect(mockedCacheFlush).toHaveBeenCalled();
            expect(response.body.success).toBe(true);
        });
    });
});
