'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';

/**
 * MaintenanceRequestWatcher Server Actions (PRP v6 Phase 6 — Q20).
 *
 * Watch subscriptions allow any logged-in user to follow a request and
 * receive in-app notifications on every state change. The fan-out is
 * implemented in maintenance.ts state-change actions (next commit).
 */

const RequestIdSchema = z.object({ requestId: z.number().int().positive() });

/**
 * Subscribe current user to request notifications.
 * Idempotent: returns success even if already watching.
 */
export async function watchRequest(input: unknown) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };
    const userId = Number.parseInt(session.user.id, 10);

    const parsed = RequestIdSchema.safeParse(input);
    if (!parsed.success) return { error: 'Invalid input' };
    const { requestId } = parsed.data;

    try {
        // Verify request exists (FK violation otherwise)
        const req = await prisma.maintenanceRequest.findUnique({
            where: { id: requestId },
            select: { id: true },
        });
        if (!req) return { error: 'Request not found' };

        // Idempotent upsert via unique constraint
        await prisma.maintenanceRequestWatcher.upsert({
            where: { userId_requestId: { userId, requestId } },
            update: {},
            create: { userId, requestId },
        });

        revalidatePath(`/maintenance/${requestId}`);
        revalidatePath('/maintenance/watched');
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('watchRequest failed:', message);
        return { error: message };
    }
}

/**
 * Unsubscribe current user. Idempotent: returns success if not currently watching.
 */
export async function unwatchRequest(input: unknown) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };
    const userId = Number.parseInt(session.user.id, 10);

    const parsed = RequestIdSchema.safeParse(input);
    if (!parsed.success) return { error: 'Invalid input' };
    const { requestId } = parsed.data;

    try {
        await prisma.maintenanceRequestWatcher.deleteMany({
            where: { userId, requestId },
        });
        revalidatePath(`/maintenance/${requestId}`);
        revalidatePath('/maintenance/watched');
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('unwatchRequest failed:', message);
        return { error: message };
    }
}

/**
 * List active (non-cancelled) requests the current user watches.
 * Used by /maintenance/watched page and the WatchButton state check.
 */
export async function getMyWatchedRequests() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };
    const userId = Number.parseInt(session.user.id, 10);

    try {
        const watches = await prisma.maintenanceRequestWatcher.findMany({
            where: { userId },
            include: {
                request: {
                    include: {
                        items: {
                            include: {
                                item: { select: { id: true, name: true, serial: true, image: true } },
                            },
                        },
                        reportedBy: { select: { id: true, name: true } },
                        assignedTo: { select: { id: true, name: true } },
                        location: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Filter out requests where the underlying request is null (soft-deleted
        // — Prisma middleware on MaintenanceRequest auto-filters but the
        // watcher row still exists). Map to flat request shape consumed by UI.
        const requests = watches
            .filter((w) => w.request !== null)
            .map((w) => w.request);

        return { success: true, requests };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('getMyWatchedRequests failed:', message);
        return { error: message };
    }
}

/**
 * Check if current user is watching a specific request.
 * Used by WatchButton to render filled vs outlined state.
 */
export async function isWatching(requestId: number): Promise<boolean> {
    const session = await auth();
    if (!session?.user?.id) return false;
    const userId = Number.parseInt(session.user.id, 10);
    if (!Number.isInteger(requestId) || requestId <= 0) return false;

    try {
        const found = await prisma.maintenanceRequestWatcher.findUnique({
            where: { userId_requestId: { userId, requestId } },
            select: { id: true },
        });
        return !!found;
    } catch {
        return false;
    }
}
