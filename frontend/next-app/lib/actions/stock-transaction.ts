'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const InboundSchema = z.object({
    warehouseId: z.coerce.number(),
    items: z.array(z.object({
        itemId: z.coerce.number(),
        quantity: z.coerce.number().min(1),
    })).min(1),
    note: z.string().optional(),
    referenceId: z.string().optional(),
    userId: z.coerce.number(), // In real app, get from session
});

export async function receiveGoods(formData: any) {
    // Note: formData here might be a raw object if called from client component via library, or standard FormData.
    // For complex arrays, it's often easier to pass JSON or use a specific form handler.
    // Assuming we pass a structured object for this action or handle parsing.

    // For simplicity in this demo, let's assume the argument is a plain object 
    // passed from a Client Component that handles the form state.

    try {
        const validated = InboundSchema.parse(formData);

        await prisma.$transaction(async (tx) => {
            for (const item of validated.items) {
                // 1. Update Stock Level
                const existing = await tx.stockLevel.findUnique({
                    where: {
                        warehouseId_itemId: {
                            warehouseId: validated.warehouseId,
                            itemId: item.itemId
                        }
                    }
                });

                if (existing) {
                    await tx.stockLevel.update({
                        where: { id: existing.id },
                        data: { quantity: { increment: item.quantity } }
                    });
                } else {
                    await tx.stockLevel.create({
                        data: {
                            warehouseId: validated.warehouseId,
                            itemId: item.itemId,
                            quantity: item.quantity
                        }
                    });
                }

                // 2. Create Transaction
                await tx.stockTransaction.create({
                    data: {
                        warehouseId: validated.warehouseId,
                        itemId: item.itemId,
                        quantity: item.quantity,
                        type: 'inbound',
                        referenceId: validated.referenceId,
                        note: validated.note,
                        userId: validated.userId
                    }
                });
            }
        });

        revalidatePath('/inventory');
        revalidatePath('/warehouse');
        return { success: true, message: 'Received goods successfully' };
    } catch (error) {
        console.error('Receive Goods Error:', error);
        return { success: false, message: 'Failed to receive goods' };
    }
}

export async function getStockHistory(itemId: number) {
    try {
        const history = await prisma.stockTransaction.findMany({
            where: { itemId },
            include: {
                warehouse: true,
                user: {
                    select: { name: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return history;
    } catch (error) {
        return [];
    }
}
