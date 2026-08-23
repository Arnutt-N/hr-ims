/**
 * Dedicated BullMQ background-worker entry point.
 *
 * [2026-08-23] Modified by Cline: Wired maintenanceEscalationQueue into the
 * BullMQ bootstrap (AGENTS.md section 6 High Priority #1). This process hosts
 * every background worker - run it alongside (not inside) the API server:
 *
 *   production : npm run start:worker   -> node dist/worker.js
 *   development: npm run dev:worker     -> nodemon src/worker.ts
 *
 * Queue modules instantiate their own Queue/Worker objects at import time;
 * this file only loads env, registers repeatable schedulers, and owns the
 * process lifecycle (enable flag + graceful shutdown).
 */

import dotenv from 'dotenv';

// Load .env BEFORE requiring queue modules - they read process.env.REDIS_URL
// at module scope, and TypeScript hoists static imports above this call.
dotenv.config();

const {
    maintenanceEscalationQueue,
    maintenanceEscalationWorker,
    scheduleMaintenanceEscalation,
} = require('./queues/maintenanceEscalationQueue');
const {
    backupQueue,
    backupWorker,
    scheduleBackupJob,
} = require('./queues/backupQueue');
const { emailQueue, emailWorker } = require('./queues/emailQueue');

async function bootstrap() {
    console.log('🚀 HR-IMS background worker starting...');

    // Repeatable schedulers clear their existing repeatable jobs before
    // re-adding, so restarts never duplicate cron entries.
    await scheduleMaintenanceEscalation();
    await scheduleBackupJob();

    console.log('✅ Workers online: maintenance-escalation | backup | email');
}

async function shutdown(signal: string) {
    console.log(`\n${signal} received — draining workers & closing queues...`);

    // Force-exit fallback so a wedged Redis connection cannot hang the process.
    const forceExit = setTimeout(() => {
        console.error('Graceful shutdown timed out — forcing exit');
        process.exit(1);
    }, 10000);

    try {
        // Worker.close() lets in-flight jobs finish before detaching.
        await Promise.allSettled([
            maintenanceEscalationWorker.close(),
            backupWorker.close(),
            emailWorker.close(),
            maintenanceEscalationQueue.close(),
            backupQueue.close(),
            emailQueue.close(),
        ]);
        clearTimeout(forceExit);
        console.log('👋 All workers drained — exiting');
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }
}

if (require.main === module) {
    if (process.env.WORKER_ENABLED === 'false') {
        console.log('WORKER_ENABLED=false — background worker disabled, exiting.');
        process.exit(0);
    }

    bootstrap().catch((err) => {
        console.error('❌ Failed to bootstrap background worker:', err);
        process.exit(1);
    });

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
}
