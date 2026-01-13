
import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';

interface AuthRequest extends Request {
    user?: any;
}

const requestSchema = z.object({
    items: z.string(),
    type: z.string(), // withdraw, borrow, return
    assetId: z.number().optional(),
});

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

        // 2. Validate & Deduct Stock (Transaction)
        const result = await prisma.$transaction(async (tx) => {
            // Create Request
            const newRequest = await tx.request.create({
                data: {
                    ...data,
                    userId,
                    status: 'approved', // Auto-approve for now (or pending if workflow required)
                },
            });

            // Process Items
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
                });

                if (!stockLevel || stockLevel.quantity < quantity) {
                    throw new Error(`Insufficient stock for item ${itemId} in ${warehouse.name}`);
                }

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
        const { status } = req.body;

        const request = await prisma.request.update({
            where: { id: parseInt(id) },
            data: { status },
        });
        res.json(request);
    } catch (error) {
        res.status(400).json({ message: 'Error updating request', error });
    }
};
