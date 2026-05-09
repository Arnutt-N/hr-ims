'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { requireRole, ADMIN_ROLES } from '@/lib/auth-guards';
import { z } from 'zod';
import {
    SEVERITY_LEVELS,
    PRIORITY_LEVELS,
    CATEGORIES,
} from '@/lib/maintenance/types';
import { sendMaintenanceAlert } from '@/lib/maintenance/telegram-service';

// =============================================================================
// MAINTENANCE WORKFLOW (PRP v6 — added 2026-05-09)
// See: PRPs/claude/2026-05-09_104630_claude_plan_maintenance-workflow.md
// =============================================================================

const TAG_PATTERN = /^[a-zA-Z0-9-]+$/;

const CreateMaintenanceRequestSchema = z.object({
    itemIds: z.array(z.number().int().positive()).min(1).max(20),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(5000),
    severity: z.enum(SEVERITY_LEVELS),
    priority: z.enum(PRIORITY_LEVELS).default('normal'),
    category: z.enum(CATEGORIES),
    tags: z
        .array(z.string().trim().min(1).max(32).regex(TAG_PATTERN))
        .max(10)
        .optional(),
    locationId: z.number().int().positive().optional(),
    photoUrls: z
        .array(z.string().url())
        .max(5)
        .optional(),
    estimatedCost: z.number().nonnegative().optional(),
});

export type CreateMaintenanceRequestInput = z.infer<typeof CreateMaintenanceRequestSchema>;

/**
 * Create a new maintenance request (PRP v6 createMaintenanceRequest).
 *
 * Auth: any logged-in user.
 * Side effects (single $transaction):
 *   - Insert MaintenanceRequest (status='open' since no auto-assign yet —
 *     Phase 5 wires CategoryAssigneeRule lookup here)
 *   - Insert N MaintenanceRequestItem rows (each status='open')
 *   - Insert MaintenanceLog (action='created', itemId=null)
 *   - For each item: update inventoryItem.status='issue_reported' (backward compat)
 *   - revalidatePath
 * Post-transaction (best-effort, non-blocking):
 *   - severity === 'critical': fire Telegram alert (env-gated, no-op without secrets)
 */
export async function createMaintenanceRequest(input: unknown) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const parsed = CreateMaintenanceRequestSchema.safeParse(input);
    if (!parsed.success) {
        return { error: 'Invalid input', issues: parsed.error.format() };
    }
    const data = parsed.data;
    const reporterId = Number.parseInt(session.user.id, 10);

    try {
        const created = await prisma.$transaction(async (tx) => {
            // Verify all items exist (otherwise FK violation)
            const items = await tx.inventoryItem.findMany({
                where: { id: { in: data.itemIds } },
                select: { id: true, name: true },
            });
            if (items.length !== data.itemIds.length) {
                throw new Error('One or more items not found');
            }

            // Verify location if provided
            if (data.locationId !== undefined) {
                const dept = await tx.department.findUnique({
                    where: { id: data.locationId },
                    select: { id: true },
                });
                if (!dept) throw new Error('Location (department) not found');
            }

            const request = await tx.maintenanceRequest.create({
                data: {
                    reportedById: reporterId,
                    locationId: data.locationId ?? null,
                    title: data.title,
                    description: data.description,
                    severity: data.severity,
                    priority: data.priority,
                    category: data.category,
                    tags: data.tags ? JSON.stringify(data.tags) : null,
                    photos: data.photoUrls ? JSON.stringify(data.photoUrls) : null,
                    estimatedCost: data.estimatedCost ?? null,
                    status: 'open',
                    items: {
                        create: data.itemIds.map((itemId) => ({
                            itemId,
                            status: 'open',
                        })),
                    },
                    logs: {
                        create: [
                            {
                                userId: reporterId,
                                action: 'created',
                                toStatus: 'open',
                            },
                        ],
                    },
                },
                include: {
                    items: { include: { item: { select: { id: true, name: true } } } },
                    reportedBy: { select: { id: true, name: true } },
                },
            });

            // Backward-compat: sync inventoryItem.status (legacy /maintenance dashboard reads this)
            await tx.inventoryItem.updateMany({
                where: { id: { in: data.itemIds } },
                data: { status: 'issue_reported' },
            });

            return request;
        });

        // Fire-and-forget Telegram alert for critical severity (env-gated)
        if (data.severity === 'critical') {
            void sendMaintenanceAlert({
                requestId: created.id,
                title: created.title,
                description: created.description,
                severity: 'critical',
                reporterName: created.reportedBy.name ?? 'Unknown',
                itemNames: created.items.map((i) => i.item.name),
                locationName: null, // resolve to dept name in a future commit if needed
            });
        }

        revalidatePath('/maintenance');
        revalidatePath('/inventory');
        revalidatePath('/my-assets');

        return { success: true, request: created };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('createMaintenanceRequest failed:', message);
        return { error: `Failed to create request: ${message}` };
    }
}

