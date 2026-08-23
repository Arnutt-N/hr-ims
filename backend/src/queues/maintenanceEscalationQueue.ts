/**
 * Maintenance escalation cron (PRP v6 Phase 5 โ€” Q16).
 *
 * Runs hourly (configurable via MAINTENANCE_ESCALATION_CRON env). Finds
 * MaintenanceRequest rows where:
 *   - assignedToId IS NOT NULL  (someone owns it)
 *   - status === 'open'         (no actual work started โ€” assignee idle)
 *   - now() - assignedAt > 24hr
 *   - escalatedAt IS NULL        (not yet escalated โ€” idempotency guard)
 *
 * For each match (in a single $transaction):
 *   - Set escalatedAt = now()
 *   - Insert MaintenanceLog action='escalated'
 *   - Notify admin in-app via Notification table
 *   - Fire Telegram alert via sendEscalationAlert (env-gated)
 *
 * Idempotent: re-running the cron in the same hour processes only newly-
 * eligible requests (escalatedAt IS NULL filter).
 */

import { Queue, Worker, Job } from 'bullmq';
import prisma from '../utils/prisma';
import { logError, logInfo } from '../utils/logger';
import { sendEscalationAlert } from '../services/maintenanceTelegramService';
import { createQueueConnection } from '../utils/queueConnection';

// [2026-08-23] Modified by Cline: switched to shared queue connection factory;
// typing workaround centralized inside the factory itself (review #21/#22 followup)
const connection = createQueueConnection();

const ESCALATION_THRESHOLD_HOURS = 24;
const DEFAULT_CRON = '0 * * * *'; // hourly at :00

export const maintenanceEscalationQueue = new Queue('maintenance-escalation-queue', {
    connection: connection,
});

console.log('๐”ง Maintenance Escalation Queue Initialized');

export const maintenanceEscalationWorker = new Worker(
    'maintenance-escalation-queue',
    async (job: Job) => {
        const cutoff = new Date(Date.now() - ESCALATION_THRESHOLD_HOURS * 60 * 60 * 1000);

        const eligible = await prisma.maintenanceRequest.findMany({
            where: {
                assignedToId: { not: null },
                status: 'open',
                assignedAt: { lt: cutoff },
                escalatedAt: null,
                deletedAt: null,
            },
            include: {
                assignedTo: { select: { id: true, name: true } },
            },
        });

        if (eligible.length === 0) {
            return { processed: 0 };
        }

        await logInfo(`[escalation] processing ${eligible.length} stale request(s)`);

        // Process sequentially to keep transaction logs clean โ€” count is small.
        let escalated = 0;
        for (const req of eligible) {
            try {
                const now = new Date();
                const hoursOverdue = req.assignedAt
                    ? (now.getTime() - req.assignedAt.getTime()) / (60 * 60 * 1000)
                    : 0;

                await prisma.$transaction(async (tx) => {
                    await tx.maintenanceRequest.update({
                        where: { id: req.id },
                        data: { escalatedAt: now },
                    });
                    await tx.maintenanceLog.create({
                        data: {
                            requestId: req.id,
                            userId: req.reportedById, // attribution: system event uses reporter
                            action: 'escalated',
                            notes: `Auto-escalated after ${hoursOverdue.toFixed(1)}hr inactivity`,
                        },
                    });

                    // Notify all admin/superadmin users
                    const admins = await tx.user.findMany({
                        where: {
                            OR: [
                                { role: 'admin' },
                                { role: 'superadmin' },
                                { userRoles: { some: { role: { slug: { in: ['admin', 'superadmin'] } } } } },
                            ],
                        },
                        select: { id: true },
                    });
                    if (admins.length > 0) {
                        await tx.notification.createMany({
                            data: admins.map((a) => ({
                                userId: a.id,
                                text: `เธฃเธฒเธขเธเธฒเธเธเนเธญเธก #${req.id} เธเนเธฒเธเน€เธเธดเธ ${hoursOverdue.toFixed(0)} เธเธก. โ€” เธเธฃเธธเธ“เธฒเธกเธญเธเธซเธกเธฒเธขเนเธซเธกเนเธซเธฃเธทเธญเธ•เธดเธ”เธ•เธฒเธก`,
                            })),
                        });
                    }
                });

                // Fire Telegram alert (best-effort, env-gated)
                await sendEscalationAlert({
                    requestId: req.id,
                    title: req.title,
                    severity: req.severity,
                    assigneeName: req.assignedTo?.name ?? 'Unknown',
                    hoursOverdue,
                });

                escalated += 1;
            } catch (err) {
                await logError(`[escalation] failed to process request #${req.id}`, err as Error);
            }
        }

        await logInfo(`[escalation] escalated ${escalated} request(s)`);
        return { processed: eligible.length, escalated };
    },
    { connection: connection, concurrency: 1 },
);

maintenanceEscalationWorker.on('completed', (job, result) => {
    if ((result?.escalated ?? 0) > 0) {
        logInfo(`Maintenance escalation job ${job.id}: escalated ${result?.escalated}`);
    }
});

maintenanceEscalationWorker.on('failed', (job, err) => {
    logError(`Maintenance escalation job ${job?.id} failed`, err);
});

export async function scheduleMaintenanceEscalation() {
    // Clear existing repeatable jobs (idempotent on app restart)
    const repeatableJobs = await maintenanceEscalationQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
        await maintenanceEscalationQueue.removeRepeatableByKey(job.key);
    }

    const pattern = process.env.MAINTENANCE_ESCALATION_CRON || DEFAULT_CRON;

    await maintenanceEscalationQueue.add('escalation-tick', {}, {
        repeat: { pattern },
    });

    console.log(`Maintenance escalation scheduled in BullMQ: ${pattern}`);
}
