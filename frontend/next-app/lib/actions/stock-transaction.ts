'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { canAccessWarehouse } from '@/lib/warehouse-scope';

const InboundSchema = z.object({
    warehouseId: z.coerce.number(),
    items: z.array(z.object({
        itemId: z.coerce.number(),
        quantity: z.coerce.number().min(1),
    })).min(1),
    note: z.string().optional(),
    referenceId: z.string().optional(),
});

export async function receiveGoods(formData: any) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, message: 'Unauthorized' };
    }
    const userId = parseInt(session.user.id);

    try {
        const validated = InboundSchema.parse(formData);

        if (!(await canAccessWarehouse(session, validated.warehouseId))) {
            return { success: false, message: 'Warehouse not found' };
        }

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
                        userId
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
