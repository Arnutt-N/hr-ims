import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthRequest, requireAuth, requireRole } from '../middleware/auth';
import { assertWarehouseAccess, getManagedWarehouseIds, isAdminTier, NotFoundError, parsePositiveInt } from '../lib/authz';

const UpsertStockLevelSchema = z.object({
    warehouseId: z.coerce.number().int().positive(),
    itemId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().min(0),
    minStock: z.coerce.number().int().min(0).optional(),
    maxStock: z.coerce.number().int().min(0).optional(),
});

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { warehouseId, itemId, lowStock } = req.query;
        const user = req.user!;

        const where: any = {
            ...(itemId && { itemId: parseInt(itemId as string) }),
            ...(lowStock === 'true' && {
                quantity: {
                    lte: prisma.stockLevel.fields.minStock
                }
            })
        };
        if (isAdminTier(user)) {
            if (warehouseId) where.warehouseId = parseInt(warehouseId as string);
        } else {
            const managed = await getManagedWarehouseIds(prisma, user);
            where.warehouseId = {
                in: managed,
                ...(warehouseId ? { equals: parseInt(warehouseId as string) } : {})
            };
        }

        const stockLevels = await prisma.stockLevel.findMany({
            where,
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
router.get('/:warehouseId/:itemId', requireAuth, async (req: AuthRequest, res) => {
    try {
        const user = req.user!;
        const warehouseId = parsePositiveInt(req.params.warehouseId);
        const itemId = parsePositiveInt(req.params.itemId);
        if (!warehouseId || !itemId) {
            return res.status(400).json({ error: 'Invalid warehouse or item ID' });
        }

        if (!isAdminTier(user)) {
            try {
                await assertWarehouseAccess(prisma, user, warehouseId);
            } catch (err) {
                if (err instanceof NotFoundError) {
                    return res.status(404).json({ error: 'Stock level not found' });
                }
                throw err;
            }
        }

        const stockLevel = await prisma.stockLevel.findUnique({
            where: {
                warehouseId_itemId: {
                    warehouseId,
                    itemId
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
        const parsed = UpsertStockLevelSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid stock level payload', details: parsed.error.flatten() });
        }
        const { warehouseId, itemId, quantity, minStock, maxStock } = parsed.data;

        const stockLevel = await prisma.stockLevel.upsert({
            where: {
                warehouseId_itemId: {
                    warehouseId,
                    itemId
                }
            },
            update: {
                quantity,
                ...(minStock !== undefined && { minStock }),
                ...(maxStock !== undefined && { maxStock })
            },
            create: {
                warehouseId,
                itemId,
                quantity,
                minStock: minStock ?? null,
                maxStock: maxStock ?? null
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
router.patch('/:warehouseId/:itemId/adjust', requireAuth, requireRole(['superadmin', 'admin', 'approver']), async (req: AuthRequest, res) => {
    try {
        const user = req.user!;
        const warehouseId = parsePositiveInt(req.params.warehouseId);
        const itemId = parsePositiveInt(req.params.itemId);
        if (!warehouseId || !itemId) {
            return res.status(400).json({ error: 'Invalid warehouse or item ID' });
        }
        const { adjustment, note } = req.body;
        const delta = parseInt(adjustment);
        if (!Number.isFinite(delta)) {
            return res.status(400).json({ error: 'Invalid adjustment value' });
        }

        if (!isAdminTier(user)) {
            try {
                await assertWarehouseAccess(prisma, user, warehouseId);
            } catch (err) {
                if (err instanceof NotFoundError) {
                    return res.status(404).json({ error: 'Stock level not found' });
                }
                throw err;
            }
        }

        const stockLevel = await prisma.$transaction(async (tx) => {
            const current = await tx.stockLevel.findUnique({
                where: {
                    warehouseId_itemId: {
                        warehouseId,
                        itemId
                    }
                }
            });

            if (!current) {
                throw new NotFoundError('Stock level not found');
            }

            if (current.quantity + delta < 0) {
                throw new RangeError('Insufficient stock');
            }

            const updated = await tx.stockLevel.update({
                where: { id: current.id },
                data: { quantity: { increment: delta } },
                include: { warehouse: true, item: true }
            });

            await tx.stockTransaction.create({
                data: {
                    warehouseId,
                    itemId,
                    quantity: delta,
                    type: 'adjustment',
                    note,
                    userId: Number(user.id)
                }
            });

            return updated;
        });

        res.json(stockLevel);
    } catch (error) {
        if (error instanceof NotFoundError) {
            return res.status(404).json({ error: error.message });
        }
        if (error instanceof RangeError) {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error adjusting stock:', error);
        res.status(500).json({ error: 'Failed to adjust stock' });
    }
});

// PATCH /api/stock-levels/:warehouseId/:itemId/limits - Update min/max limits (Admin/Approver)
router.patch('/:warehouseId/:itemId/limits', requireAuth, requireRole(['superadmin', 'admin', 'approver']), async (req: AuthRequest, res) => {
    try {
        const user = req.user!;
        const warehouseId = parsePositiveInt(req.params.warehouseId);
        const itemId = parsePositiveInt(req.params.itemId);
        if (!warehouseId || !itemId) {
            return res.status(400).json({ error: 'Invalid warehouse or item ID' });
        }
        const { minStock, maxStock } = req.body;

        if (!isAdminTier(user)) {
            try {
                await assertWarehouseAccess(prisma, user, warehouseId);
            } catch (err) {
                if (err instanceof NotFoundError) {
                    return res.status(404).json({ error: 'Stock level not found' });
                }
                throw err;
            }
        }

        const existing = await prisma.stockLevel.findUnique({
            where: {
                warehouseId_itemId: {
                    warehouseId,
                    itemId
                }
            }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Stock level not found' });
        }

        const stockLevel = await prisma.stockLevel.update({
            where: { id: existing.id },
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
