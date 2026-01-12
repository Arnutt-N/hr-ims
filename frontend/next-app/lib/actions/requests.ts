'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

export async function getRequests(status?: string) {
    const session = await auth();
    if (!session) return { error: 'Unauthorized' };

    // If user is admin, show all. If user, show only theirs?
    // Requests page usually for Admin to approve.
    // User sees their history in 'history' or 'my-assets'.
    // Assuming this page is for Admin.

    /* 
    // Role check (uncomment when role logic is strict)
    if (session.user.role !== 'admin') {
       return { error: 'Forbidden' };
    }
    */

    const where = status ? { status } : {};

    try {
        const requests = await prisma.request.findMany({
            where,
            include: {
                user: {
                    select: { name: true, email: true, department: true, avatar: true }
                },
                requestItems: {
                    include: {
                        item: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return { success: true, data: requests };
    } catch (error) {
        console.error('Failed to fetch requests:', error);
        return { error: 'Failed to fetch requests' };
    }
}

export async function updateRequestStatus(id: number, status: 'approved' | 'rejected') {
    const session = await auth();
    if (!session) return { error: 'Unauthorized' };

    try {
        // 1. Get request with items
        const request = await prisma.request.findUnique({
            where: { id },
            include: { requestItems: { include: { item: true } } }
        });

        if (!request) return { error: 'Request not found' };

        // 2. Logic for approval
        if (status === 'approved') {
            // Check stock for all items
            for (const reqItem of request.requestItems) {
                if (request.type === 'withdraw' || request.type === 'borrow') {
                    if (reqItem.item.type === 'consumable' || reqItem.item.type === 'durable') {
                        if (reqItem.item.stock < reqItem.quantity) {
                            return { error: `Not enough stock for ${reqItem.item.name}` };
                        }
                    }
                }
            }

            // Deduct stock / Update status
            await prisma.$transaction(async (tx) => {
                for (const reqItem of request.requestItems) {
                    if (request.type === 'withdraw') {
                        // Consumable: reduce stock
                        await tx.inventoryItem.update({
                            where: { id: reqItem.itemId },
                            data: { stock: { decrement: reqItem.quantity } }
                        });

                        // Create History
                        await tx.history.create({
                            data: {
                                userId: request.userId,
                                action: 'withdraw',
                                item: reqItem.item.name,
                                status: 'approved',
                            }
                        });

                    } else if (request.type === 'borrow') {
                        // Durable: mark as borrowed? Or reduce stock?
                        // Usually borrow reduces Available stock.
                        await tx.inventoryItem.update({
                            where: { id: reqItem.itemId },
                            data: {
                                stock: { decrement: reqItem.quantity },
                                // status: 'borrowed' // If quantity > 0, maybe still available? 
                                // Simple logic: decrement stock.
                            }
                        });

                        // Create History
                        await tx.history.create({
                            data: {
                                userId: request.userId,
                                action: 'borrow',
                                item: reqItem.item.name,
                                status: 'approved',
                            }
                        });
                    } else if (request.type === 'return') {
                        // Return: increase stock
                        await tx.inventoryItem.update({
                            where: { id: reqItem.itemId },
                            data: { stock: { increment: reqItem.quantity } }
                        });
                        // Create History
                        await tx.history.create({
                            data: {
                                userId: request.userId,
                                action: 'return',
                                item: reqItem.item.name,
                                status: 'completed',
                            }
                        });
                    }
                }

                // Update Request Status
                await tx.request.update({
                    where: { id },
                    data: { status }
                });
            });

        } else {
            // Rejected: just update status
            await prisma.request.update({
                where: { id },
                data: { status }
            });
        }

        revalidatePath('/requests');
        revalidatePath('/inventory');
        return { success: true };

    } catch (error) {
        console.error('Failed to update request:', error);
        return { error: 'Failed to update request' };
    }
}
