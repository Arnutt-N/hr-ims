
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

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
router.post('/receive', authenticateToken, async (req, res) => {
    try {
        const { warehouseId, items, note, referenceId } = inboundSchema.parse(req.body);
        const userId = (req as any).user.userId;

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
        console.error('Inbound Error:', error);
        res.status(500).json({ error: 'Failed to process goods receipt' });
    }
});

// GET /api/stock-transactions/history/:itemId
router.get('/history/:itemId', authenticateToken, async (req, res) => {
    try {
        const itemId = parseInt(req.params.itemId);
        const transactions = await prisma.stockTransaction.findMany({
            where: { itemId },
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
