'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function getItemBySN(serialNumber: string) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const item = await prisma.inventoryItem.findUnique({
            where: { serial: serialNumber },
            include: {
                currentHolder: {
                    select: {
                        name: true,
                        department: true
                    }
                }
            }
        });

        if (!item) {
            return { error: 'Item not found', notFound: true };
        }

        // Log scan history
        await prisma.history.create({
            data: {
                userId: parseInt(session.user.id || '0'),
                action: 'scan',
                item: item.name,
                status: 'scanned'
            }
        });

        return { success: true, item };
    } catch (error) {
        console.error('Failed to fetch item:', error);
        return { error: 'Failed to fetch item' };
    }
}

export async function getRecentScans() {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const recentScans = await prisma.history.findMany({
            where: {
                userId: parseInt(session.user.id || '0'),
                action: 'scan'
            },
            orderBy: { date: 'desc' },
            take: 5
        });

        return { success: true, scans: recentScans };
    } catch (error) {
        return { error: 'Failed to fetch recent scans' };
    }
}
