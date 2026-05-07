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

/**
 * Higher-order function for wrapping mutating Server Actions with structured
 * before/after auditing. Captures snapshots, runs the action, and persists a
 * single audit row carrying both snapshots + IP / UA / requestId — atomically
 * recorded *after* the action commits, so audit failures can't roll back the
 * actual mutation.
 *
 * @example
 * export const createCategory = withAudit(
 *   {
 *     action: 'CATEGORY_CREATE',
 *     entity: 'Category',
 *     entityId: (_args, result) => result.category?.id?.toString(),
 *     after: (_args, result) => result.category,
 *   },
 *   async (data: { name: string }) => {
 *     // ...the actual mutation
 *   },
 * );
 */
export type AuditMeta<TArgs extends readonly unknown[], TResult> = {
    action: string;
    entity: string;
    entityId?: (args: TArgs, result: Awaited<TResult>) => string | undefined;
    before?: (args: TArgs) => Promise<unknown> | unknown;
    after?: (args: TArgs, result: Awaited<TResult>) => Promise<unknown> | unknown;
    details?: (args: TArgs, result: Awaited<TResult>) => unknown;
};

export function withAudit<TArgs extends readonly unknown[], TResult>(
    meta: AuditMeta<TArgs, TResult>,
    fn: (...args: TArgs) => TResult,
): (...args: TArgs) => Promise<Awaited<TResult>> {
    return async (...args: TArgs) => {
        let beforeSnap: unknown;
        if (meta.before) {
            try {
                beforeSnap = await meta.before(args);
            } catch {
                beforeSnap = undefined;
            }
        }

        const result = (await fn(...args)) as Awaited<TResult>;

        try {
            const session = await getCachedAuth();
            if (!session?.user?.id) return result;

            const ctx = await getAuditContext();
            let afterSnap: unknown;
            if (meta.after) {
                try {
                    afterSnap = await meta.after(args, result);
                } catch {
                    afterSnap = undefined;
                }
            }

            await prisma.auditLog.create({
                data: {
                    userId: parseInt(session.user.id),
                    action: meta.action,
                    entity: meta.entity,
                    entityId: meta.entityId ? meta.entityId(args, result) : undefined,
                    oldValue: beforeSnap !== undefined ? JSON.stringify(beforeSnap) : null,
                    newValue: afterSnap !== undefined ? JSON.stringify(afterSnap) : null,
                    details: meta.details ? JSON.stringify(meta.details(args, result)) : null,
                    ipAddress: ctx.ipAddress,
                    userAgent: ctx.userAgent,
                    requestId: ctx.requestId,
                },
            });
        } catch (error) {
            console.error('Failed to write withAudit log:', error);
            // Audit failure must never propagate to the caller.
        }

        return result;
    };
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
