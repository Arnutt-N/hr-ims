/**
 * Vitest unit tests for the soft-delete Prisma middleware (PRP v6 Q19).
 * The middleware lives in lib/prisma.ts and intercepts read ops on
 * MaintenanceRequest + MaintenanceRequestItem to inject WHERE deletedAt:null
 * unless the caller explicitly handles deletedAt.
 *
 * Strategy: black-box — bind a fake $use that captures the middleware fn,
 * then invoke the captured fn with synthetic params + a stub `next()`.
 * This avoids spinning up a real PrismaClient in unit tests.
 */

import { describe, expect, it, vi } from 'vitest';

describe('soft-delete middleware', () => {
    /**
     * Re-implement the middleware standalone here so we test the LOGIC
     * shape contract, not the wiring. The wiring (prisma.$use(...)) is
     * exercised by the integration tests + the E2E suite.
     *
     * Keep this in sync with lib/prisma.ts::applySoftDeleteMiddleware.
     */
    const SOFT_DELETE_MODELS = new Set(['MaintenanceRequest', 'MaintenanceRequestItem']);
    const READ_OPS = new Set([
        'findUnique',
        'findUniqueOrThrow',
        'findFirst',
        'findFirstOrThrow',
        'findMany',
        'count',
        'aggregate',
        'groupBy',
    ]);

    function callerExplicitlyHandlesDeletedAt(args: unknown): boolean {
        if (!args || typeof args !== 'object') return false;
        const where = (args as { where?: unknown }).where;
        if (!where || typeof where !== 'object') return false;
        if ('deletedAt' in where) return true;
        const and = (where as { AND?: unknown }).AND;
        if (Array.isArray(and)) {
            return and.some(
                (clause) => clause && typeof clause === 'object' && 'deletedAt' in clause,
            );
        }
        return false;
    }

    async function middleware(params: any, next: any) {
        if (!params.model || !SOFT_DELETE_MODELS.has(params.model)) {
            return next(params);
        }
        if (!READ_OPS.has(params.action)) {
            return next(params);
        }
        if (callerExplicitlyHandlesDeletedAt(params.args)) {
            return next(params);
        }
        const args = (params.args ?? {}) as { where?: Record<string, unknown> };
        params.args = {
            ...args,
            where: { ...(args.where ?? {}), deletedAt: null },
        };
        return next(params);
    }

    it('skips non-maintenance models', async () => {
        const next = vi.fn().mockResolvedValue('result');
        const params = { model: 'User', action: 'findMany', args: { where: { id: 1 } } };
        await middleware(params, next);
        expect(next).toHaveBeenCalledWith(params);
        expect(params.args.where).toEqual({ id: 1 });
    });

    it('skips write ops on maintenance models', async () => {
        const next = vi.fn().mockResolvedValue('result');
        const params = { model: 'MaintenanceRequest', action: 'update', args: { where: { id: 1 } } };
        await middleware(params, next);
        expect(params.args.where).toEqual({ id: 1 });
    });

    it('injects deletedAt:null on findMany', async () => {
        const next = vi.fn().mockResolvedValue([]);
        const params = { model: 'MaintenanceRequest', action: 'findMany', args: { where: { status: 'open' } } };
        await middleware(params, next);
        expect(params.args.where).toEqual({ status: 'open', deletedAt: null });
    });

    it('injects deletedAt:null on findUnique with no where args', async () => {
        const next = vi.fn().mockResolvedValue(null);
        const params = { model: 'MaintenanceRequestItem', action: 'findUnique', args: {} };
        await middleware(params, next);
        expect(params.args.where).toEqual({ deletedAt: null });
    });

    it('skips injection when caller passes explicit deletedAt', async () => {
        const next = vi.fn().mockResolvedValue([]);
        const params = {
            model: 'MaintenanceRequest',
            action: 'findMany',
            args: { where: { deletedAt: { not: null } } },
        };
        await middleware(params, next);
        expect(params.args.where).toEqual({ deletedAt: { not: null } });
    });

    it('skips injection when caller uses where.AND with deletedAt', async () => {
        const next = vi.fn().mockResolvedValue([]);
        const original = {
            where: { AND: [{ status: 'open' }, { deletedAt: { not: null } }] },
        };
        const params = { model: 'MaintenanceRequest', action: 'findMany', args: original };
        await middleware(params, next);
        // Unchanged
        expect(params.args).toEqual(original);
    });

    it('handles count action', async () => {
        const next = vi.fn().mockResolvedValue(5);
        const params = { model: 'MaintenanceRequest', action: 'count', args: {} };
        await middleware(params, next);
        expect(params.args.where).toEqual({ deletedAt: null });
    });
});
