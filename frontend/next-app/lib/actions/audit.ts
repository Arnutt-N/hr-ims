'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function logActivity(
    action: string,
    entity: string,
    entityId?: string,
    details?: any
) {
    try {
        const session = await auth();
        // If no session (e.g. system action), we might want to log as system user or handle differently
        // For now, require session or just log if session exists
        if (!session?.user?.id) return;

        await prisma.auditLog.create({
            data: {
                userId: parseInt(session.user.id),
                action,
                entity,
                entityId,
                details: details ? JSON.stringify(details) : null,
                // ipAddress and userAgent would need headers() from next/headers, 
                // but might be complex in server actions context depending on invocation
            }
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw error to prevent blocking the main action
    }
}

export async function getAuditLogs(limit = 50) {
    try {
        const session = await auth();
        const userRoles = (session?.user as any)?.roles || [session?.user?.role];
        const isAuthorized = userRoles.some((r: string) => ['superadmin', 'admin', 'auditor'].includes(r));

        if (!isAuthorized) {
            return { error: 'Unauthorized' };
        }

        const logs = await prisma.auditLog.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        role: true,
                        avatar: true
                    }
                }
            }
        });

        return { success: true, logs };
    } catch (error) {
        console.error('Failed to fetch audit logs:', error);
        return { error: 'Failed to fetch logs' };
    }
}
