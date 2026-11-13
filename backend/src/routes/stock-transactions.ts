
import { Router } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest, requireAuth, requireRole } from '../middleware/auth';
import { assertWarehouseAccess, getManagedWarehouseIds, isAdminTier, NotFoundError, parsePositiveInt } from '../lib/authz';
import { z } from 'zod';

const router = Router();

// Schema for Goods Receipt (Inbound)
const inboundSchema = z.object({
    warehouseId: z.number(),
    items: z.array(z.object({
        itemId: z.number(),
        quantity: z.number().min(1, 'Quantity must be greater than 0'),
    })).min(1, 'At least one item is required'),
    note: z.string().optional(),
    referenceId: z.string().optional(),
});

// POST /api/stock-transactions/receive
router.post('/receive', requireAuth, requireRole(['superadmin', 'admin', 'approver']), async (req: AuthRequest, res) => {
    try {
        const { warehouseId, items, note, referenceId } = inboundSchema.parse(req.body);
        const user = req.user!;
        const userId = Number(user.id ?? (user as { userId?: number }).userId);

        await assertWarehouseAccess(prisma, user, warehouseId);

        // Check if warehouse exists
        const warehouse = await prisma.warehouse.findUnique({
            where: { id: warehouseId }
        });

        if (!warehouse) {
            return res.status(404).json({ error: 'Warehouse not found' });
        }

        // Perform transaction
        const result = await prisma.$transaction(async (tx) => {
            const transactions = [];

            for (const item of items) {
                // 1. Update Stock Level (Upsert)
                // find first to see if exists
                const existingStock = await tx.stockLevel.findUnique({
                    where: {
                        warehouseId_itemId: {
                            warehouseId,
                            itemId: item.itemId
                        }
                    }
                });

                if (existingStock) {
                    await tx.stockLevel.update({
                        where: { id: existingStock.id },
                        data: { quantity: { increment: item.quantity } }
                    });
                } else {
                    await tx.stockLevel.create({
                        data: {
                            warehouseId,
                            itemId: item.itemId,
                            quantity: item.quantity
                        }
                    });
                }

                // 2. Create Transaction Record
                const transaction = await tx.stockTransaction.create({
                    data: {
                        warehouseId,
                        itemId: item.itemId,
                        quantity: item.quantity,
                        type: 'inbound',
                        referenceId,
                        note,
                        userId
                    }
                });
                transactions.push(transaction);
            }
            return transactions;
        });

        res.json({ message: 'Goods received successfully', transactions: result });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        if (error instanceof NotFoundError) {
            return res.status(404).json({ error: 'Warehouse not found' });
        }
        console.error('Inbound Error:', error);
        res.status(500).json({ error: 'Failed to process goods receipt' });
    }
});

router.get('/history/:itemId', requireAuth, async (req: AuthRequest, res) => {
    try {
        const itemId = parsePositiveInt(req.params.itemId);
        if (!itemId) {
            return res.status(400).json({ error: 'Invalid item ID' });
        }
        const user = req.user!;
        const where: any = { itemId };

        if (!isAdminTier(user)) {
            const managed = await getManagedWarehouseIds(prisma, user);
            where.warehouseId = { in: managed };
        }

        const transactions = await prisma.stockTransaction.findMany({
            where,
            include: {
                user: { select: { name: true, email: true } },
                warehouse: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

export default router;
