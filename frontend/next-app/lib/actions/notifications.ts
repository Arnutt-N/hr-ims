'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { requireRole, APPROVER_ROLES } from '@/lib/auth-guards';

export async function checkLowStock() {
    const session = await requireRole(...APPROVER_ROLES);
    if (!session) return { error: 'Unauthorized' };

    try {
        console.log("Checking low stock levels...");

        // 1. Find low-stock IDs via raw SQL (column-vs-column comparison not supported in Prisma where clause)
        const lowStockIds = await prisma.$queryRaw<{ id: number }[]>`
            SELECT id FROM StockLevel WHERE minStock IS NOT NULL AND quantity <= minStock
        `;

        if (lowStockIds.length === 0) {
            console.log('No low stock items found.');
            return { success: true, count: 0 };
        }

        // 2. Fetch full data with relations only for matching rows
        const lowStockItems = await prisma.stockLevel.findMany({
            where: { id: { in: lowStockIds.map(r => r.id) } },
            include: {
                item: true,
                warehouse: { include: { managers: true } }
            }
        });

        // 2. Create Notifications
        let count = 0;
        for (const stock of lowStockItems) {
            const managers = stock.warehouse.managers;
            const message = `Low Stock Alert: ${stock.item.name} in ${stock.warehouse.name} is down to ${stock.quantity} (Min: ${stock.minStock})`;

            for (const manager of managers) {
                // Prevent duplicate unread notifications for same item
                const existing = await prisma.notification.findFirst({
                    where: {
                        userId: manager.id,
                        text: message,
                        read: false
                    }
                });

                if (!existing) {
                    await prisma.notification.create({
                        data: {
                            userId: manager.id,
                            text: message,
                            read: false
                        }
                    });
                    count++;
                }
            }
        }

        console.log(`Generated ${count} low stock notifications.`);
        revalidatePath('/dashboard');
        return { success: true, count };

    } catch (error) {
        console.error('Failed to check low stock:', error);
        return { error: 'Failed to generate notifications' };
    }
}

export async function getNotifications(limit = 10) {
    const session = await auth();
    if (!session?.user?.id) return { notifications: [] };

    try {
        const userId = parseInt(session.user.id);

        const [notifications, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where: { userId, read: false },
                orderBy: { createdAt: 'desc' },
                take: limit
            }),
            prisma.notification.count({
                where: { userId, read: false }
            }),
        ]);

        return { notifications, unreadCount };
    } catch (error) {
        console.error('Failed to fetch notifications:', { userId: session.user.id, error });
        return { notifications: [], unreadCount: 0 };
    }
}

export async function markAsRead(id: number) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        await prisma.notification.update({
            where: { id, userId: parseInt(session.user.id) },
            data: { read: true }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { error: "Failed to update" };
    }
}

export async function markAllAsRead() {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        await prisma.notification.updateMany({
            where: {
                userId: parseInt(session.user.id),
                read: false
            },
            data: { read: true }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { error: "Failed to update all" };
    }
}
