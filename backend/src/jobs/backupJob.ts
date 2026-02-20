import { logInfo } from '../utils/logger';
import { backupQueue, scheduleBackupJob } from '../queues/backupQueue';

/**
 * Backup Job Management (Migrated to BullMQ)
 */

export async function startBackupJob(): Promise<void> {
    await scheduleBackupJob();
    await logInfo('Backup job started via BullMQ');
}

export async function stopBackupJob(): Promise<void> {
    const repeatableJobs = await backupQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
        await backupQueue.removeRepeatableByKey(job.key);
    }
    console.log('Backup jobs cleared from BullMQ');
}

export async function restartBackupJob(): Promise<void> {
    await stopBackupJob();
    await startBackupJob();
}

export async function isBackupJobRunning(): Promise<boolean> {
    const repeatableJobs = await backupQueue.getRepeatableJobs();
    return repeatableJobs.length > 0;
}