export async function getMaintenanceItems() {
    const session = await requireRole(...ADMIN_ROLES, 'technician');
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const items = await prisma.inventoryItem.findMany({
            where: {
                OR: [
                    { status: 'maintenance' },
                    { status: 'issue_reported' }
                ]
            },
            include: {
                currentHolder: {
                    select: {
                        name: true,
                        department: true
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        return { success: true, items };
    } catch (error) {
        console.error('Failed to fetch maintenance items:', error);
        return { error: 'Failed to fetch items' };
    }
}

export async function updateMaintenanceStatus(
    id: number,
    status: string,
    repairNotes?: string
) {
    // Use ADMIN_ROLES (admin + superadmin) instead of hard-coded 'admin'
    // string comparison, which silently blocked superadmin users from
    // updating maintenance status because their token role is 'superadmin'
    // not 'admin'.
    const session = await requireRole(...ADMIN_ROLES);
    if (!session) {
        return { error: 'Unauthorized - Admin only' };
    }

    try {
        await prisma.inventoryItem.update({
            where: { id },
            data: {
                status,
                repairNotes,
                currentHolderId: status === 'available' ? null : undefined // Release holder if fixed
            }
        });

        // Log history
        await prisma.history.create({
            data: {
                userId: parseInt(session.user.id || '0'),
                action: 'maintenance_update',
                item: `Item #${id}`,
                status: status + (repairNotes ? ` - ${repairNotes}` : '')
            }
        });

        revalidatePath('/maintenance');
        revalidatePath('/inventory');
        return { success: true };
    } catch (error) {
        console.error('Failed to update status:', error);
        return { error: 'Failed to update status' };
    }
}

// =============================================================================
// State mutation actions (Phase 2 commit #5)
// =============================================================================

import { assertValidItemTransition, IllegalItemTransitionError } from '@/lib/maintenance/transitions';
import { assertItemVersion, OptimisticLockError } from '@/lib/maintenance/optimistic-lock';
import { computeRequestStatus } from '@/lib/maintenance/aggregate';
import type { ItemStatus } from '@/lib/maintenance/types';

const AssignSchema = z.object({
    requestId: z.number().int().positive(),
    assigneeUserId: z.number().int().positive(),
});

/**
 * Admin assigns a request to a technician (PRP v6 assignMaintenanceRequest).
 *
 * Auth: admin | superadmin
 * Validates: assignee has admin/superadmin/technician role; request not
 * resolved/closed/cancelled (terminal states can't be reassigned).
 */
export async function assignMaintenanceRequest(input: unknown) {
    const session = await requireRole(...ADMIN_ROLES);
    if (!session?.user?.id) return { error: 'Unauthorized - Admin only' };

    const parsed = AssignSchema.safeParse(input);
    if (!parsed.success) return { error: 'Invalid input', issues: parsed.error.format() };
    const { requestId, assigneeUserId } = parsed.data;
    const actorId = Number.parseInt(session.user.id, 10);

    try {
        await prisma.$transaction(async (tx) => {
            const req = await tx.maintenanceRequest.findUnique({
                where: { id: requestId },
                include: { items: { select: { status: true } } },
            });
            if (!req) throw new Error('Request not found');
            if (['resolved', 'closed', 'cancelled'].includes(req.status)) {
                throw new Error(`Cannot assign request in terminal state: ${req.status}`);
            }

            // Verify assignee has the right role(s)
            const assignee = await tx.user.findUnique({
                where: { id: assigneeUserId },
                include: { userRoles: { include: { role: true } } },
            });
            if (!assignee) throw new Error('Assignee not found');
            const assigneeRoles = assignee.userRoles.map((ur) => ur.role.slug);
            const eligible = assigneeRoles.some((r) =>
                ['admin', 'superadmin', 'technician'].includes(r),
            );
            if (!eligible) {
                throw new Error('Assignee must have admin, superadmin, or technician role');
            }

            const fromStatus = req.status;
            const newAggregate = computeRequestStatus(
                req.items.map((i) => ({ status: i.status as ItemStatus })),
                assigneeUserId,
                false,
            );

            await tx.maintenanceRequest.update({
                where: { id: requestId },
                data: {
                    assignedToId: assigneeUserId,
                    assignedAt: req.assignedAt ?? new Date(), // preserve original if reassigning
                    status: newAggregate,
                },
            });

            await tx.maintenanceLog.create({
                data: {
                    requestId,
                    userId: actorId,
                    action: 'assigned',
                    fromStatus,
                    toStatus: newAggregate,
                },
            });
        });

        revalidatePath('/maintenance');
        revalidatePath(`/maintenance/${requestId}`);
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('assignMaintenanceRequest failed:', message);
        return { error: message };
    }
}

const UpdateItemStatusSchema = z.object({
    requestId: z.number().int().positive(),
    itemId: z.number().int().positive(), // MaintenanceRequestItem.id
    expectedVersion: z.number().int().nonnegative(),
    newStatus: z.enum(['in_progress', 'awaiting_parts', 'resolved', 'cancelled']),
    resolution: z.string().trim().min(1).max(2000).optional(),
    actualCost: z.number().nonnegative().optional(),
    notes: z.string().trim().max(2000).optional(),
});

/**
 * Technician updates an item's state (PRP v6 updateMaintenanceItemStatus).
 *
 * Auth: request.assignedTo === session.user.id OR admin/superadmin
 * Validates:
 *   - state transition legal (per ALLOWED_ITEM_TRANSITIONS)
 *   - newStatus='resolved' requires non-empty resolution
 *   - optimistic lock: expectedVersion must match current
 * Side effects:
 *   - Update MaintenanceRequestItem (status, resolution, actualCost,
 *     resolvedAt, version+=1)
 *   - Insert MaintenanceLog with appropriate action
 *   - Recompute request.status via computeRequestStatus
 *   - On 'cancelled': sync inventoryItem.status='available' (backward compat)
 *     (resolved items still pending verification — not synced yet)
 */
export async function updateMaintenanceItemStatus(input: unknown) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };
    const actorId = Number.parseInt(session.user.id, 10);

    const parsed = UpdateItemStatusSchema.safeParse(input);
    if (!parsed.success) return { error: 'Invalid input', issues: parsed.error.format() };
    const data = parsed.data;

    if (data.newStatus === 'resolved' && !data.resolution) {
        return { error: 'Resolution text required when marking item as resolved' };
    }

    try {
        await prisma.$transaction(async (tx) => {
            // Fetch request + the specific item
            const item = await tx.maintenanceRequestItem.findUnique({
                where: { id: data.itemId },
                include: { request: true, item: { select: { id: true } } },
            });
            if (!item || item.requestId !== data.requestId) {
                throw new Error('Item not found in this request');
            }

            // Auth check: assignee or admin
            const isAssignee = item.request.assignedToId === actorId;
            const adminSession = await requireRole(...ADMIN_ROLES);
            if (!isAssignee && !adminSession) {
                throw new Error('Forbidden — assignee or admin only');
            }

            // Transition validation
            assertValidItemTransition(item.status as ItemStatus, data.newStatus);

            // Optimistic lock
            await assertItemVersion(tx, data.itemId, data.expectedVersion);

            const fromStatus = item.status;

            // Update the item
            const updateData: {
                status: ItemStatus;
                version: { increment: number };
                resolution?: string;
                actualCost?: number;
                resolvedAt?: Date | null;
            } = {
                status: data.newStatus,
                version: { increment: 1 },
            };
            if (data.newStatus === 'resolved') {
                updateData.resolution = data.resolution;
                updateData.resolvedAt = new Date();
                if (data.actualCost !== undefined) updateData.actualCost = data.actualCost;
            }
            await tx.maintenanceRequestItem.update({
                where: { id: data.itemId },
                data: updateData,
            });

            // Determine log action label
            let logAction: string = 'status_changed';
            if (data.newStatus === 'awaiting_parts') logAction = 'item_marked_awaiting_parts';
            else if (fromStatus === 'awaiting_parts' && data.newStatus === 'in_progress')
                logAction = 'item_resumed_work';
            else if (data.newStatus === 'resolved') logAction = 'item_resolved';
            else if (data.newStatus === 'cancelled') logAction = 'cancelled';

            await tx.maintenanceLog.create({
                data: {
                    requestId: data.requestId,
                    itemId: item.item.id, // InventoryItem.id, not join row id
                    userId: actorId,
                    action: logAction,
                    fromStatus,
                    toStatus: data.newStatus,
                    notes: data.notes ?? data.resolution ?? null,
                },
            });

            // Recompute aggregate request status
            const allItems = await tx.maintenanceRequestItem.findMany({
                where: { requestId: data.requestId },
                select: { status: true },
            });
            const newAggregate = computeRequestStatus(
                allItems.map((i) => ({ status: i.status as ItemStatus })),
                item.request.assignedToId,
                item.request.status === 'cancelled',
            );

            const requestUpdate: {
                status: string;
                resolvedAt?: Date;
            } = { status: newAggregate };
            if (newAggregate === 'resolved' && !item.request.resolvedAt) {
                requestUpdate.resolvedAt = new Date();
                await tx.maintenanceLog.create({
                    data: {
                        requestId: data.requestId,
                        userId: actorId,
                        action: 'request_resolved',
                        toStatus: 'resolved',
                    },
                });
            }
            await tx.maintenanceRequest.update({
                where: { id: data.requestId },
                data: requestUpdate,
            });

            // Backward compat: cancelled items free up inventory
            if (data.newStatus === 'cancelled') {
                await tx.inventoryItem.update({
                    where: { id: item.item.id },
                    data: { status: 'available' },
                });
            }
        });

        revalidatePath('/maintenance');
        revalidatePath(`/maintenance/${data.requestId}`);
        revalidatePath('/inventory');
        return { success: true };
    } catch (error) {
        if (error instanceof OptimisticLockError) {
            return { error: error.message, code: 'OPTIMISTIC_LOCK' };
        }
        if (error instanceof IllegalItemTransitionError) {
            return { error: error.message, code: 'ILLEGAL_TRANSITION' };
        }
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('updateMaintenanceItemStatus failed:', message);
        return { error: message };
    }
}

// =============================================================================
// Reporter approval flow (Phase 2 commit #6) — PRP v6 Q9
// =============================================================================

const ApproveItemSchema = z.object({
    requestId: z.number().int().positive(),
    itemId: z.number().int().positive(),
    expectedVersion: z.number().int().nonnegative(),
});

/**
 * Reporter (or admin) verifies a resolved item → moves to closed.
 * Auth: request.reportedBy === session.user.id OR admin/superadmin
 */
export async function approveItemResolution(input: unknown) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };
    const actorId = Number.parseInt(session.user.id, 10);

    const parsed = ApproveItemSchema.safeParse(input);
    if (!parsed.success) return { error: 'Invalid input', issues: parsed.error.format() };
    const data = parsed.data;

    try {
        await prisma.$transaction(async (tx) => {
            const item = await tx.maintenanceRequestItem.findUnique({
                where: { id: data.itemId },
                include: { request: true, item: { select: { id: true } } },
            });
            if (!item || item.requestId !== data.requestId) {
                throw new Error('Item not found in this request');
            }

            const isReporter = item.request.reportedById === actorId;
            const adminSession = await requireRole(...ADMIN_ROLES);
            if (!isReporter && !adminSession) {
                throw new Error('Forbidden - reporter or admin only');
            }

            if (item.status !== 'resolved') {
                throw new Error(`Cannot approve item in status: ${item.status}`);
            }

            assertValidItemTransition('resolved', 'closed');
            await assertItemVersion(tx, data.itemId, data.expectedVersion);

            await tx.maintenanceRequestItem.update({
                where: { id: data.itemId },
                data: {
                    status: 'closed',
                    closedAt: new Date(),
                    version: { increment: 1 },
                },
            });

            await tx.maintenanceLog.create({
                data: {
                    requestId: data.requestId,
                    itemId: item.item.id,
                    userId: actorId,
                    action: 'item_approved',
                    fromStatus: 'resolved',
                    toStatus: 'closed',
                },
            });

            const allItems = await tx.maintenanceRequestItem.findMany({
                where: { requestId: data.requestId },
                select: { status: true },
            });
            const newAggregate = computeRequestStatus(
                allItems.map((i) => ({ status: i.status as ItemStatus })),
                item.request.assignedToId,
                item.request.status === 'cancelled',
            );

            const reqUpdate: { status: string; closedAt?: Date } = { status: newAggregate };
            if (newAggregate === 'closed' && !item.request.closedAt) {
                reqUpdate.closedAt = new Date();
                await tx.maintenanceLog.create({
                    data: {
                        requestId: data.requestId,
                        userId: actorId,
                        action: 'request_closed',
                        toStatus: 'closed',
                    },
                });
            }
            await tx.maintenanceRequest.update({
                where: { id: data.requestId },
                data: reqUpdate,
            });

            // Now safe to free inventory item — reporter verified
            await tx.inventoryItem.update({
                where: { id: item.item.id },
                data: { status: 'available' },
            });
        });

        revalidatePath('/maintenance');
        revalidatePath(`/maintenance/${data.requestId}`);
        revalidatePath('/inventory');
        revalidatePath('/my-assets');
        return { success: true };
    } catch (error) {
        if (error instanceof OptimisticLockError) return { error: error.message, code: 'OPTIMISTIC_LOCK' };
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('approveItemResolution failed:', message);
        return { error: message };
    }
}

