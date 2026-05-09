'use server';

import prisma from '@/lib/prisma';
import { headers } from 'next/headers';
import { getCachedAuth } from '@/lib/auth-cache';
import { sessionHasAnyRole } from '@/lib/auth-guards';

/**
 * Per-request context that should travel with every audit row.
 * Populated from the inbound request headers (`x-forwarded-for`,
 * `user-agent`, `x-request-id`). When called outside a request scope
 * (Vitest, cron job, server-only module load), each field is `null`.
 */
export type AuditContext = {
    ipAddress: string | null;
    userAgent: string | null;
    requestId: string | null;
};

/** Pull IP / UA / requestId off `next/headers`. Safe to call from any Server Action. */
export async function getAuditContext(): Promise<AuditContext> {
    try {
        const h = await headers();
        const xff = h.get('x-forwarded-for');
        const ipAddress =
            (xff ? xff.split(',')[0].trim() : null) || h.get('x-real-ip') || null;
        return {
            ipAddress,
            userAgent: h.get('user-agent') || null,
            requestId: h.get('x-request-id') || null,
        };
    } catch {
        // headers() throws when called outside a request scope.
        return { ipAddress: null, userAgent: null, requestId: null };
    }
}

/**
 * Append a single audit row. Auto-populates `ipAddress`, `userAgent`, and
 * `requestId` from the request headers — callers don't have to thread them
 * through. Silently no-ops when no session is present (system actions).
 */
export async function logActivity(
    action: string,
    entity: string,
    entityId?: string,
    details?: any,
) {
    try {
        const session = await getCachedAuth();
        if (!session?.user?.id) return;

        const ctx = await getAuditContext();

        await prisma.auditLog.create({
            data: {
                userId: parseInt(session.user.id),
                action,
                entity,
                entityId,
                details: details ? JSON.stringify(details) : null,
                ipAddress: ctx.ipAddress,
                userAgent: ctx.userAgent,
                requestId: ctx.requestId,
            },
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw — audit failures must never block the calling action.
    }
}

export async function getAuditLogs(limit = 50) {
    try {
        const session = await getCachedAuth();
        if (!sessionHasAnyRole(session, 'superadmin', 'admin', 'auditor')) {
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
                        avatar: true,
                    },
                },
            },
        });

        return { success: true, logs };
    } catch (error) {
        console.error('Failed to fetch audit logs:', error);
        return { error: 'Failed to fetch logs' };
    }
}
