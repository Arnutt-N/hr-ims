'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function checkLowStock() {
    const session = await auth();
    // Allow system trigger or admin trigger
    if (!session?.user) {
        // console.log("System trigger...");
    }

    try {
        console.log("Checking low stock levels...");

        // 1. Find items where quantity <= minStock
        // Note: We only check StockLevel, assuming minStock is set there.
        const lowStockItems = await prisma.stockLevel.findMany({
            where: {
                minStock: { not: null },
                quantity: {
                    lte: prisma.stockLevel.fields.minStock
                }
            },
            include: {
                item: true,
                warehouse: {
                    include: {
                        managers: true // We need to know who to notify
                    }
                }
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
            where: { id },
            data: { read: true }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { error: "Failed to update" };
    }
}