const RejectItemSchema = z.object({
    requestId: z.number().int().positive(),
    itemId: z.number().int().positive(),
    expectedVersion: z.number().int().nonnegative(),
    reason: z.string().trim().min(1).max(2000),
});

/**
 * Reporter (or admin) rejects a resolved item → back to in_progress
 * with rejectionReason recorded. Notifies assignee in-app.
 */
export async function rejectItemResolution(input: unknown) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };
    const actorId = Number.parseInt(session.user.id, 10);

    const parsed = RejectItemSchema.safeParse(input);
    if (!parsed.success) return { error: 'Invalid input', issues: parsed.error.format() };
    const data = parsed.data;

    try {
        await prisma.$transaction(async (tx) => {
            const item = await tx.maintenanceRequestItem.findUnique({
                where: { id: data.itemId },
                include: { request: true, item: { select: { id: true } } },
            });
            if (!item || item.requestId !== data.requestId) {
                throw new Error('Item not found in this request');
            }

            const isReporter = item.request.reportedById === actorId;
            const adminSession = await requireRole(...ADMIN_ROLES);
            if (!isReporter && !adminSession) {
                throw new Error('Forbidden - reporter or admin only');
            }

            if (item.status !== 'resolved') {
                throw new Error(`Cannot reject item in status: ${item.status}`);
            }

            assertValidItemTransition('resolved', 'in_progress');
            await assertItemVersion(tx, data.itemId, data.expectedVersion);

            await tx.maintenanceRequestItem.update({
                where: { id: data.itemId },
                data: {
                    status: 'in_progress',
                    rejectionReason: data.reason,
                    resolvedAt: null,
                    version: { increment: 1 },
                },
            });

            await tx.maintenanceLog.create({
                data: {
                    requestId: data.requestId,
                    itemId: item.item.id,
                    userId: actorId,
                    action: 'item_rejected',
                    fromStatus: 'resolved',
                    toStatus: 'in_progress',
                    notes: data.reason,
                },
            });

            const allItems = await tx.maintenanceRequestItem.findMany({
                where: { requestId: data.requestId },
                select: { status: true },
            });
            const newAggregate = computeRequestStatus(
                allItems.map((i) => ({ status: i.status as ItemStatus })),
                item.request.assignedToId,
                item.request.status === 'cancelled',
            );

            const reqUpdate: { status: string; resolvedAt?: null } = { status: newAggregate };
            if (newAggregate !== 'resolved' && newAggregate !== 'closed') {
                reqUpdate.resolvedAt = null;
            }
            await tx.maintenanceRequest.update({
                where: { id: data.requestId },
                data: reqUpdate,
            });

            if (item.request.assignedToId) {
                await tx.notification.create({
                    data: {
                        userId: item.request.assignedToId,
                        text: `รายงานซ่อม #${data.requestId}: ผู้แจ้งปฏิเสธการแก้ไข - ${data.reason}`,
                    },
                });
            }
        });

        revalidatePath('/maintenance');
        revalidatePath(`/maintenance/${data.requestId}`);
        return { success: true };
    } catch (error) {
        if (error instanceof OptimisticLockError) return { error: error.message, code: 'OPTIMISTIC_LOCK' };
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('rejectItemResolution failed:', message);
        return { error: message };
    }
}

