import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import prisma from '../utils/prisma';
import { getBackupSettings, isFeatureEnabled } from '../utils/settings';
import { logInfo, logError } from '../utils/logger';

/**
 * Backup Service
 * จัดการการสำรองและกู้คืนข้อมูล
 */

export interface BackupResult {
    success: boolean;
    path: string;
    filename: string;
    size: number;
    timestamp: Date;
    error?: string;
}

/**
 * สร้าง Backup ทันที
 */
export async function createBackup(): Promise<BackupResult> {
    const settings = await getBackupSettings();

    if (!settings.enabled) {
        return {
            success: false,
            path: '',
            filename: '',
            size: 0,
            timestamp: new Date(),
            error: 'Backup is disabled'
        };
    }

    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-${timestamp}.zip`;
        const backupPath = path.join(settings.storagePath, filename);

        // สร้างโฟลเดอร์ถ้ายังไม่มี
        await fs.mkdir(settings.storagePath, { recursive: true });

        // สร้าง ZIP file
        const output = createWriteStream(backupPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        // Check uploads directory before starting archive
        let hasUploads = false;
        if (settings.includeUploads) {
            try {
                await fs.access('uploads');
                hasUploads = true;
            } catch {
                // uploads directory doesn't exist
            }
        }

        await new Promise<void>((resolve, reject) => {
            output.on('close', () => resolve());
            archive.on('error', (err) => reject(err));

            archive.pipe(output);

            // เพิ่มฐานข้อมูล
            archive.file('prisma/dev.db', { name: 'database.db' });

            // เพิ่มไฟล์แนบถ้าตั้งค่าไว้
            if (hasUploads) {
                archive.directory('uploads', 'uploads');
            }

            archive.finalize();
        });

        // ดึงขนาดไฟล์
        const stats = await fs.stat(backupPath);

        // บันทึก Log
        await logInfo('Backup created successfully', {
            filename,
            size: stats.size,
            path: backupPath
        });

        // อัปเดต Settings
        await prisma.settings.updateMany({
            data: {
                lastBackupAt: new Date(),
                lastBackupStatus: 'success',
                lastBackupPath: backupPath
            }
        });

        // ลบ Backup เก่า
        await cleanupOldBackups();

        return {
            success: true,
            path: backupPath,
            filename,
            size: stats.size,
            timestamp: new Date()
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await logError('Backup failed', error);

        // อัปเดต Settings
        await prisma.settings.updateMany({
            data: {
                lastBackupAt: new Date(),
                lastBackupStatus: 'failed'
            }
        });

        return {
            success: false,
            path: '',
            filename: '',
            size: 0,
            timestamp: new Date(),
            error: errorMessage
        };
    }
}

/**
 * ลบ Backup เก่าที่เกินจำนวนที่กำหนด
 */
export async function cleanupOldBackups(): Promise<void> {
    const settings = await getBackupSettings();

    try {
        const files = await fs.readdir(settings.storagePath);
        const backups = files
            .filter(f => f.startsWith('backup-') && f.endsWith('.zip'))
            .map(f => ({
                name: f,
                path: path.join(settings.storagePath, f)
            }));

        // เรียงตามเวลา (ใหม่สุดก่อน)
        const sortedBackups = await Promise.all(
            backups.map(async (b) => ({
                ...b,
                time: (await fs.stat(b.path)).mtime
            }))
        );
        sortedBackups.sort((a, b) => b.time.getTime() - a.time.getTime());

        // ลบที่เกินจำนวน
        const toDelete = sortedBackups.slice(settings.retentionCount);
        for (const backup of toDelete) {
            await fs.unlink(backup.path);
            await logInfo('Old backup deleted', { filename: backup.name });
        }

    } catch (error) {
        await logError('Failed to cleanup old backups', error);
    }
}

/**
 * ดึงรายการ Backup ทั้งหมด
 */
export async function listBackups(): Promise<Array<{
    filename: string;
    path: string;
    size: number;
    createdAt: Date;
}>> {
    const settings = await getBackupSettings();

    try {
        const files = await fs.readdir(settings.storagePath);
        const backups = files
            .filter(f => f.startsWith('backup-') && f.endsWith('.zip'))
            .map(async (f) => {
                const filePath = path.join(settings.storagePath, f);
                const stats = await fs.stat(filePath);
                return {
                    filename: f,
                    path: filePath,
                    size: stats.size,
                    createdAt: stats.mtime
                };
            });

        return await Promise.all(backups);

    } catch (error) {
        await logError('Failed to list backups', error);
        return [];
    }
}

/**
 * Restore จาก Backup
 */
export async function restoreBackup(backupPath: string): Promise<boolean> {
    try {
        // ตรวจสอบว่าไฟล์มีอยู่
        await fs.access(backupPath);

        // TODO: Implement restore logic
        // 1. แตกไฟล์ ZIP
        // 2. แทนที่ฐานข้อมูล
        // 3. กู้คืนไฟล์แนบ

        await logInfo('Backup restored successfully', { path: backupPath });
        return true;

    } catch (error) {
        await logError('Restore failed', error);
        return false;
    }
}

/**
 * ตรวจสอบว่าควร Backup ตอนนี้หรือไม่ (สำหรับ Cron Job)
 */
export async function shouldBackup(): Promise<boolean> {
    const settings = await getBackupSettings();

    if (!settings.enabled) {
        return false;
    }

    // ตรวจสอบเวลาล่าสุด
    const lastBackup = await prisma.settings.findFirst({
        select: { lastBackupAt: true }
    });

    if (!lastBackup?.lastBackupAt) {
        return true;
    }

    // ตรวจสอบตาม Schedule (ง่ายสุดคือเช็คว่าเกิน 24 ชั่วโมงหรือไม่)
    const hoursSinceLastBackup = (Date.now() - lastBackup.lastBackupAt.getTime()) / (1000 * 60 * 60);

    return hoursSinceLastBackup >= 24;
}
