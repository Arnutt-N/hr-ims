import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRole } from '../middleware/auth';
import { getManagedWarehouseIds, isAdminTier } from '../lib/authz';

const router = Router();
const prisma = new PrismaClient();

// GET /api/stock-transfers - ดึงรายการโอนพัสดุ (with filters)
// [2026-11-12] Modified by Claude: requireAuth + scope list ตาม warehouses ที่ user จัดการ (admin tier เห็นหมด)
router.get('/', requireAuth, async (req, res) => {
    try {
        const { status, warehouseId } = req.query;
        const user = (req as any).user;

        const conditions: any[] = [];
        if (warehouseId) {
            conditions.push({
                OR: [
                    { fromWarehouseId: parseInt(warehouseId as string) },
                    { toWarehouseId: parseInt(warehouseId as string) }
                ]
            });
        }
        if (!isAdminTier(user)) {
            const managed = await getManagedWarehouseIds(prisma, user);
            conditions.push({
                OR: [
                    ...(managed.length > 0 ? [
                        { fromWarehouseId: { in: managed } },
                        { toWarehouseId: { in: managed } }
                    ] : []),
                    { requestedBy: user.id }
                ]
            });
        }

        const where: any = {
            ...(status && { status: status as string }),
            ...(conditions.length > 0 && { AND: conditions })
        };

        const transfers = await prisma.stockTransfer.findMany({
            where,
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
// [2026-11-12] Modified by Claude: requireAuth + object-level scope (404 เมื่อไม่พบ/ไม่มีสิทธิ์)
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const transferId = parseInt(req.params.id);

        const managed = await getManagedWarehouseIds(prisma, user);
        const transfer = await prisma.stockTransfer.findFirst({
            where: isAdminTier(user)
                ? { id: transferId }
                : {
                    id: transferId,
                    OR: [
                        { requestedBy: user.id },
                        ...(managed.length > 0 ? [
                            { fromWarehouseId: { in: managed } },
                            { toWarehouseId: { in: managed } }
                        ] : [])
                    ]
                },
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
        // [2026-11-12] Modified by Claude: requestedBy มาจาก session เท่านั้น (body field ถูกละ)
        const { fromWarehouseId, toWarehouseId, itemId, quantity, note } = req.body;
        const user = (req as any).user;

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
                requestedBy: user.id,
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
        const { status } = req.body;
        const user = (req as any).user;
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
                        approvedBy: user.id,
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
                    approvedBy: user.id
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