// =============================================================================
// Cancel + Reopen (Phase 2 commit #7) — PRP v6 Q3, Q4
// =============================================================================

const ONE_HOUR_MS = 60 * 60 * 1000;

const CancelRequestSchema = z.object({
    requestId: z.number().int().positive(),
    reason: z.string().trim().min(1).max(2000),
});

/**
 * Cancel an entire request (Q3).
 * Auth: reporter within 1 hour of createdAt OR admin/superadmin (anytime).
 * Side effects:
 *   - Set request.status='cancelled'
 *   - Cascade: all non-terminal items → 'cancelled' (resolved/closed kept as-is)
 *   - Insert log action='cancelled' with reason
 *   - Sync inventoryItem.status='available' for cancelled items
 */
export async function cancelMaintenanceRequest(input: unknown) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };
    const actorId = Number.parseInt(session.user.id, 10);

    const parsed = CancelRequestSchema.safeParse(input);
    if (!parsed.success) return { error: 'Invalid input', issues: parsed.error.format() };
    const { requestId, reason } = parsed.data;

    try {
        await prisma.$transaction(async (tx) => {
            const req = await tx.maintenanceRequest.findUnique({
                where: { id: requestId },
                include: { items: true },
            });
            if (!req) throw new Error('Request not found');
            if (req.status === 'cancelled' || req.status === 'closed') {
                throw new Error(`Cannot cancel request in status: ${req.status}`);
            }

            const isReporter = req.reportedById === actorId;
            const adminSession = await requireRole(...ADMIN_ROLES);
            if (!isReporter && !adminSession) {
                throw new Error('Forbidden - reporter or admin only');
            }
            // Reporter time window check (1 hour); admin bypasses
            if (isReporter && !adminSession) {
                const elapsed = Date.now() - req.createdAt.getTime();
                if (elapsed > ONE_HOUR_MS) {
                    throw new Error('Reporter cancel window expired (1 hour); only admin can cancel now');
                }
            }

            // Cascade: cancel non-terminal items
            const itemsToFree: number[] = [];
            for (const it of req.items) {
                if (it.status === 'closed' || it.status === 'cancelled') continue;
                await tx.maintenanceRequestItem.update({
                    where: { id: it.id },
                    data: {
                        status: 'cancelled',
                        version: { increment: 1 },
                    },
                });
                itemsToFree.push(it.itemId);
            }

            await tx.maintenanceRequest.update({
                where: { id: requestId },
                data: { status: 'cancelled' },
            });

            await tx.maintenanceLog.create({
                data: {
                    requestId,
                    userId: actorId,
                    action: 'cancelled',
                    fromStatus: req.status,
                    toStatus: 'cancelled',
                    notes: reason,
                },
            });

            if (itemsToFree.length > 0) {
                await tx.inventoryItem.updateMany({
                    where: { id: { in: itemsToFree } },
                    data: { status: 'available' },
                });
            }
        });

        revalidatePath('/maintenance');
        revalidatePath(`/maintenance/${requestId}`);
        revalidatePath('/inventory');
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('cancelMaintenanceRequest failed:', message);
        return { error: message };
    }
}

