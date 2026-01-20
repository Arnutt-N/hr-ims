'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/audit';

export async function getPermissions() {
    const session = await auth();
    if (!session || session.user?.role !== 'superadmin') {
        return { error: 'Unauthorized' };
    }

    try {
        const permissions = await prisma.rolePermission.findMany({
            orderBy: { role: 'asc' }
        });
        return { success: true, permissions };
    } catch (error) {
        console.error('Failed to fetch permissions:', error);
        return { error: 'Failed to fetch permissions' };
    }
}

export async function updatePermission(role: string, menu: string, path: string, canView: boolean) {
    const session = await auth();
    if (!session || session.user?.role !== 'superadmin') {
        return { error: 'Unauthorized' };
    }

    try {
        const permission = await prisma.rolePermission.upsert({
            where: {
                role_menu: {
                    role,
                    menu
                }
            },
            update: {
                canView,
                path // Ensure path is updated 
            },
            create: {
                role,
                menu,
                path,
                canView
            }
        });

        await logActivity('PERMISSION_UPDATE', 'Settings', `Updated permission for ${role} -> ${menu}`, { canView });

        revalidatePath('/settings/permissions');
        return { success: true, permission };
    } catch (error) {
        console.error('Failed to update permission:', error);
        return { error: 'Failed to update permission' };
    }
}
