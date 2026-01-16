'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { sendOverdueEmail, sendStatusUpdateEmail } from '@/lib/mail';

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

export async function updateRequestStatus(id: number, status: 'approved' | 'rejected', dueDate?: Date) {
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
            // Check stock for all items logic
            // Need to verify if we have enough stock in the specific warehouse (if applicable)
            // For now, we rely on the check inside the loop or just proceed.

            // Deduct stock / Update status
            await prisma.$transaction(async (tx: any) => {
                for (const reqItem of request.requestItems) {
                    // Determine warehouse (default to mapped or Central)
                    const warehouseId = (request as any).warehouseId;

                    if (request.type === 'withdraw' || request.type === 'borrow') {
                        // Logic: Find StockLevel
                        if (warehouseId) {
                            const stockLevel = await tx.stockLevel.findFirst({
                                where: { itemId: reqItem.itemId, warehouseId: warehouseId }
                            });

                            if (stockLevel) {
                                // Check stock sufficiency
                                if (stockLevel.quantity < reqItem.quantity) {
                                    throw new Error(`Not enough stock for ${reqItem.item.name} in selected warehouse`);
                                }

                                const newQty = stockLevel.quantity - reqItem.quantity;
                                await tx.stockLevel.update({
                                    where: { id: stockLevel.id },
                                    data: { quantity: newQty }
                                });

                                // Check Low Stock Notification
                                const minStock = stockLevel.minStock ?? 0;
                                if (newQty <= minStock) {
                                    // Notify Approver
                                    await tx.notification.create({
                                        data: {
                                            userId: parseInt(session.user.id),
                                            text: `⚠️ Low Stock Alert: ${reqItem.item.name} is down to ${newQty} items.`,
                                            read: false
                                        }
                                    });
                                }
                            }
                        }

                        // Also update legacy stock for backward compatibility (optional but safe)
                        await tx.inventoryItem.update({
                            where: { id: reqItem.itemId },
                            data: { stock: { decrement: reqItem.quantity } }
                        });

                        // Create History
                        await tx.history.create({
                            data: {
                                userId: request.userId,
                                action: request.type,
                                item: reqItem.item.name,
                                status: 'approved',
                            }
                        });

                    } else if (request.type === 'return') {
                        // Return: increase stock
                        if (warehouseId) {
                            const stockLevel = await tx.stockLevel.findFirst({
                                where: { itemId: reqItem.itemId, warehouseId: warehouseId }
                            });
                            if (stockLevel) {
                                await tx.stockLevel.update({
                                    where: { id: stockLevel.id },
                                    data: { quantity: { increment: reqItem.quantity } }
                                });
                            }
                        }

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
                    data: {
                        status,
                        dueDate: dueDate // Save due date if provided
                    }
                });
            });

        } else {
            // Rejected: just update status
            await prisma.request.update({
                where: { id },
                data: { status }
            });
        }

        // Send Email Notification for Status Update
        const requestUser = await prisma.user.findUnique({
            where: { id: request.userId },
            select: { email: true, name: true }
        });
        if (requestUser?.email) {
            await sendStatusUpdateEmail(requestUser, request, status);
        }

        revalidatePath('/requests');
        revalidatePath('/inventory');
        return { success: true };

    } catch (error) {
        console.error('Failed to update request:', error);
        return { error: 'Failed to update request' };
    }
}

export async function checkOverdueItems() {
    try {
        const now = new Date();

        // Find overdue items that are approved, not returned, and past due date
        // Note: Prisma select over dates needs careful handling. 
        // We select active borrow requests with dueDate < now
        // And we assume 'pending' or 'approved' status (usually 'approved' is active borrow)
        // Actually, we should check 'approved' borrow requests that don't have 'returnedAt' set (if we implemented that logic fully)
        // But for simply marking overdue:

        const overdueRequests = await prisma.request.findMany({
            where: {
                status: 'approved',
                type: 'borrow',
                dueDate: { lt: now }, // Due date is in the past
                returnedAt: null, // Ensure item is NOT returned
                isOverdue: false // Not yet marked
            }
        });

        if (overdueRequests.length > 0) {
            await prisma.$transaction(async (tx: any) => {
                for (const req of overdueRequests) {
                    // Mark as overdue
                    await tx.request.update({
                        where: { id: req.id },
                        data: { isOverdue: true }
                    });

                    // Notify User
                    await tx.notification.create({
                        data: {
                            userId: req.userId,
                            text: `🚨 OVERDUE: Your borrowed items (Req #${req.id}) are overdue. Please return them immediately.`,
                            read: false
                        }
                    });

                    // Send Email Notification
                    const user = await tx.user.findUnique({
                        where: { id: req.userId },
                        select: { email: true, name: true }
                    });
                    if (user?.email) {
                        await sendOverdueEmail(user, req);
                    }
                }
            });
            return { success: true, count: overdueRequests.length };
        }

        return { success: true, count: 0 };
    } catch (error) {
        console.error('Error checking overdue items:', error);
        return { error: 'Failed to check overdue items' };
    }
}
