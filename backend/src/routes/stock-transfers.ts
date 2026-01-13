import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/stock-transfers - ดึงรายการโอนพัสดุ (with filters)
router.get('/', async (req, res) => {
    try {
        const { status, warehouseId } = req.query;

        const transfers = await prisma.stockTransfer.findMany({
            where: {
                ...(status && { status: status as string }),
                ...(warehouseId && {
                    OR: [
                        { fromWarehouseId: parseInt(warehouseId as string) },
                        { toWarehouseId: parseInt(warehouseId as string) }
                    ]
                })
            },
            include: {
                fromWarehouse: true,
                toWarehouse: true,
                item: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(transfers);
    } catch (error) {
        console.error('Error fetching stock transfers:', error);
        res.status(500).json({ error: 'Failed to fetch stock transfers' });
    }
});

// GET /api/stock-transfers/:id - ดึงรายละเอียดการโอนตาม ID
router.get('/:id', async (req, res) => {
    try {
        const transfer = await prisma.stockTransfer.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                fromWarehouse: true,
                toWarehouse: true,
                item: true
            }
        });

        if (!transfer) {
            return res.status(404).json({ error: 'Transfer not found' });
        }

        res.json(transfer);
    } catch (error) {
        console.error('Error fetching transfer:', error);
        res.status(500).json({ error: 'Failed to fetch transfer' });
    }
});

// POST /api/stock-transfers - สร้างคำขอโอนพัสดุ (Authenticated users)
router.post('/', requireAuth, async (req, res) => {
    try {
        const { fromWarehouseId, toWarehouseId, itemId, quantity, note, requestedBy } = req.body;

        // ตรวจสอบว่าคลังต้นทางมีของเพียงพอหรือไม่
        const stockLevel = await prisma.stockLevel.findUnique({
            where: {
                warehouseId_itemId: {
                    warehouseId: parseInt(fromWarehouseId),
                    itemId: parseInt(itemId)
                }
            }
        });

        if (!stockLevel || stockLevel.quantity < parseInt(quantity)) {
            return res.status(400).json({
                error: 'Insufficient stock in source warehouse',
                available: stockLevel?.quantity || 0,
                requested: parseInt(quantity)
            });
        }

        const transfer = await prisma.stockTransfer.create({
            data: {
                fromWarehouseId: parseInt(fromWarehouseId),
                toWarehouseId: parseInt(toWarehouseId),
                itemId: parseInt(itemId),
                quantity: parseInt(quantity),
                requestedBy: parseInt(requestedBy),
                note,
                status: 'pending'
            },
            include: {
                fromWarehouse: true,
                toWarehouse: true,
                item: true
            }
        });

        res.status(201).json(transfer);
    } catch (error) {
        console.error('Error creating transfer:', error);
        res.status(500).json({ error: 'Failed to create transfer' });
    }
});

// PATCH /api/stock-transfers/:id - อนุมัติ/ปฏิเสธการโอน (Approver/Admin only)
router.patch('/:id', requireAuth, requireRole(['superadmin', 'admin', 'approver']), async (req, res) => {
    try {
        const { status, approvedBy } = req.body;
        const transferId = parseInt(req.params.id);

        // ดึงข้อมูลการโอน
        const transfer = await prisma.stockTransfer.findUnique({
            where: { id: transferId }
        });

        if (!transfer) {
            return res.status(404).json({ error: 'Transfer not found' });
        }

        if (transfer.status !== 'pending') {
            return res.status(400).json({ error: 'Transfer already processed' });
        }

        // ถ้าอนุมัติ ให้ทำการโอนสต็อก
        if (status === 'approved') {
            await prisma.$transaction(async (tx) => {
                // ลดสต็อกคลังต้นทาง
                await tx.stockLevel.update({
                    where: {
                        warehouseId_itemId: {
                            warehouseId: transfer.fromWarehouseId,
                            itemId: transfer.itemId
                        }
                    },
                    data: {
                        quantity: {
                            decrement: transfer.quantity
                        }
                    }
                });

                // เพิ่มสต็อกคลังปลายทาง (upsert กรณียังไม่มี record)
                await tx.stockLevel.upsert({
                    where: {
                        warehouseId_itemId: {
                            warehouseId: transfer.toWarehouseId,
                            itemId: transfer.itemId
                        }
                    },
                    update: {
                        quantity: {
                            increment: transfer.quantity
                        }
                    },
                    create: {
                        warehouseId: transfer.toWarehouseId,
                        itemId: transfer.itemId,
                        quantity: transfer.quantity
                    }
                });

                // อัพเดทสถานะการโอน
                await tx.stockTransfer.update({
                    where: { id: transferId },
                    data: {
                        status: 'completed',
                        approvedBy: parseInt(approvedBy),
                        completedAt: new Date()
                    }
                });
            });
        } else if (status === 'rejected') {
            // ปฏิเสธการโอน
            await prisma.stockTransfer.update({
                where: { id: transferId },
                data: {
                    status: 'rejected',
                    approvedBy: parseInt(approvedBy)
                }
            });
        }

        // ดึงข้อมูลที่อัพเดทแล้ว
        const updatedTransfer = await prisma.stockTransfer.findUnique({
            where: { id: transferId },
            include: {
                fromWarehouse: true,
                toWarehouse: true,
                item: true
            }
        });

        res.json(updatedTransfer);
    } catch (error) {
        console.error('Error updating transfer:', error);
        res.status(500).json({ error: 'Failed to update transfer' });
    }
});

export default router;
