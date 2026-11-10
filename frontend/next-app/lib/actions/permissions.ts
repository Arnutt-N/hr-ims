'use server';

import { AccountRole } from '@prisma/client';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/audit';
import { requireRole, SUPERADMIN_ONLY } from '@/lib/auth-guards';

export async function getPermissions() {
    const session = await requireRole(...SUPERADMIN_ONLY);
    if (!session) return { error: 'Unauthorized' };

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
    const session = await requireRole(...SUPERADMIN_ONLY);
    if (!session) return { error: 'Unauthorized' };

    try {
        const permission = await prisma.$transaction(async (tx) => {
            const updatedPermission = await tx.rolePermission.upsert({
                where: {
                    role_menu: {
                        role,
                        menu
                    }
                },
                update: {
                    canView,
                    path
                },
                create: {
                    role,
                    menu,
                    path,
                    canView
                }
            });

            // [2026-11-10] Modified by Cursor: User.role is an enum; unknown slugs match only Role.slug.
            const accountRole = (Object.values(AccountRole) as string[]).includes(role)
                ? (role as AccountRole)
                : undefined;
            const affectedUsers = await tx.user.findMany({
                where: {
                    OR: [
                        ...(accountRole ? [{ role: accountRole }] : []),
                        {
                            userRoles: {
                                some: {
                                    role: {
                                        slug: role,
                                    },
                                },
                            },
                        },
                    ],
                },
                select: {
                    id: true,
                },
            });

            const affectedUserIds = Array.from(new Set(affectedUsers.map((user) => user.id)));

            if (affectedUserIds.length > 0) {
                await tx.user.updateMany({
                    where: {
                        id: {
                            in: affectedUserIds,
                        },
                    },
                    data: {
                        tokenVersion: {
                            increment: 1,
                        },
                    },
                });
            }

            return updatedPermission;
        });

        await logActivity('PERMISSION_UPDATE', 'Settings', `Updated permission for ${role} -> ${menu}`, { canView });

        revalidatePath('/settings/permissions');
        return { success: true, permission };
    } catch (error) {
        console.error('Failed to update permission:', error);
        return { error: 'Failed to update permission' };
    }
}
