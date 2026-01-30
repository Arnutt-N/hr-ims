import * as cron from 'node-cron';
import { createBackup, shouldBackup } from '../services/backupService';
import { getBackupSettings, isFeatureEnabled } from '../utils/settings';
import { logInfo, logError } from '../utils/logger';

/**
 * Backup Cron Job
 * รันตาม Schedule ที่กำหนดใน Settings
 */

let backupTask: ReturnType<typeof cron.schedule> | null = null;

/**
 * เริ่มต้น Backup Job
 */
export async function startBackupJob(): Promise<void> {
    // หยุด Task เดิมถ้ามี
    stopBackupJob();

    const enabled = await isFeatureEnabled('backup');
    if (!enabled) {
        console.log('Backup job is disabled');
        return;
    }

    const settings = await getBackupSettings();

    // สร้าง Cron Task
    backupTask = cron.schedule(settings.schedule, async () => {
        console.log('Running scheduled backup...');

        try {
            const shouldRun = await shouldBackup();
            if (!shouldRun) {
                console.log('Skipping backup - not due yet');
                return;
            }

            const result = await createBackup();

            if (result.success) {
                await logInfo('Scheduled backup completed', {
                    filename: result.filename,
                    size: result.size
                });
            } else {
                await logError('Scheduled backup failed', result.error);
            }

        } catch (error) {
            await logError('Backup job error', error);
        }
    });

    await logInfo('Backup job started', { schedule: settings.schedule });
    console.log(`Backup job scheduled: ${settings.schedule}`);
}

/**
 * หยุด Backup Job
 */
export function stopBackupJob(): void {
    if (backupTask) {
        backupTask.stop();
        backupTask = null;
        console.log('Backup job stopped');
    }
}

/**
 * รีสตาร์ท Backup Job (ใช้เมื่อมีการอัปเดต Settings)
 */
export async function restartBackupJob(): Promise<void> {
    stopBackupJob();
    await startBackupJob();
}

/**
 * ตรวจสอบสถานะ Backup Job
 */
export function isBackupJobRunning(): boolean {
    return backupTask !== null;
}
