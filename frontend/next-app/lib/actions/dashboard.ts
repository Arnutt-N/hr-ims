'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function getDashboardStats() {
    const session = await auth();
    if (!session?.user) return null;

    try {
        const [totalItems, lowStockItemsCount, pendingRequests, lowStockList, recentActivity] = await Promise.all([
            prisma.inventoryItem.count(),
            prisma.stockLevel.count({
                where: {
                    minStock: { not: null },
                    quantity: { lte: prisma.stockLevel.fields.minStock }
                }
            }),
            prisma.request.count({
                where: { status: 'pending' }
            }),
            prisma.stockLevel.findMany({
                where: {
                    minStock: { not: null },
                    quantity: { lte: prisma.stockLevel.fields.minStock }
                },
                include: { item: true, warehouse: true },
                take: 5
            }),
            // Mock recent activity for now or fetch from StockTransaction if schema allows
            prisma.stockTransaction.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: { user: true, item: true }
            })
        ]);

        return {
            totalItems,
            lowStockItems: lowStockItemsCount,
            pendingRequests,
            lowStockList, // For existing page usage
            recentActivity: recentActivity.map(a => ({
                action: a.type === 'outbound' ? 'Withdraw' : a.type === 'inbound' ? 'Return' : 'Update',
                user: { name: a.user.name },
                item: a.item.name,
                date: a.createdAt,
                status: 'Completed'
            }))
        };
    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        return {
            totalItems: 0,
            lowStockItems: 0,
            pendingRequests: 0,
            lowStockList: [],
            recentActivity: []
        };
    }
}

export async function getLowStockItems() {
    const session = await auth();
    if (!session?.user) return [];

    try {
        // Find items where quantity <= minStock
        const lowStockItems = await prisma.stockLevel.findMany({
            where: {
                minStock: { not: null },
                quantity: {
                    lte: prisma.stockLevel.fields.minStock
                }
            },
            include: {
                item: true,
                warehouse: true
            },
            take: 5 // Limit to top 5 for widget
        });

        return lowStockItems;
    } catch (error) {
        console.error('Failed to fetch low stock items:', error);
        return [];
    }
}
