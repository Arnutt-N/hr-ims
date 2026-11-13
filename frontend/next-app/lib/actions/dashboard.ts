'use server';

import prisma from '@/lib/prisma';
import { getCachedAuth } from '@/lib/auth-cache';
import { getManagedWarehouseIds, isAdminSession } from '@/lib/warehouse-scope';

// [2026-11-13] Modified by Antigravity: scope aggregates to managed warehouses for non-admin (V20)
export async function getDashboardStats() {
    const session = await getCachedAuth();
    if (!session?.user) return null;

    try {
        const isAdmin = isAdminSession(session);
        const userId = parseInt(session.user.id);
        const managed = isAdmin ? [] : await getManagedWarehouseIds(userId);
        const stockScope = isAdmin ? {} : { warehouseId: { in: managed } };
        const requestScope = isAdmin
            ? {}
            : {
                OR: [
                    { userId },
                    ...(managed.length > 0 ? [{ warehouseId: { in: managed } }] : [])
                ]
            };

        const [totalItems, lowStockItemsCount, pendingRequests, lowStockList, recentActivity] = await Promise.all([
            prisma.inventoryItem.count(),
            prisma.stockLevel.count({
                where: {
                    ...stockScope,
                    minStock: { not: null },
                    quantity: { lte: prisma.stockLevel.fields.minStock }
                }
            }),
            prisma.request.count({
                where: { status: 'pending', ...requestScope }
            }),
            prisma.stockLevel.findMany({
                where: {
                    ...stockScope,
                    minStock: { not: null },
                    quantity: { lte: prisma.stockLevel.fields.minStock }
                },
                include: { item: true, warehouse: true },
                take: 5
            }),
            // Mock recent activity for now or fetch from StockTransaction if schema allows
            prisma.stockTransaction.findMany({
                where: stockScope,
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
    const session = await getCachedAuth();
    if (!session?.user) return [];

    try {
        const isAdmin = isAdminSession(session);
        const managed = isAdmin ? [] : await getManagedWarehouseIds(parseInt(session.user.id));

        // Find items where quantity <= minStock
        const lowStockItems = await prisma.stockLevel.findMany({
            where: {
                ...(isAdmin ? {} : { warehouseId: { in: managed } }),
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
