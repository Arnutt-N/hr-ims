import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthRequest, requireAuth, requireRole } from '../middleware/auth';
import { assertWarehouseAccess, getManagedWarehouseIds, isAdminTier, NotFoundError, parsePositiveInt } from '../lib/authz';

const CreateStockTransferSchema = z.object({
    fromWarehouseId: z.coerce.number().int().positive(),
    toWarehouseId: z.coerce.number().int().positive(),
    itemId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive(),
    note: z.string().optional(),
});

const UpdateStockTransferStatusSchema = z.object({
    status: z.enum(['approved', 'rejected']),
});

const router = Router();

// GET /api/stock-transfers - ดึงรายการโอนพัสดุ (with filters)
router.get('/', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { status, warehouseId } = req.query;
        const user = req.user!;

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
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
        const user = req.user!;
        const transferId = parsePositiveInt(req.params.id);
        if (!transferId) {
            return res.status(400).json({ error: 'Invalid transfer ID' });
        }

        let where: any = { id: transferId };
        if (!isAdminTier(user)) {
            const managed = await getManagedWarehouseIds(prisma, user);
            where = {
                id: transferId,
                OR: [
                    { requestedBy: user.id },
                    ...(managed.length > 0 ? [
                        { fromWarehouseId: { in: managed } },
                        { toWarehouseId: { in: managed } }
                    ] : [])
                ]
            };
        }
        const transfer = await prisma.stockTransfer.findFirst({
            where,
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
router.post('/', requireAuth, async (req: AuthRequest, res) => {
    try {
        const parsed = CreateStockTransferSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid stock transfer payload', details: parsed.error.flatten() });
        }

        const { fromWarehouseId, toWarehouseId, itemId, quantity, note } = parsed.data;
        if (fromWarehouseId === toWarehouseId) {
            return res.status(400).json({ error: 'Source and destination warehouses must differ' });
        }

        const user = req.user!;

        // Source-warehouse scope check (V22, decided 2026-11-14)
        // ------------------------------------------------------
        // Creating a transfer reads the source warehouse's stock level and
        // echoes its quantity back in the `available` field of the error
        // response. Without this check any authenticated user could probe the
        // stock of a warehouse they do not manage by asking to move more than
        // it holds and reading `available` off the 400.
        //
        // The destination is deliberately NOT checked: receiving stock is the
        // point of a transfer request, and the approver gate on PATCH /:id
        // already requires the source warehouse to be in scope before anything
        // moves. Requiring destination scope here would block the normal case
        // of "send this to the central warehouse".
        //
        // Scope comes from `getManagedWarehouseIds`, which counts both warehouse
        // management and a department mapping. That is the same rule the
        // frontend uses to populate the source dropdown, so a user is never
        // offered a warehouse the API will refuse.
        //
        // 403, not 404: the warehouse exists, the caller just may not draw from
        // it. A 404 here would send the user hunting for a warehouse that is
        // plainly visible in the list, and would hide the real fix (ask an
        // admin for a department mapping).
        try {
            await assertWarehouseAccess(prisma, user, fromWarehouseId);
        } catch (err) {
            if (err instanceof NotFoundError) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'You do not have access to the source warehouse.',
                });
            }
            throw err;
        }

        // ตรวจสอบว่าคลังต้นทางมีของเพียงพอหรือไม่
        const stockLevel = await prisma.stockLevel.findUnique({
            where: {
                warehouseId_itemId: {
                    warehouseId: fromWarehouseId,
                    itemId
                }
            }
        });

        if (!stockLevel || stockLevel.quantity < quantity) {
            return res.status(400).json({
                error: 'Insufficient stock in source warehouse',
                available: stockLevel?.quantity || 0,
                requested: quantity
            });
        }

        const transfer = await prisma.stockTransfer.create({
            data: {
                fromWarehouseId,
                toWarehouseId,
                itemId,
                quantity,
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
router.patch('/:id', requireAuth, requireRole(['superadmin', 'admin', 'approver']), async (req: AuthRequest, res) => {
    try {
        const parsedStatus = UpdateStockTransferStatusSchema.safeParse(req.body);
        if (!parsedStatus.success) {
            return res.status(400).json({ error: 'Invalid status', details: parsedStatus.error.flatten() });
        }
        const { status } = parsedStatus.data;
        const user = req.user!;
        const transferId = parsePositiveInt(req.params.id);
        if (!transferId) {
            return res.status(400).json({ error: 'Invalid transfer ID' });
        }

        const transfer = await prisma.stockTransfer.findUnique({
            where: { id: transferId }
        });

        if (!transfer) {
            return res.status(404).json({ error: 'Transfer not found' });
        }

        try {
            await assertWarehouseAccess(prisma, user, transfer.fromWarehouseId);
        } catch (err) {
            if (err instanceof NotFoundError) {
                return res.status(404).json({ error: 'Transfer not found' });
            }
            throw err;
        }

        if (transfer.status !== 'pending') {
            return res.status(400).json({ error: 'Transfer already processed' });
        }

        // ถ้าอนุมัติ ให้ทำการโอนสต็อก
        if (status === 'approved') {
            await prisma.$transaction(async (tx) => {
                const sourceStock = await tx.stockLevel.findUnique({
                    where: {
                        warehouseId_itemId: {
                            warehouseId: transfer.fromWarehouseId,
                            itemId: transfer.itemId
                        }
                    }
                });

                if (!sourceStock || sourceStock.quantity < transfer.quantity) {
                    throw new RangeError('Insufficient stock in source warehouse');
                }

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

                await tx.stockTransaction.create({
                    data: {
                        warehouseId: transfer.fromWarehouseId,
                        itemId: transfer.itemId,
                        quantity: -transfer.quantity,
                        type: 'transfer_out',
                        note: transfer.note || `Transfer #${transferId} out`,
                        userId: Number(user.id)
                    }
                });

                await tx.stockTransaction.create({
                    data: {
                        warehouseId: transfer.toWarehouseId,
                        itemId: transfer.itemId,
                        quantity: transfer.quantity,
                        type: 'transfer_in',
                        note: transfer.note || `Transfer #${transferId} in`,
                        userId: Number(user.id)
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
        if (error instanceof RangeError) {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error updating transfer:', error);
        res.status(500).json({ error: 'Failed to update transfer' });
    }
});

export default router;
