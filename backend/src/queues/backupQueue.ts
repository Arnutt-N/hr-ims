import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { createBackup } from '../services/backupService';
import { logError, logInfo } from '../utils/logger';
import { getBackupSettings, isFeatureEnabled } from '../utils/settings';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

// Create the backup queue
export const backupQueue = new Queue('backup-queue', { connection: connection as any });

console.log('💾 Backup Queue Initialized');

export const backupWorker = new Worker(
    'backup-queue',
    async (job: Job) => {
        const enabled = await isFeatureEnabled('backup');
        if (!enabled) {
            console.log('Backup job is disabled');
            return null;
        }

        console.log('Running scheduled backup via BullMQ...');
        const result = await createBackup();

        if (result.success) {
            await logInfo('Scheduled backup completed', {
                filename: result.filename,
                size: result.size
            });
            return result;
        } else {
            throw new Error(result.error || 'Backup failed');
        }
    },
    { connection: connection as any, concurrency: 1 } // Only run 1 backup at a time!
);

backupWorker.on('completed', (job, result) => {
    if (result) {
        logInfo(`Backup job ${job.id} completed successfully`);
    }
});

backupWorker.on('failed', (job, err) => {
    logError(`Backup job ${job?.id} failed`, err);
});

export async function scheduleBackupJob() {
    // Clear any existing repeatable jobs
    const repeatableJobs = await backupQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
        await backupQueue.removeRepeatableByKey(job.key);
    }

    const enabled = await isFeatureEnabled('backup');
    if (!enabled) return;

    const settings = await getBackupSettings();
    if (!settings.schedule) return;

    // Add a new repeatable job
    await backupQueue.add('automated-backup', {}, {
        repeat: {
            pattern: settings.schedule,
        }
    });

    console.log(`Backup job scheduled in BullMQ: ${settings.schedule}`);
}