const ReopenRequestSchema = z.object({
    requestId: z.number().int().positive(),
    reason: z.string().trim().min(1).max(2000),
});

/**
 * Reopen a closed (or resolved-aggregate) request — admin only (Q4).
 * Side effects:
 *   - All items in (closed, resolved) revert to 'in_progress'
 *   - Clear request.resolvedAt + closedAt
 *   - Recompute request.status (will be 'in_progress')
 *   - Insert log action='reopened'
 */
export async function reopenMaintenanceRequest(input: unknown) {
    const session = await requireRole(...ADMIN_ROLES);
    if (!session?.user?.id) return { error: 'Unauthorized - Admin only' };
    const actorId = Number.parseInt(session.user.id, 10);

    const parsed = ReopenRequestSchema.safeParse(input);
    if (!parsed.success) return { error: 'Invalid input', issues: parsed.error.format() };
    const { requestId, reason } = parsed.data;

    try {
        await prisma.$transaction(async (tx) => {
            const req = await tx.maintenanceRequest.findUnique({
                where: { id: requestId },
                include: { items: true },
            });
            if (!req) throw new Error('Request not found');
            if (!['resolved', 'closed'].includes(req.status)) {
                throw new Error(`Cannot reopen request in status: ${req.status}`);
            }

            const fromStatus = req.status;

            // Revert items in (closed, resolved) → in_progress
            const itemsToReopen = req.items.filter((it) =>
                ['closed', 'resolved'].includes(it.status),
            );
            for (const it of itemsToReopen) {
                await tx.maintenanceRequestItem.update({
                    where: { id: it.id },
                    data: {
                        status: 'in_progress',
                        closedAt: null,
                        resolvedAt: null,
                        version: { increment: 1 },
                    },
                });
            }

            // Recompute aggregate
            const allItems = await tx.maintenanceRequestItem.findMany({
                where: { requestId },
                select: { status: true },
            });
            const newAggregate = computeRequestStatus(
                allItems.map((i) => ({ status: i.status as ItemStatus })),
                req.assignedToId,
                false,
            );

            await tx.maintenanceRequest.update({
                where: { id: requestId },
                data: {
                    status: newAggregate,
                    resolvedAt: null,
                    closedAt: null,
                },
            });

            await tx.maintenanceLog.create({
                data: {
                    requestId,
                    userId: actorId,
                    action: 'reopened',
                    fromStatus,
                    toStatus: newAggregate,
                    notes: reason,
                },
            });

            // Items become unavailable again
            if (itemsToReopen.length > 0) {
                await tx.inventoryItem.updateMany({
                    where: { id: { in: itemsToReopen.map((i) => i.itemId) } },
                    data: { status: 'issue_reported' },
                });
            }
        });

        revalidatePath('/maintenance');
        revalidatePath(`/maintenance/${requestId}`);
        revalidatePath('/inventory');
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('reopenMaintenanceRequest failed:', message);
        return { error: message };
    }
}

