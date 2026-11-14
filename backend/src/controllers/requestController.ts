
import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import {
    sendEmail,
    sendTelegramAlert,
    emailTemplates,
    telegramTemplates,
    checkAndAlertLowStock,
} from '../services/notificationService';

interface AuthRequest extends Request {
    user?: any;
}

const requestSchema = z.object({
    items: z.string(),
    type: z.string(), // withdraw, borrow, return
    assetId: z.number().optional(),
});

const RequestItemPayloadSchema = z.object({
    id: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive(),
});

const RequestItemsArraySchema = z.array(RequestItemPayloadSchema).min(1);

const UpdateRequestStatusSchema = z.object({
    status: z.enum(['approved', 'rejected', 'cancelled']),
    statusMessage: z.string().optional(),
});

// Helper: Format request type for display
const formatRequestType = (type: string): string => {
    const typeMap: Record<string, string> = {
        withdraw: 'เบิกพัสดุ',
        borrow: 'ยืมพัสดุ',
        return: 'คืนพัสดุ',
    };
    return typeMap[type] || type;
};

// Helper: Format items list for display
const formatItemsList = (items: any[]): string => {
    return items.map((item) => `${item.name || `Item #${item.id}`} x${item.quantity}`).join(', ');
};

export const getRequests = async (req: AuthRequest, res: Response) => {
    try {
        const { role } = req.user;
        const userId = req.user.userId ?? req.user.id;

        // Visibility policy (V20/V21, decided 2026-11-14)
        // -------------------------------------------------
        // Only the approver tier sees every request. Everyone else — including
        // `technician` and `auditor` — sees only their own.
        //
        // Why this and not "technician sees everything":
        // - The frontend already enforces exactly this. `lib/actions/requests.ts`
        //   gates on APPROVER_ROLES (admin/superadmin/approver) and scopes
        //   everyone else to `where.userId = session.user.id`. The backend was
        //   the looser of the two, so the same user saw different data depending
        //   on which surface answered.
        // - A technician has no approval authority (requireRole on the status
        //   route excludes the role), so seeing other people's requests grants
        //   visibility with no matching responsibility.
        // - The seed grants `technician` no `/requests` menu entry at all.
        //
        // Keeping the two surfaces identical is the point: a policy that only
        // one of them enforces is not a policy, it is a gap.
        const APPROVER_TIER = ['superadmin', 'admin', 'approver'];
        const roles: string[] = Array.isArray(req.user.roles) && req.user.roles.length > 0
            ? req.user.roles
            : [role];
        const seesAll = roles.some((r) => APPROVER_TIER.includes(String(r).toLowerCase()));

        const where = seesAll ? {} : { userId };

        const requests = await prisma.request.findMany({
            where,
            include: { user: { select: { name: true, email: true, department: true } } },
            orderBy: { date: 'desc' },
        });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching requests', error });
    }
};

// Helper to get user's warehouse
const getUserWarehouse = async (department: string | null) => {
    if (!department) return null;

    // Simplistic mapping: Department Name -> Warehouse
    // In real app, you might look up Division -> Warehouse relation
    // For now, we assume user.department matches Warehouse.name or mapped via Division

    // Default to WH-CENTRAL if not found for now (or handle error)
    // Ideally: const division = await prisma.division.findFirst({ where: { name: department } });
    //          const warehouse = await prisma.warehouse.findFirst({ where: { divisionId: division.id } });

    // Temporary logic: specific warehouse for "IT" dept, else CENTRAL
    // You should enhance this based on your real OrganizationUnit structure
    if (department.includes('IT') || department.includes('เทคโนโลยี')) {
        return await prisma.warehouse.findUnique({ where: { code: 'WH-IT' } });
    }

    return await prisma.warehouse.findUnique({ where: { code: 'WH-CENTRAL' } });
};

export const createRequest = async (req: AuthRequest, res: Response) => {
    try {
        const { department } = req.user;
        const userId = req.user.userId ?? req.user.id;
        const data = requestSchema.parse(req.body);
        const requestItems = RequestItemsArraySchema.parse(JSON.parse(data.items)); // Assuming items is JSON string of { id, quantity }

        // 1. Identify Warehouse
        // Determine which warehouse this user withdraws from
        // If department is available, try to find linked warehouse
        const warehouse = await getUserWarehouse(department || 'Central');

        if (!warehouse) {
            return res.status(400).json({ message: 'User warehouse not found' });
        }

        // Fetch user details for notification
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true, department: true },
        });

        // 2. Validate and Reserve Stock
        const result = await prisma.$transaction(async (tx: any) => {
            // Create Request
            const newRequest = await tx.request.create({
                data: {
                    ...data,
                    userId,
                    warehouseId: warehouse.id,
                    status: 'pending', // Changed to pending for approval workflow
                },
            });

            // Process Items
            const processedItems: { id: number; name: string; quantity: number }[] = [];

            for (const item of requestItems) {
                const { id: parsedItemId, quantity } = item;

                const inventoryItem = await tx.inventoryItem.findUnique({
                    where: { id: parsedItemId },
                });

                if (!inventoryItem) {
                    throw new Error(`Item ${parsedItemId} not found`);
                }

                // Check available stock (quantity - reserved)
                const stockLevel = await tx.stockLevel.findUnique({
                    where: {
                        warehouseId_itemId: {
                            warehouseId: warehouse.id,
                            itemId: parsedItemId,
                        },
                    },
                });

                if (!stockLevel) {
                    throw new Error(`Stock level not found for item ${inventoryItem.name} in warehouse ${warehouse.name}`);
                }

                const available = stockLevel.quantity - stockLevel.reserved;
                if (available < quantity) {
                    throw new Error(
                        `Insufficient available stock for item ${inventoryItem.name}. Available: ${available}, Requested: ${quantity}`
                    );
                }

                // Reserve stock
                await tx.stockLevel.update({
                    where: {
                        warehouseId_itemId: {
                            warehouseId: warehouse.id,
                            itemId: parsedItemId,
                        },
                    },
                    data: {
                        reserved: { increment: quantity },
                    },
                });

                processedItems.push({
                    id: parsedItemId,
                    name: inventoryItem.name,
                    quantity,
                });

                // Create RequestItem
                await tx.requestItem.create({
                    data: {
                        requestId: newRequest.id,
                        itemId: parsedItemId,
                        quantity: quantity,
                    }
                });
            }

            // ===== NOTIFICATIONS (after transaction success) =====
            const itemsDisplay = formatItemsList(processedItems);
            const dateDisplay = new Date().toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });

            // 1. Send Email to User
            if (user?.email) {
                const emailHtml = emailTemplates.requestCreated({
                    userName: user.name || 'ผู้ใช้งาน',
                    requestId: newRequest.id,
                    requestType: formatRequestType(data.type),
                    items: itemsDisplay,
                    date: dateDisplay,
                });
                sendEmail(
                    user.email,
                    `[HR-IMS] คำขอ #${newRequest.id} ถูกสร้างแล้ว`,
                    emailHtml
                ).catch((err) => console.error('Email send failed:', err));
            }

            // 2. Send Telegram to Admin Group
            sendTelegramAlert(
                telegramTemplates.newRequest({
                    requestId: newRequest.id,
                    userName: user?.name || 'ไม่ระบุ',
                    department: user?.department || 'ไม่ระบุ',
                    requestType: formatRequestType(data.type),
                    items: itemsDisplay,
                })
            ).catch((err) => console.error('Telegram send failed:', err));

            return newRequest;
        });

        res.status(201).json(result);
    } catch (error: any) {
        console.error('Create Request Error:', error);
        res.status(400).json({ message: error.message || 'Error creating request' });
    }
};

