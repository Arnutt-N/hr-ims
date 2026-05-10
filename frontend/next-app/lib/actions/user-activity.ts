'use server';

import prisma from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@/auth';
import { requireRole, ADMIN_ROLES } from '@/lib/auth-guards';

/**
 * getUserActivity — chronological MaintenanceLog feed for a single user.
 * PRP v6 Phase 6 — Q21.
 *
 * Auth scope:
 *   - Own profile (any logged-in user)
 *   - Anyone (admin/superadmin/auditor)
 *
 * Returns log entries ordered DESC by createdAt with the related
 * MaintenanceRequest title + status, and item name when itemId is set.
 */

const FiltersSchema = z.object({
    actionType: z.string().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    limit: z.number().int().min(1).max(200).optional(),
    offset: z.number().int().min(0).optional(),
}).optional();

export async function getUserActivity(userId: number, filters?: unknown) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    if (!Number.isInteger(userId) || userId <= 0) {
        return { error: 'Invalid userId' };
    }

    const actorId = Number.parseInt(session.user.id, 10);
    const isOwnProfile = actorId === userId;

    if (!isOwnProfile) {
        const adminish = await requireRole(...ADMIN_ROLES, 'auditor');
        if (!adminish) return { error: 'Forbidden — own profile or admin/auditor only' };
    }

    const parsed = FiltersSchema.safeParse(filters);
    if (!parsed.success) return { error: 'Invalid filters', issues: parsed.error.format() };
    const f = parsed.data ?? {};

    try {
        const where: Record<string, unknown> = { userId };
        if (f.actionType) where.action = f.actionType;
        if (f.dateFrom || f.dateTo) {
            where.createdAt = {
                ...(f.dateFrom ? { gte: f.dateFrom } : {}),
                ...(f.dateTo ? { lte: f.dateTo } : {}),
            };
        }

        const logs = await prisma.maintenanceLog.findMany({
            where: where as never,
            include: {
                request: { select: { id: true, title: true, status: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: f.limit ?? 50,
            skip: f.offset ?? 0,
        });

        // Resolve item names for log entries that reference items
        const itemIds = Array.from(
            new Set(logs.map((l) => l.itemId).filter((id): id is number => id !== null)),
        );
        const items =
            itemIds.length > 0
                ? await prisma.inventoryItem.findMany({
                      where: { id: { in: itemIds } },
                      select: { id: true, name: true },
                  })
                : [];
        const itemMap = new Map(items.map((i) => [i.id, i]));

        const enriched = logs.map((l) => ({
            ...l,
            item: l.itemId !== null ? itemMap.get(l.itemId) ?? null : null,
        }));

        return { success: true, logs: enriched };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('getUserActivity failed:', message);
        return { error: message };
    }
}
