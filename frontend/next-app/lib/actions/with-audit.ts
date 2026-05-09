import prisma from '@/lib/prisma';
import { getCachedAuth } from '@/lib/auth-cache';
import { getAuditContext } from '@/lib/actions/audit';

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
    return async (...args: TArgs): Promise<Awaited<TResult>> => {
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
        }

        return result;
    };
}