export const updateRequestStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const parsedBody = UpdateRequestStatusSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return res.status(400).json({ message: 'Invalid status', details: parsedBody.error.flatten() });
        }
        const { status, statusMessage } = parsedBody.data;

        const requestIdNum = parseInt(id);
        const lowStockChecks: Array<{ itemId: number; warehouseId: number }> = [];

        const result = await prisma.$transaction(async (tx: any) => {
            // Fetch request with items and user info
            const existingRequest = await tx.request.findUnique({
                where: { id: requestIdNum },
                include: {
                    user: { select: { name: true, email: true } },
                    requestItems: { include: { item: true } },
                },
            });

            if (!existingRequest) {
                throw new Error('Request not found');
            }

            if (existingRequest.status !== 'pending') {
                throw new Error(`Request is already ${existingRequest.status}`);
            }

            if (status === 'approved') {
                if (!existingRequest.warehouseId) {
                    throw new Error('Request warehouse not found');
                }
                for (const ri of existingRequest.requestItems) {
                    const stockLevel = await tx.stockLevel.findUnique({
                        where: {
                            warehouseId_itemId: {
                                warehouseId: existingRequest.warehouseId,
                                itemId: ri.itemId,
                            },
                        },
                    });

                    // With reservation system, quantity should already be reserved.
                    if (!stockLevel) {
                        throw new Error(`Stock level not found for item ${ri.itemId} in warehouse ${existingRequest.warehouseId}`);
                    }
                    if (stockLevel.reserved < ri.quantity) {
                        throw new Error(`Reserved stock mismatch for item ${ri.itemId} in warehouse ${existingRequest.warehouseId}`);
                    }
                    if (stockLevel.quantity < ri.quantity) {
                        throw new Error(`Insufficient stock for item ${ri.itemId} in warehouse ${existingRequest.warehouseId}`);
                    }

                    // Convert reservation to actual deduction
                    await tx.stockLevel.update({
                        where: {
                            warehouseId_itemId: {
                                warehouseId: existingRequest.warehouseId,
                                itemId: ri.itemId,
                            },
                        },
                        data: {
                            quantity: { decrement: ri.quantity },
                            reserved: { decrement: ri.quantity },
                        },
                    });

                    await tx.inventoryItem.update({
                        where: { id: ri.itemId },
                        data: {
                            stock: { decrement: ri.quantity },
                        },
                    });

                    // Create history record
                    await tx.history.create({
                        data: {
                            item: ri.item.name,
                            action: existingRequest.type,
                            status: 'approved',
                            userId: existingRequest.userId,
                        },
                    });

                    // Queue low stock check after transaction commits
                    lowStockChecks.push({
                        itemId: ri.itemId,
                        warehouseId: existingRequest.warehouseId,
                    });
                }
            } else if (status === 'rejected' || status === 'cancelled') {
                if (existingRequest.requestItems.length > 0 && !existingRequest.warehouseId) {
                    throw new Error('Request warehouse not found');
                }
                for (const ri of existingRequest.requestItems) {
                    const stockLevel = await tx.stockLevel.findUnique({
                        where: {
                            warehouseId_itemId: {
                                warehouseId: existingRequest.warehouseId,
                                itemId: ri.itemId,
                            },
                        },
                    });

                    if (stockLevel && stockLevel.reserved >= ri.quantity) {
                        // Release reservation only (do not touch actual quantity)
                        await tx.stockLevel.update({
                            where: {
                                warehouseId_itemId: {
                                    warehouseId: existingRequest.warehouseId,
                                    itemId: ri.itemId,
                                },
                            },
                            data: {
                                reserved: { decrement: ri.quantity },
                            },
                        });
                    }

                    // Create history record
                    await tx.history.create({
                        data: {
                            item: ri.item.name,
                            action: existingRequest.type,
                            status,
                            userId: existingRequest.userId,
                        },
                    });
                }
            }

            const updatedRequest = await tx.request.update({
                where: { id: requestIdNum },
                data: { status },
            });

            return { updatedRequest, existingRequest };
        });

        const { updatedRequest, existingRequest } = result;

        // Check low stock outside transaction using root prisma client
        for (const check of lowStockChecks) {
            checkAndAlertLowStock(check.itemId, check.warehouseId, prisma).catch((err) =>
                console.error('Low stock check failed:', err)
            );
        }

        // ===== SEND NOTIFICATION ON STATUS CHANGE =====
        if (existingRequest.user?.email) {
            const itemsDisplay = existingRequest.requestItems
                .map((ri: any) => `${ri.item.name} x${ri.quantity}`)
                .join(', ');

            const emailHtml = emailTemplates.requestStatusChanged({
                userName: existingRequest.user.name || 'ผู้ใช้งาน',
                requestId: updatedRequest.id,
                requestType: formatRequestType(updatedRequest.type),
                items: itemsDisplay || existingRequest.items || 'ไม่ระบุ',
                status: status as 'approved' | 'rejected' | 'pending' | 'cancelled',
                statusMessage,
            });

            const statusText =
                status === 'approved'
                    ? 'อนุมัติแล้ว'
                    : status === 'rejected'
                      ? 'ถูกปฏิเสธ'
                      : status === 'cancelled'
                        ? 'ถูกยกเลิก'
                        : 'อัปเดต';

            sendEmail(
                existingRequest.user.email,
                `[HR-IMS] คำขอ #${updatedRequest.id} ${statusText}`,
                emailHtml
            ).catch((err) => console.error('Email send failed:', err));
        }

        res.json(updatedRequest);
    } catch (error: any) {
        console.error('Update Request Status Error:', error);
        res.status(400).json({ message: error.message || 'Error updating request', error });
    }
};