// =============================================================================
// Soft-delete + restore (Phase 2 commit #8) — PRP v6 Q19
// =============================================================================

const DeleteRequestSchema = z.object({
    requestId: z.number().int().positive(),
    reason: z.string().trim().min(1).max(2000),
});

/**
 * Soft-delete a request — admin only.
 * Sets deletedAt cascading to items. Subsequent reads via Prisma middleware
 * will exclude this row by default (admin "Show deleted" view bypasses).
 * Notifies reporter with the deletion reason.
 */
export async function deleteMaintenanceRequest(input: unknown) {
    const session = await requireRole(...ADMIN_ROLES);
    if (!session?.user?.id) return { error: 'Unauthorized - Admin only' };
    const actorId = Number.parseInt(session.user.id, 10);

    const parsed = DeleteRequestSchema.safeParse(input);
    if (!parsed.success) return { error: 'Invalid input', issues: parsed.error.format() };
    const { requestId, reason } = parsed.data;

    try {
        await prisma.$transaction(async (tx) => {
            const req = await tx.maintenanceRequest.findUnique({
                where: { id: requestId },
                include: { items: { select: { id: true, itemId: true, status: true } } },
            });
            if (!req) throw new Error('Request not found');
            if (req.deletedAt) throw new Error('Request already deleted');

            const now = new Date();
            await tx.maintenanceRequest.update({
                where: { id: requestId },
                data: { deletedAt: now },
            });
            await tx.maintenanceRequestItem.updateMany({
                where: { requestId },
                data: { deletedAt: now },
            });
            await tx.maintenanceLog.create({
                data: {
                    requestId,
                    userId: actorId,
                    action: 'deleted',
                    notes: reason,
                },
            });

            // Free inventory items that were tied to non-terminal items
            const itemsToFree = req.items
                .filter((i) => !['closed', 'cancelled'].includes(i.status))
                .map((i) => i.itemId);
            if (itemsToFree.length > 0) {
                await tx.inventoryItem.updateMany({
                    where: { id: { in: itemsToFree } },
                    data: { status: 'available' },
                });
            }

            // Notify reporter
            await tx.notification.create({
                data: {
                    userId: req.reportedById,
                    text: `รายงานซ่อม #${requestId} ถูกลบโดยผู้ดูแล - ${reason}`,
                },
            });
        });

        revalidatePath('/maintenance');
        revalidatePath('/inventory');
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('deleteMaintenanceRequest failed:', message);
        return { error: message };
    }
}

