'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { APPROVER_ROLES, sessionHasAnyRole } from '@/lib/role-access';
import { canAccessWarehouse, getManagedWarehouseIds, isReadAllSession } from '@/lib/warehouse-scope';
import { logActionError } from '@/lib/action-result';

export async function adjustStockQuantity(
    warehouseId: number,
    itemId: number,
    adjustment: number,
    note: string
) {
    const session = await auth();
    if (!session?.user?.id || !sessionHasAnyRole(session, ...APPROVER_ROLES)) {
        return { success: false, message: 'Unauthorized' };
    }
    const userId = parseInt(session.user.id);

    try {
        if (!(await canAccessWarehouse(session, warehouseId))) {
            return { success: false, message: 'Stock level not found' };
        }

        await prisma.$transaction(async (tx) => {
            // 1. Get current stock
            const current = await tx.stockLevel.findUnique({
                where: {
                    warehouseId_itemId: {
                        warehouseId,
                        itemId
                    }
                }
            });

            if (!current) {
                throw new Error('Stock level not found');
            }

            if (current.quantity + adjustment < 0) {
                throw new Error('Insufficient stock');
            }

            // 2. Update stock
            await tx.stockLevel.update({
                where: { id: current.id },
                data: { quantity: { increment: adjustment } }
            });

            await tx.stockTransaction.create({
                data: {
                    warehouseId,
                    itemId,
                    quantity: adjustment,
                    type: 'adjustment',
                    note,
                    userId
                }
            });

            await tx.auditLog.create({
                data: {
                    userId,
                    action: 'UPDATE',
                    entity: 'StockLevel',
                    entityId: String(current.id),
                    details: JSON.stringify({ warehouseId, itemId, adjustment, note }),
                }
            });
        });

        revalidatePath(`/inventory/${itemId}`);
        return { success: true, message: 'Stock adjusted successfully' };
    } catch (error) {
        logActionError('adjustStockQuantity', error);
        return { success: false, message: 'Failed to adjust stock' };
    }
}

export async function updateStockLimits(
    warehouseId: number,
    itemId: number,
    minStock?: number,
    maxStock?: number
) {
    const session = await auth();
    if (!session?.user?.id || !sessionHasAnyRole(session, ...APPROVER_ROLES)) {
        return { success: false, message: 'Unauthorized' };
    }

    try {
        if (!(await canAccessWarehouse(session, warehouseId))) {
            return { success: false, message: 'Stock level not found' };
        }

        const userId = parseInt(session.user.id);
        await prisma.$transaction(async (tx) => {
            const updated = await tx.stockLevel.update({
                where: {
                    warehouseId_itemId: {
                        warehouseId,
                        itemId
                    }
                },
                data: {
                    ...(minStock !== undefined && { minStock }),
                    ...(maxStock !== undefined && { maxStock })
                }
            });

            await tx.auditLog.create({
                data: {
                    userId,
                    action: 'UPDATE',
                    entity: 'StockLevel',
                    entityId: String(updated?.id ?? `${warehouseId}:${itemId}`),
                    details: JSON.stringify({ warehouseId, itemId, minStock, maxStock }),
                }
            });
        });

        revalidatePath(`/inventory/${itemId}`);
        return { success: true, message: 'Limits updated successfully' };
    } catch (error) {
        logActionError('updateStockLimits', error);
        return { success: false, message: 'Failed to update limits' };
    }
}

export async function getItemDetail(itemId: number) {
    const session = await auth();
    if (!session?.user?.id) return null;

    try {
        const isAdmin = isReadAllSession(session);
        const managed = isAdmin ? [] : await getManagedWarehouseIds(parseInt(session.user.id));

        const item = await prisma.inventoryItem.findUnique({
            where: { id: itemId },
            include: {
                stockLevels: {
                    ...(isAdmin ? {} : { where: { warehouseId: { in: managed } } }),
                    include: { warehouse: true }
                }
            }
        });
        return item;
    } catch {
        return null;
    }
}

export async function getStockHistory(itemId: number, page: number = 1, perPage: number = 20) {
    const session = await auth();
    if (!session?.user?.id) {
        return {
            transactions: [],
            pagination: { page: 1, perPage, total: 0, totalPages: 0 }
        };
    }

    try {
        const skip = (page - 1) * perPage;
        const where: any = { itemId };
        if (!isReadAllSession(session)) {
            const managed = await getManagedWarehouseIds(parseInt(session.user.id));
            where.warehouseId = { in: managed };
        }

        const [transactions, total] = await Promise.all([
            prisma.stockTransaction.findMany({
                where,
                include: {
                    warehouse: { select: { name: true, code: true } },
                    user: { select: { name: true, email: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: perPage,
                skip
            }),
            prisma.stockTransaction.count({ where })
        ]);

        return {
            transactions,
            pagination: {
                page,
                perPage,
                total,
                totalPages: Math.ceil(total / perPage)
            }
        };
    } catch {
        return {
            transactions: [],
            pagination: { page: 1, perPage, total: 0, totalPages: 0 }
        };
    }
}
