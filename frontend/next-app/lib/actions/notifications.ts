'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

/**
 * Internal low-stock check — no auth guard.
 * Called by other Server Actions (e.g. after inventory update or request approval)
 * where the caller has already been authenticated and authorized.
 */
export async function checkLowStockInternal(): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
        const allStockLevels = await prisma.stockLevel.findMany({
            where: {
                minStock: { not: null },
            },
            include: {
                item: true,
                warehouse: {
                    include: {
                        managers: true
                    }
                }
            }
        });

        const lowStockItems = allStockLevels.filter(
            s => s.minStock !== null && s.quantity <= s.minStock
        );

        let count = 0;
        for (const stock of lowStockItems) {
            const managers = stock.warehouse.managers;
            const message = `Low Stock Alert: ${stock.item.name} in ${stock.warehouse.name} is down to ${stock.quantity} (Min: ${stock.minStock})`;

            for (const manager of managers) {
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

        revalidatePath('/dashboard');
        return { success: true, count };

    } catch (error) {
        console.error('Failed to check low stock:', error);
        return { success: false, error: 'Failed to generate notifications' };
    }
}

/**
 * Public low-stock check — requires admin/superadmin/approver role.
 * Called from client components (e.g. notification bell, dashboard widget).
 */
export async function checkLowStock() {
    const session = await auth();
    if (!session?.user) {
        return { error: 'Unauthorized' };
    }
    const allowedRoles = ['admin', 'superadmin', 'approver'];
    if (!allowedRoles.includes(session.user.role)) {
        return { error: 'Forbidden' };
    }

    return checkLowStockInternal();
}

export async function getNotifications(limit = 10) {
    const session = await auth();
    if (!session?.user?.id) return { notifications: [] };

    try {
        const notifications = await prisma.notification.findMany({
            where: {
                userId: parseInt(session.user.id),
                read: false
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        // Also get count of unread
        const unreadCount = await prisma.notification.count({
            where: {
                userId: parseInt(session.user.id),
                read: false
            }
        });

        return { notifications, unreadCount };
    } catch (error) {
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
