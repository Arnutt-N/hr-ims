'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function getDashboardStats() {
    const session = await auth();
    if (!session) return null;

    try {
        const totalItems = await prisma.inventoryItem.count();
        const lowStockItems = await prisma.inventoryItem.count({
            where: {
                stock: {
                    lte: 5 // Assuming 5 is low stock threshold
                }
            }
        });
        const pendingRequests = await prisma.request.count({
            where: {
                status: 'pending'
            }
        });

        // Get recent activity
        const recentActivity = await prisma.history.findMany({
            take: 5,
            orderBy: {
                date: 'desc'
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        avatar: true
                    }
                }
            }
        });

        return {
            totalItems,
            lowStockItems,
            pendingRequests,
            recentActivity
        };
    } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        throw new Error('Failed to fetch dashboard stats');
    }
}
