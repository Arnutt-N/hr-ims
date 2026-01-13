import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/departments/mappings - Get all department mappings
router.get('/mappings', requireAuth, requireRole(['superadmin', 'admin']), async (req, res) => {
    try {
        const mappings = await prisma.departmentMapping.findMany({
            include: {
                warehouse: true
            },
            orderBy: {
                department: 'asc'
            }
        });
        res.json(mappings);
    } catch (error) {
        console.error('Error fetching mappings:', error);
        res.status(500).json({ error: 'Failed to fetch mappings' });
    }
});

// GET /api/departments/unique - Get all unique departments from User table
router.get('/unique', requireAuth, requireRole(['superadmin', 'admin']), async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { department: true },
            where: { department: { not: null } },
            distinct: ['department']
        });

        // Filter out empty strings and return simple array
        const departments = users
            .map(u => u.department)
            .filter(d => d && d.trim() !== '')
            .sort();

        res.json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});

// POST /api/departments/mappings - Create or update a mapping
router.post('/mappings', requireAuth, requireRole(['superadmin', 'admin']), async (req, res) => {
    try {
        const { department, warehouseId } = req.body;

        if (!department || !warehouseId) {
            return res.status(400).json({ error: 'Department and Warehouse ID are required' });
        }

        // Upsert: Create if not exists, update if exists
        const mapping = await prisma.departmentMapping.upsert({
            where: {
                department: department
            },
            update: {
                warehouseId: parseInt(warehouseId)
            },
            create: {
                department: department,
                warehouseId: parseInt(warehouseId)
            },
            include: {
                warehouse: true
            }
        });

        res.json(mapping);
    } catch (error) {
        console.error('Error saving mapping:', error);
        res.status(500).json({ error: 'Failed to save mapping' });
    }
});

// DELETE /api/departments/mappings/:id - Delete a mapping
router.delete('/mappings/:id', requireAuth, requireRole(['superadmin', 'admin']), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await prisma.departmentMapping.delete({
            where: { id }
        });
        res.json({ message: 'Mapping deleted successfully' });
    } catch (error) {
        console.error('Error deleting mapping:', error);
        res.status(500).json({ error: 'Failed to delete mapping' });
    }
});

// GET /api/departments/my-mapping - Get mapping for current user
router.get('/my-mapping', requireAuth, async (req: any, res: any) => {
    try {
        const userId = parseInt(req.user.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { department: true }
        });

        if (!user || !user.department) {
            return res.json({ warehouseId: null });
        }

        const mapping = await prisma.departmentMapping.findUnique({
            where: { department: user.department },
            include: { warehouse: true }
        });

        res.json({ warehouseId: mapping ? mapping.warehouseId : null, warehouse: mapping?.warehouse });

    } catch (error) {
        console.error('Error fetching my mapping:', error);
        res.status(500).json({ error: 'Failed to fetch my mapping' });
    }
});

export default router;
