import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/warehouses - ดึงรายการคลังทั้งหมด
router.get('/', async (req, res) => {
    try {
        const warehouses = await prisma.warehouse.findMany({
            where: { isActive: true },
            include: {
                _count: {
                    select: { stockLevels: true }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json(warehouses);
    } catch (error) {
        console.error('Error fetching warehouses:', error);
        res.status(500).json({ error: 'Failed to fetch warehouses' });
    }
});

// GET /api/warehouses/:id - ดึงคลังตาม ID
router.get('/:id', async (req, res) => {
    try {
        const warehouse = await prisma.warehouse.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                stockLevels: {
                    include: {
                        item: true
                    }
                }
            }
        });

        if (!warehouse) {
            return res.status(404).json({ error: 'Warehouse not found' });
        }

        res.json(warehouse);
    } catch (error) {
        console.error('Error fetching warehouse:', error);
        res.status(500).json({ error: 'Failed to fetch warehouse' });
    }
});

// POST /api/warehouses - สร้างคลังใหม่ (Admin only)
router.post('/', requireAuth, requireRole(['superadmin', 'admin']), async (req, res) => {
    try {
        const { name, code, type, divisionId } = req.body;

        const warehouse = await prisma.warehouse.create({
            data: {
                name,
                code,
                type,
                divisionId: divisionId ? parseInt(divisionId) : null
            }
        });

        res.status(201).json(warehouse);
    } catch (error) {
        console.error('Error creating warehouse:', error);
        res.status(500).json({ error: 'Failed to create warehouse' });
    }
});

// PATCH /api/warehouses/:id - แก้ไขคลัง (Admin only)
router.patch('/:id', requireAuth, requireRole(['superadmin', 'admin']), async (req, res) => {
    try {
        const { name, isActive } = req.body;

        const warehouse = await prisma.warehouse.update({
            where: { id: parseInt(req.params.id) },
            data: {
                ...(name && { name }),
                ...(typeof isActive === 'boolean' && { isActive })
            }
        });

        res.json(warehouse);
    } catch (error) {
        console.error('Error updating warehouse:', error);
        res.status(500).json({ error: 'Failed to update warehouse' });
    }
});

export default router;
