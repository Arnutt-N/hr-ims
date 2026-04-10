'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { requireRole, ADMIN_ROLES } from '@/lib/auth-guards';

export async function getMaintenanceItems() {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const items = await prisma.inventoryItem.findMany({
            where: {
                OR: [
                    { status: 'maintenance' },
                    { status: 'issue_reported' }
                ]
            },
            include: {
                currentHolder: {
                    select: {
                        name: true,
                        department: true
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        return { success: true, items };
    } catch (error) {
        console.error('Failed to fetch maintenance items:', error);
        return { error: 'Failed to fetch items' };
    }
}

export async function updateMaintenanceStatus(
    id: number,
    status: string,
    repairNotes?: string
) {
    // Use ADMIN_ROLES (admin + superadmin) instead of hard-coded 'admin'
    // string comparison, which silently blocked superadmin users from
    // updating maintenance status because their token role is 'superadmin'
    // not 'admin'.
    const session = await requireRole(...ADMIN_ROLES);
    if (!session) {
        return { error: 'Unauthorized - Admin only' };
    }

    try {
        await prisma.inventoryItem.update({
            where: { id },
            data: {
                status,
                repairNotes,
                currentHolderId: status === 'available' ? null : undefined // Release holder if fixed
            }
        });

        // Log history
        await prisma.history.create({
            data: {
                userId: parseInt(session.user.id || '0'),
                action: 'maintenance_update',
                item: `Item #${id}`,
                status: status + (repairNotes ? ` - ${repairNotes}` : '')
            }
        });

        revalidatePath('/maintenance');
        revalidatePath('/inventory');
        return { success: true };
    } catch (error) {
        console.error('Failed to update status:', error);
        return { error: 'Failed to update status' };
    }
}
