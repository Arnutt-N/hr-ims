'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function adjustStockQuantity(
    warehouseId: number,
    itemId: number,
    adjustment: number,
    note: string,
    userId: number
) {
    try {
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

            // 2. Update stock
            await tx.stockLevel.update({
                where: { id: current.id },
                data: { quantity: { increment: adjustment } }
            });

            // 3. Create transaction
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
        });

        revalidatePath(`/inventory/${itemId}`);
        return { success: true, message: 'Stock adjusted successfully' };
    } catch (error) {
        console.error('Adjust Stock Error:', error);
        return { success: false, message: 'Failed to adjust stock' };
    }
}

export async function updateStockLimits(
    warehouseId: number,
    itemId: number,
    minStock?: number,
    maxStock?: number
) {
    try {
        await prisma.stockLevel.update({
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

        revalidatePath(`/inventory/${itemId}`);
        return { success: true, message: 'Limits updated successfully' };
    } catch (error) {
        console.error('Update Limits Error:', error);
        return { success: false, message: 'Failed to update limits' };
    }
}

export async function getItemDetail(itemId: number) {
    try {
        const item = await prisma.inventoryItem.findUnique({
            where: { id: itemId },
            include: {
                stockLevels: {
                    include: { warehouse: true }
                }
            }
        });
        return item;
    } catch (error) {
        return null;
    }
}

export async function getStockHistory(itemId: number, page: number = 1, perPage: number = 20) {
    try {
        const skip = (page - 1) * perPage;

        const [transactions, total] = await Promise.all([
            prisma.stockTransaction.findMany({
                where: { itemId },
                include: {
                    warehouse: { select: { name: true, code: true } },
                    user: { select: { name: true, email: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: perPage,
                skip
            }),
            prisma.stockTransaction.count({ where: { itemId } })
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
    } catch (error) {
        return {
            transactions: [],
            pagination: { page: 1, perPage, total: 0, totalPages: 0 }
        };
    }
}