// =============================================================================
// Notes + read-side queries (Phase 2 commit #9)
// =============================================================================

const AddNoteSchema = z.object({
    requestId: z.number().int().positive(),
    notes: z.string().trim().min(1).max(2000),
    itemId: z.number().int().positive().optional(),
});

/**
 * Add a free-text note to a request (no state change).
 * Auth: assignee, admin, or superadmin.
 */
export async function addMaintenanceNote(input: unknown) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };
    const actorId = Number.parseInt(session.user.id, 10);

    const parsed = AddNoteSchema.safeParse(input);
    if (!parsed.success) return { error: 'Invalid input', issues: parsed.error.format() };
    const { requestId, notes, itemId } = parsed.data;

    try {
        const req = await prisma.maintenanceRequest.findUnique({
            where: { id: requestId },
            select: { assignedToId: true },
        });
        if (!req) return { error: 'Request not found' };

        const isAssignee = req.assignedToId === actorId;
        const adminSession = await requireRole(...ADMIN_ROLES);
        if (!isAssignee && !adminSession) {
            return { error: 'Forbidden - assignee or admin only' };
        }

        await prisma.maintenanceLog.create({
            data: {
                requestId,
                itemId: itemId ?? null,
                userId: actorId,
                action: 'note_added',
                notes,
            },
        });

        revalidatePath(`/maintenance/${requestId}`);
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('addMaintenanceNote failed:', message);
        return { error: message };
    }
}

const ListFiltersSchema = z.object({
    status: z.string().optional(),
    assignedToId: z.union([z.number().int().positive(), z.literal('me'), z.literal('unassigned')]).optional(),
    severity: z.string().optional(),
    itemId: z.number().int().positive().optional(),
    tags: z.array(z.string()).optional(),
    view: z.enum(['active', 'deleted']).optional(),
}).optional();

/**
 * List requests with optional filters (PRP v6).
 * Auth: admin, superadmin, technician, auditor (read-only).
 * filters.view='deleted' requires admin/superadmin.
 */
export async function getMaintenanceRequests(filters?: unknown) {
    const session = await requireRole(...ADMIN_ROLES, 'technician', 'auditor');
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const parsed = ListFiltersSchema.safeParse(filters);
    if (!parsed.success) return { error: 'Invalid filters', issues: parsed.error.format() };
    const f = parsed.data ?? {};
    const actorId = Number.parseInt(session.user.id, 10);

    if (f.view === 'deleted') {
        const adminSession = await requireRole(...ADMIN_ROLES);
        if (!adminSession) return { error: 'Forbidden - deleted view is admin only' };
    }

    try {
        const where: Record<string, unknown> = {};
        if (f.status) where.status = f.status;
        if (f.severity) where.severity = f.severity;
        if (f.assignedToId === 'me') where.assignedToId = actorId;
        else if (f.assignedToId === 'unassigned') where.assignedToId = null;
        else if (typeof f.assignedToId === 'number') where.assignedToId = f.assignedToId;
        if (f.itemId !== undefined) where.items = { some: { itemId: f.itemId } };

        // 'view=deleted' bypasses soft-delete middleware via explicit filter
        if (f.view === 'deleted') {
            where.deletedAt = { not: null };
        }

        let requests = await prisma.maintenanceRequest.findMany({
            where: where as never,
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
            orderBy: { createdAt: 'desc' },
            take: 200,
        });

        // Tags filter is post-fetch because tags is JSON-string in SQLite
        if (f.tags && f.tags.length > 0) {
            const tagsToMatch = f.tags;
            requests = requests.filter((r) => {
                if (!r.tags) return false;
                try {
                    const parsedTags = JSON.parse(r.tags) as string[];
                    return tagsToMatch.every((t) => parsedTags.includes(t));
                } catch {
                    return false;
                }
            });
        }

        return { success: true, requests };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('getMaintenanceRequests failed:', message);
        return { error: message };
    }
}

