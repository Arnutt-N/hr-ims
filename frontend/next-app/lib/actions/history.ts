'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';

interface HistoryFilters {
    query?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
}

export async function getHistory(filters: HistoryFilters = {}) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const where: any = {};

        // Keyword search (item name or status)
        if (filters.query) {
            where.OR = [
                { item: { contains: filters.query } },
                { status: { contains: filters.query } },
                { action: { contains: filters.query } }
            ];
        }

        // Action filter
        if (filters.action && filters.action !== 'all') {
            where.action = filters.action;
        }

        // Date range filter
        if (filters.startDate || filters.endDate) {
            where.date = {};
            if (filters.startDate) {
                where.date.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999); // Include entire end date
                where.date.lte = endDate;
            }
        }

        const history = await prisma.history.findMany({
            where,
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        department: true
                    }
                }
            },
            orderBy: { date: 'desc' },
            take: 100 // Limit for performance
        });

        return { success: true, history };
    } catch (error) {
        console.error('Failed to fetch history:', error);
        return { error: 'Failed to fetch history' };
    }
}
