import type { Prisma } from '@prisma/client';

/**
 * Fan-out helper: notify all watchers of a request (excluding the actor)
 * about a state change. Called inside the same `prisma.$transaction` as
 * the mutation so the notifications are atomic with the state change.
 *
 * Threshold: at small scale (≤50 watchers) inline createMany is fine.
 * Above that, callers should enqueue via BullMQ instead — but maintenance
 * watcher counts in this app are expected to stay small (per-request
 * subscribers, not org-wide), so we don't optimize prematurely.
 *
 * PRP v6 Phase 6 — Q20.
 */
export async function fanOutToWatchers(
    tx: Prisma.TransactionClient,
    requestId: number,
    actorUserId: number,
    notificationText: string,
): Promise<number> {
    const watchers = await tx.maintenanceRequestWatcher.findMany({
        where: { requestId, userId: { not: actorUserId } },
        select: { userId: true },
    });

    if (watchers.length === 0) return 0;

    await tx.notification.createMany({
        data: watchers.map((w) => ({
            userId: w.userId,
            text: notificationText,
        })),
    });

    return watchers.length;
}
