import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/stock-levels - ดึงระดับสต็อกทั้งหมด (with filters)
router.get('/', async (req, res) => {
    try {
        const { warehouseId, itemId, lowStock } = req.query;

        const stockLevels = await prisma.stockLevel.findMany({
            where: {
                ...(warehouseId && { warehouseId: parseInt(warehouseId as string) }),
                ...(itemId && { itemId: parseInt(itemId as string) }),
                ...(lowStock === 'true' && {
                    quantity: {
                        lte: prisma.stockLevel.fields.minStock
                    }
                })
            },
            include: {
                warehouse: true,
                item: true
            },
            orderBy: { updatedAt: 'desc' }
        });

        res.json(stockLevels);
    } catch (error) {
        console.error('Error fetching stock levels:', error);
        res.status(500).json({ error: 'Failed to fetch stock levels' });
    }
});

// GET /api/stock-levels/:warehouseId/:itemId - ดึงสต็อกของสินค้าในคลังเฉพาะ
router.get('/:warehouseId/:itemId', async (req, res) => {
    try {
        const stockLevel = await prisma.stockLevel.findUnique({
            where: {
                warehouseId_itemId: {
                    warehouseId: parseInt(req.params.warehouseId),
                    itemId: parseInt(req.params.itemId)
                }
            },
            include: {
                warehouse: true,
                item: true
            }
        });

        if (!stockLevel) {
            return res.status(404).json({ error: 'Stock level not found' });
        }

        res.json(stockLevel);
    } catch (error) {
        console.error('Error fetching stock level:', error);
        res.status(500).json({ error: 'Failed to fetch stock level' });
    }
});

// POST /api/stock-levels - สร้าง/อัพเดทระดับสต็อก (Admin only)
router.post('/', requireAuth, requireRole(['superadmin', 'admin']), async (req, res) => {
    try {
        const { warehouseId, itemId, quantity, minStock, maxStock } = req.body;

        const stockLevel = await prisma.stockLevel.upsert({
            where: {
                warehouseId_itemId: {
                    warehouseId: parseInt(warehouseId),
                    itemId: parseInt(itemId)
                }
            },
            update: {
                quantity: parseInt(quantity),
                ...(minStock !== undefined && { minStock: parseInt(minStock) }),
                ...(maxStock !== undefined && { maxStock: parseInt(maxStock) })
            },
            create: {
                warehouseId: parseInt(warehouseId),
                itemId: parseInt(itemId),
                quantity: parseInt(quantity),
                minStock: minStock ? parseInt(minStock) : null,
                maxStock: maxStock ? parseInt(maxStock) : null
            },
            include: {
                warehouse: true,
                item: true
            }
        });

        res.status(201).json(stockLevel);
    } catch (error) {
        console.error('Error creating/updating stock level:', error);
        res.status(500).json({ error: 'Failed to create/update stock level' });
    }
});

// PATCH /api/stock-levels/:warehouseId/:itemId/adjust - Adjust stock quantity (Approver/Admin)
router.patch('/:warehouseId/:itemId/adjust', requireAuth, requireRole(['superadmin', 'admin', 'approver']), async (req, res) => {
    try {
        const { warehouseId, itemId } = req.params;
        const { adjustment, note, userId } = req.body; // adjustment can be +/- number

        const stockLevel = await prisma.$transaction(async (tx) => {
            // 1. Get current stock
            const current = await tx.stockLevel.findUnique({
                where: {
                    warehouseId_itemId: {
                        warehouseId: parseInt(warehouseId),
                        itemId: parseInt(itemId)
                    }
                }
            });

            if (!current) {
                throw new Error('Stock level not found');
            }

            // 2. Update stock
            const updated = await tx.stockLevel.update({
                where: { id: current.id },
                data: { quantity: { increment: parseInt(adjustment) } },
                include: { warehouse: true, item: true }
            });

            // 3. Create transaction record
            await tx.stockTransaction.create({
                data: {
                    warehouseId: parseInt(warehouseId),
                    itemId: parseInt(itemId),
                    quantity: parseInt(adjustment),
                    type: 'adjustment',
                    note,
                    userId: parseInt(userId)
                }
            });

            return updated;
        });

        res.json(stockLevel);
    } catch (error) {
        console.error('Error adjusting stock:', error);
        res.status(500).json({ error: 'Failed to adjust stock' });
    }
});

// PATCH /api/stock-levels/:warehouseId/:itemId/limits - Update min/max limits (Admin/Approver)
router.patch('/:warehouseId/:itemId/limits', requireAuth, requireRole(['superadmin', 'admin', 'approver']), async (req, res) => {
    try {
        const { warehouseId, itemId } = req.params;
        const { minStock, maxStock } = req.body;

        const stockLevel = await prisma.stockLevel.update({
            where: {
                warehouseId_itemId: {
                    warehouseId: parseInt(warehouseId),
                    itemId: parseInt(itemId)
                }
            },
            data: {
                ...(minStock !== undefined && { minStock: parseInt(minStock) }),
                ...(maxStock !== undefined && { maxStock: parseInt(maxStock) })
            },
            include: { warehouse: true, item: true }
        });

        res.json(stockLevel);
    } catch (error) {
        console.error('Error updating limits:', error);
        res.status(500).json({ error: 'Failed to update limits' });
    }
});

export default router;
