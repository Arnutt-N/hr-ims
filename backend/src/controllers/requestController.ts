
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
        const { role, userId } = req.user;

        let where = {};
        if (role === 'user') {
            where = { userId };
        }

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
        const { userId, department } = req.user; // Ensure 'department' is available in token or fetched user
        const data = requestSchema.parse(req.body);
        const requestItems = JSON.parse(data.items); // Assuming items is JSON string of { itemId, quantity }

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

        // 2. Validate & Deduct Stock (Transaction)
        const result = await prisma.$transaction(async (tx) => {
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
                const { id: itemId, quantity } = item;

                // Check StockLevel
                const stockLevel = await tx.stockLevel.findUnique({
                    where: {
                        warehouseId_itemId: {
                            warehouseId: warehouse.id,
                            itemId: parseInt(itemId),
                        },
                    },
                    include: { item: true },
                });

                if (!stockLevel || stockLevel.quantity < quantity) {
                    throw new Error(`Insufficient stock for item ${itemId} in ${warehouse.name}`);
                }

                processedItems.push({
                    id: parseInt(itemId),
                    name: stockLevel.item.name,
                    quantity,
                });

                // Deduct Stock
                await tx.stockLevel.update({
                    where: {
                        warehouseId_itemId: {
                            warehouseId: warehouse.id,
                            itemId: parseInt(itemId),
                        },
                    },
                    data: {
                        quantity: { decrement: quantity },
                    },
                });

                // Create RequestItem (if you haven't linked it yet, though schema has it)
                // Assuming RequestItem model exists and is linked
                await tx.requestItem.create({
                    data: {
                        requestId: newRequest.id,
                        itemId: parseInt(itemId),
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

            // 3. Check Low Stock for each item
            for (const item of processedItems) {
                checkAndAlertLowStock(item.id, warehouse.id, tx).catch((err) =>
                    console.error('Low stock check failed:', err)
                );
            }

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
        const { status, statusMessage } = req.body;

        // Fetch request with user info before update
        const existingRequest = await prisma.request.findUnique({
            where: { id: parseInt(id) },
            include: {
                user: { select: { name: true, email: true } },
                requestItems: { include: { item: true } },
            },
        });

        if (!existingRequest) {
            return res.status(404).json({ message: 'Request not found' });
        }

        const request = await prisma.request.update({
            where: { id: parseInt(id) },
            data: { status },
        });

        // ===== SEND NOTIFICATION ON STATUS CHANGE =====
        if (existingRequest.user?.email) {
            const itemsDisplay = existingRequest.requestItems
                .map((ri) => `${ri.item.name} x${ri.quantity}`)
                .join(', ');

            const emailHtml = emailTemplates.requestStatusChanged({
                userName: existingRequest.user.name || 'ผู้ใช้งาน',
                requestId: request.id,
                requestType: formatRequestType(request.type),
                items: itemsDisplay || existingRequest.items || 'ไม่ระบุ',
                status: status as 'approved' | 'rejected' | 'pending',
                statusMessage,
            });

            const statusText =
                status === 'approved' ? 'อนุมัติแล้ว' : status === 'rejected' ? 'ถูกปฏิเสธ' : 'อัปเดต';

            sendEmail(
                existingRequest.user.email,
                `[HR-IMS] คำขอ #${request.id} ${statusText}`,
                emailHtml
            ).catch((err) => console.error('Email send failed:', err));
        }

        res.json(request);
    } catch (error) {
        res.status(400).json({ message: 'Error updating request', error });
    }
};
