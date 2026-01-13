'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function getDashboardStats() {
    const session = await auth();
    if (!session) return null;

    try {
        const totalItems = await prisma.inventoryItem.count();

        // Fetch stock levels with minStock defined
        const stockLevels = await prisma.stockLevel.findMany({
            where: {
                minStock: { not: null }
            },
            include: {
                item: true,
                warehouse: true
            }
        });

        // Filter for low stock
        const lowStockList = stockLevels.filter(sl => sl.quantity <= (sl.minStock || 0));
        const lowStockCount = lowStockList.length;

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
            lowStockItems: lowStockCount,
            lowStockList: lowStockList.slice(0, 5), // Top 5 for widget
            pendingRequests,
            recentActivity
        };
    } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        throw new Error('Failed to fetch dashboard stats');
    }
}
