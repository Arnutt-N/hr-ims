'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { APPROVER_ROLES, sessionHasAnyRole } from '@/lib/role-access';
import { canAccessWarehouse } from '@/lib/warehouse-scope';
import { logActivity } from './audit';

const COUNT_ROLES: string[] = [...APPROVER_ROLES, 'auditor'];

export async function createStockCountRound(input: {
    warehouseId: number;
    assignedToId: number;
    note?: string;
}) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: 'Unauthorized' };
    if (!sessionHasAnyRole(session, ...APPROVER_ROLES)) {
        return { success: false, message: 'Forbidden' };
    }
    const createdById = parseInt(session.user.id);
    if (!(await canAccessWarehouse(session, input.warehouseId))) {
        return { success: false, message: 'Warehouse not found' };
    }

    try {
        const round = await prisma.$transaction(async (tx) => {
            const levels = await tx.stockLevel.findMany({
                where: { warehouseId: input.warehouseId },
                select: { itemId: true, quantity: true }
            });

            return tx.stockCountRound.create({
                data: {
                    warehouseId: input.warehouseId,
                    createdById,
                    assignedToId: input.assignedToId,
                    note: input.note,
                    status: 'counting',
                    lines: {
                        create: levels.map(level => ({
                            itemId: level.itemId,
                            systemQuantity: level.quantity
                        }))
                    }
                },
                include: { lines: true, warehouse: true, assignedTo: true }
            });
        });

        await logActivity('CREATE', 'StockCountRound', String(round.id), {
            warehouseId: input.warehouseId,
            assignedToId: input.assignedToId,
            lineCount: round.lines.length
        });
        revalidatePath('/inventory/stock-count');
        return { success: true, data: round };
    } catch (error) {
        console.error('createStockCountRound:', error);
        return { success: false, message: 'Failed to create stock count round' };
    }
}

export async function recordStockCount(roundId: number, counts: Array<{ lineId: number; countedQuantity: number; note?: string }>) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: 'Unauthorized' };
    const userId = parseInt(session.user.id);

    try {
        const round = await prisma.stockCountRound.findUnique({ where: { id: roundId } });
        if (!round) return { success: false, message: 'Round not found' };
        if (round.status !== 'counting') return { success: false, message: 'Round is not open for counting' };
        if (round.assignedToId !== userId && !sessionHasAnyRole(session, ...APPROVER_ROLES)) {
            return { success: false, message: 'Forbidden' };
        }

        const updated = await prisma.$transaction(async (tx) => {
            for (const count of counts) {
                if (!Number.isInteger(count.countedQuantity) || count.countedQuantity < 0) {
                    throw new Error('Invalid counted quantity');
                }
                const line = await tx.stockCountLine.findFirst({
                    where: { id: count.lineId, roundId }
                });
                if (!line) throw new Error('Count line not found');

                const current = await tx.stockLevel.findUnique({
                    where: {
                        warehouseId_itemId: {
                            warehouseId: round.warehouseId,
                            itemId: line.itemId
                        }
                    }
                });
                if (!current) throw new Error('Stock level not found');

                await tx.stockCountLine.update({
                    where: { id: line.id },
                    data: {
                        countedQuantity: count.countedQuantity,
                        variance: count.countedQuantity - current.quantity,
                        note: count.note
                    }
                });
            }
            return tx.stockCountRound.update({
                where: { id: roundId },
                data: { status: 'review', countedAt: new Date() }
            });
        });

        await logActivity('UPDATE', 'StockCountRound', String(roundId), {
            countedLines: counts.length,
            countedBy: userId
        });
        revalidatePath('/inventory/stock-count');
        return { success: true, data: updated };
    } catch (error) {
        console.error('recordStockCount:', error);
        return { success: false, message: 'Failed to record stock count' };
    }
}

