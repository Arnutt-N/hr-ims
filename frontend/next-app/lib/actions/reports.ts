'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function getReportStats() {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        // 1. Status Breakdown
        const statusBreakdown = await prisma.inventoryItem.groupBy({
            by: ['status'],
            _count: { id: true }
        });

        // 2. Top 10 Most Borrowed Items
        const topBorrowedRaw = await prisma.history.groupBy({
            by: ['item'],
            where: {
                action: { in: ['borrow', 'withdraw'] }
            },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10
        });

        // 3. Department Stats
        const departmentStats = await prisma.user.groupBy({
            by: ['department'],
            _count: { id: true },
            where: {
                department: { not: null }
            }
        });

        // Calculate department usage from requests
        const departmentUsage = await prisma.request.groupBy({
            by: ['userId'],
            _count: { id: true }
        });

        const usersById = await prisma.user.findMany({
            select: { id: true, department: true }
        });

        const deptUsageMap: Record<string, number> = {};
        departmentUsage.forEach(item => {
            const user = usersById.find(u => u.id === item.userId);
            if (user?.department) {
                deptUsageMap[user.department] = (deptUsageMap[user.department] || 0) + item._count.id;
            }
        });

        const topDepartments = Object.entries(deptUsageMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // 4. Monthly Trend (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyData = await prisma.history.findMany({
            where: {
                date: { gte: sixMonthsAgo },
                action: { in: ['withdraw', 'borrow'] }
            },
            select: { date: true, action: true }
        });

        // Group by month
        const monthMap: Record<string, number> = {};
        monthlyData.forEach(record => {
            const monthKey = record.date.toISOString().substring(0, 7); // YYYY-MM
            monthMap[monthKey] = (monthMap[monthKey] || 0) + 1;
        });

        const monthlyTrend = Object.entries(monthMap).map(([month, count]) => ({ month, count }));

        return {
            success: true,
            stats: {
                statusBreakdown,
                topBorrowed: topBorrowedRaw,
                topDepartments,
                monthlyTrend
            }
        };
    } catch (error) {
        console.error('Failed to fetch report stats:', error);
        return { error: 'Failed to fetch reports' };
    }
}