/**
 * Get current user's reported requests.
 */
export async function getMyMaintenanceRequests() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };
    const actorId = Number.parseInt(session.user.id, 10);

    try {
        const requests = await prisma.maintenanceRequest.findMany({
            where: { reportedById: actorId },
            include: {
                items: {
                    include: {
                        item: { select: { id: true, name: true, serial: true, image: true } },
                    },
                },
                assignedTo: { select: { id: true, name: true } },
                location: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        return { success: true, requests };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('getMyMaintenanceRequests failed:', message);
        return { error: message };
    }
}

/**
 * Get a single request with items + log timeline.
 * Auth: admin/auditor see all; reporter or assignee can see own.
 */
export async function getMaintenanceRequest(id: number) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };
    const actorId = Number.parseInt(session.user.id, 10);

    if (!Number.isInteger(id) || id <= 0) return { error: 'Invalid id' };

    try {
        const request = await prisma.maintenanceRequest.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        item: { select: { id: true, name: true, serial: true, image: true } },
                    },
                    orderBy: { id: 'asc' },
                },
                reportedBy: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, name: true } },
                location: { select: { id: true, name: true } },
                logs: {
                    include: {
                        user: { select: { id: true, name: true } },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!request) return { error: 'Request not found' };

        // Scope check: reporter, assignee, or admin/auditor
        const isReporter = request.reportedById === actorId;
        const isAssignee = request.assignedToId === actorId;
        const adminish = await requireRole(...ADMIN_ROLES, 'auditor');
        if (!isReporter && !isAssignee && !adminish) {
            return { error: 'Forbidden' };
        }

        return { success: true, request };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('getMaintenanceRequest failed:', message);
        return { error: message };
    }
}

/**
 * Return a deduplicated list of all tags across non-deleted requests.
 * Used for autocomplete in TagInput + filter chips.
 * Auth: any logged-in user.
 */
export async function getMaintenanceTags(filter?: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const rows = await prisma.maintenanceRequest.findMany({
            where: { tags: { not: null } },
            select: { tags: true },
            take: 500,
        });
        const tagSet = new Set<string>();
        for (const r of rows) {
            if (!r.tags) continue;
            try {
                const arr = JSON.parse(r.tags) as string[];
                for (const t of arr) tagSet.add(t);
            } catch {
                // skip malformed
            }
        }
        let tags = Array.from(tagSet).sort();
        if (filter && typeof filter === 'string') {
            const needle = filter.toLowerCase();
            tags = tags.filter((t) => t.toLowerCase().includes(needle));
        }
        return { success: true, tags: tags.slice(0, 50) };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('getMaintenanceTags failed:', message);
        return { error: message };
    }
}

/**
 * Restore a soft-deleted request — admin only.
 * Bypasses middleware via explicit deletedAt filter on the lookup.
 */
export async function restoreMaintenanceRequest(requestId: number) {
    const session = await requireRole(...ADMIN_ROLES);
    if (!session?.user?.id) return { error: 'Unauthorized - Admin only' };
    const actorId = Number.parseInt(session.user.id, 10);

    if (!Number.isInteger(requestId) || requestId <= 0) {
        return { error: 'Invalid requestId' };
    }

    try {
        await prisma.$transaction(async (tx) => {
            // Explicit deletedAt filter bypasses middleware
            const req = await tx.maintenanceRequest.findFirst({
                where: { id: requestId, deletedAt: { not: null } },
            });
            if (!req) throw new Error('Deleted request not found');

            await tx.maintenanceRequest.update({
                where: { id: requestId },
                data: { deletedAt: null },
            });
            await tx.maintenanceRequestItem.updateMany({
                where: { requestId },
                data: { deletedAt: null },
            });
            await tx.maintenanceLog.create({
                data: {
                    requestId,
                    userId: actorId,
                    action: 'restored',
                },
            });
        });

        revalidatePath('/maintenance');
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('restoreMaintenanceRequest failed:', message);
        return { error: message };
    }
}