export async function approveStockCount(roundId: number, note?: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: 'Unauthorized' };
    if (!sessionHasAnyRole(session, ...APPROVER_ROLES)) {
        return { success: false, message: 'Forbidden' };
    }
    const approverId = parseInt(session.user.id);

    try {
        const round = await prisma.stockCountRound.findUnique({
            where: { id: roundId },
            include: { lines: true }
        });
        if (!round) return { success: false, message: 'Round not found' };
        if (round.status !== 'review') return { success: false, message: 'Round is not awaiting review' };
        if (round.lines.some(line => line.countedQuantity === null)) {
            return { success: false, message: 'Some lines are not counted' };
        }

        const updated = await prisma.stockCountRound.update({
            where: { id: roundId },
            data: { status: 'approved', approvedById: approverId, approvedAt: new Date(), note: note ?? round.note }
        });

        await logActivity('UPDATE', 'StockCountRound', String(roundId), {
            approvedBy: approverId,
            varianceLines: round.lines.filter(line => line.variance !== 0).length
        });
        revalidatePath('/inventory/stock-count');
        return { success: true, data: updated };
    } catch (error) {
        console.error('approveStockCount:', error);
        return { success: false, message: 'Failed to approve stock count' };
    }
}

export async function applyStockCount(roundId: number) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: 'Unauthorized' };
    if (!sessionHasAnyRole(session, ...APPROVER_ROLES)) {
        return { success: false, message: 'Forbidden' };
    }

    try {
        const round = await prisma.stockCountRound.findUnique({
            where: { id: roundId },
            include: { lines: true }
        });
        if (!round) return { success: false, message: 'Round not found' };
        if (round.status !== 'approved') return { success: false, message: 'Round is not approved' };
        if (!(await canAccessWarehouse(session, round.warehouseId))) {
            return { success: false, message: 'Warehouse not found' };
        }

        const appliedCount = await prisma.$transaction(async (tx) => {
            const fresh = await tx.stockCountRound.findUnique({
                where: { id: roundId },
                include: { lines: true }
            });
            if (!fresh || fresh.status !== 'approved') {
                throw new Error('Round is not approved');
            }

            const userId = parseInt(session.user.id);
            let applied = 0;

            for (const line of fresh.lines) {
                if (line.countedQuantity === null || line.variance === null || line.variance === 0) continue;

                const current = await tx.stockLevel.findUnique({
                    where: {
                        warehouseId_itemId: {
                            warehouseId: fresh.warehouseId,
                            itemId: line.itemId
                        }
                    }
                });
                if (!current) throw new Error('Stock level not found');

                await tx.stockLevel.update({
                    where: { id: current.id },
                    data: { quantity: { increment: line.variance } }
                });

                await tx.stockTransaction.create({
                    data: {
                        warehouseId: fresh.warehouseId,
                        itemId: line.itemId,
                        quantity: line.variance,
                        type: 'adjustment',
                        referenceId: `StockCountRound:${fresh.id}`,
                        note: `Stock count round #${fresh.id} line #${line.id}`,
                        userId
                    }
                });

                await tx.auditLog.create({
                    data: {
                        userId,
                        action: 'UPDATE',
                        entity: 'StockLevel',
                        entityId: String(current.id),
                        details: JSON.stringify({
                            warehouseId: fresh.warehouseId,
                            itemId: line.itemId,
                            adjustment: line.variance,
                            note: `Stock count round #${fresh.id} line #${line.id}`
                        })
                    }
                });
                applied += 1;
            }

            const claimed = await tx.stockCountRound.updateMany({
                where: { id: roundId, status: 'approved' },
                data: { status: 'applied', appliedAt: new Date() }
            });
            if (claimed.count !== 1) {
                throw new Error('Round is already applied');
            }
            return applied;
        });

        const updated = await prisma.stockCountRound.findUnique({ where: { id: roundId } });

        await logActivity('UPDATE', 'StockCountRound', String(roundId), {
            appliedBy: parseInt(session.user.id),
            appliedLines: appliedCount
        });
        revalidatePath('/inventory/stock-count');
        revalidatePath('/inventory');
        return { success: true, data: updated };
    } catch (error) {
        console.error('applyStockCount:', error);
        return { success: false, message: 'Failed to apply stock count' };
    }
}

export async function getStockCountRounds() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };
    if (!sessionHasAnyRole(session, ...COUNT_ROLES)) return { error: 'Forbidden' };

    try {
        const rounds = await prisma.stockCountRound.findMany({
            include: {
                warehouse: { select: { name: true, code: true } },
                createdBy: { select: { name: true } },
                assignedTo: { select: { name: true } },
                lines: {
                    include: { item: { select: { name: true } } },
                    orderBy: { id: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        return { success: true, rounds };
    } catch (error) {
        console.error('getStockCountRounds:', error);
        return { error: 'Failed to fetch stock count rounds' };
    }
}
