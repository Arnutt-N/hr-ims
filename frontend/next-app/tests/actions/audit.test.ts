import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/auth-cache', () => ({ getCachedAuth: vi.fn() }));
vi.mock('next/headers', () => ({ headers: vi.fn() }));

describe('audit Server Actions', () => {
    let audit: typeof import('@/lib/actions/audit') & {
        withAudit: typeof import('@/lib/actions/with-audit')['withAudit'];
    };
    let getCachedAuth: Mock;
    let headersMock: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        ({ getCachedAuth } = (await import('@/lib/auth-cache')) as { getCachedAuth: Mock });
        ({ headers: headersMock } = (await import('next/headers')) as { headers: Mock });
        getCachedAuth.mockReset();
        headersMock.mockReset();
        // Default: no headers (test scope) → audit context fields are null.
        headersMock.mockImplementation(() => {
            throw new Error('called outside request scope');
        });
        const auditMod = await import('@/lib/actions/audit');
        const withAuditMod = await import('@/lib/actions/with-audit');
        audit = { ...auditMod, withAudit: withAuditMod.withAudit } as typeof audit;
    });

    function fakeHeaders(map: Record<string, string>) {
        return {
            get: (key: string) => map[key.toLowerCase()] ?? null,
        };
    }

    describe('getAuditContext', () => {
        it('returns nulls when headers() throws (e.g. test/cron scope)', async () => {
            const ctx = await audit.getAuditContext();
            expect(ctx).toEqual({ ipAddress: null, userAgent: null, requestId: null });
        });

        it('extracts ip / ua / requestId from request headers', async () => {
            headersMock.mockResolvedValue(
                fakeHeaders({
                    'x-forwarded-for': '203.0.113.5, 10.0.0.1',
                    'user-agent': 'TestAgent/1.0',
                    'x-request-id': 'req-abc',
                }),
            );

            const ctx = await audit.getAuditContext();
            expect(ctx).toEqual({
                ipAddress: '203.0.113.5',
                userAgent: 'TestAgent/1.0',
                requestId: 'req-abc',
            });
        });

        it('falls back to x-real-ip when x-forwarded-for missing', async () => {
            headersMock.mockResolvedValue(
                fakeHeaders({ 'x-real-ip': '198.51.100.10' }),
            );
            const ctx = await audit.getAuditContext();
            expect(ctx.ipAddress).toBe('198.51.100.10');
        });
    });

    describe('logActivity', () => {
        it('creates an audit row including IP / UA / requestId', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            headersMock.mockResolvedValue(
                fakeHeaders({
                    'x-forwarded-for': '203.0.113.5',
                    'user-agent': 'TestAgent/1.0',
                    'x-request-id': 'req-abc',
                }),
            );
            prismaMock.auditLog.create.mockResolvedValue({} as any);

            await audit.logActivity('CREATE', 'InventoryItem', 'item-1', { name: 'pen' });

            expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
                data: {
                    userId: 4,
                    action: 'CREATE',
                    entity: 'InventoryItem',
                    entityId: 'item-1',
                    details: JSON.stringify({ name: 'pen' }),
                    ipAddress: '203.0.113.5',
                    userAgent: 'TestAgent/1.0',
                    requestId: 'req-abc',
                },
            });
        });

        it('still records the row when headers are unavailable (nulls preserved)', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            prismaMock.auditLog.create.mockResolvedValue({} as any);

            await audit.logActivity('CREATE', 'X', 'x-1');

            expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    ipAddress: null,
                    userAgent: null,
                    requestId: null,
                }),
            });
        });

        it('skips silently when no session', async () => {
            getCachedAuth.mockResolvedValue(null);
            await audit.logActivity('CREATE', 'X');
            expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
        });

        it('swallows DB errors so the calling action still completes', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.auditLog.create.mockRejectedValue(new Error('boom'));

            await expect(audit.logActivity('CREATE', 'X', 'x-1')).resolves.toBeUndefined();
            expect(consoleErr).toHaveBeenCalled();
            consoleErr.mockRestore();
        });
    });

    describe('withAudit (HOF)', () => {
        it('calls the inner fn and persists oldValue/newValue/details', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            prismaMock.auditLog.create.mockResolvedValue({} as any);

            const fn = vi.fn(async (id: number) => ({ id, name: 'After' }));

            const wrapped = audit.withAudit(
                {
                    action: 'CATEGORY_UPDATE',
                    entity: 'Category',
                    entityId: (_args, result) => result.id.toString(),
                    before: () => ({ id: 5, name: 'Before' }),
                    after: (_args, result) => result,
                    details: ([id]) => ({ targetId: id }),
                },
                fn as any,
            );

            const result = await wrapped(5 as any);

            expect(result).toEqual({ id: 5, name: 'After' });
            expect(fn).toHaveBeenCalledWith(5);
            expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    userId: 4,
                    action: 'CATEGORY_UPDATE',
                    entity: 'Category',
                    entityId: '5',
                    oldValue: JSON.stringify({ id: 5, name: 'Before' }),
                    newValue: JSON.stringify({ id: 5, name: 'After' }),
                    details: JSON.stringify({ targetId: 5 }),
                }),
            });
        });

        it('returns the inner result even if the audit insert fails', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.auditLog.create.mockRejectedValue(new Error('boom'));

            const wrapped = audit.withAudit(
                { action: 'X', entity: 'Y' },
                async () => 'ok' as const,
            );

            const result = await wrapped();
            expect(result).toBe('ok');
            consoleErr.mockRestore();
        });

        it('skips audit row when no session, but still returns inner result', async () => {
            getCachedAuth.mockResolvedValue(null);

            const wrapped = audit.withAudit(
                { action: 'X', entity: 'Y' },
                async (n: number) => n * 2,
            );

            const result = await wrapped(21);
            expect(result).toBe(42);
            expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
        });

        it('catches errors from `before` snapshot without blocking the action', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            prismaMock.auditLog.create.mockResolvedValue({} as any);

            const wrapped = audit.withAudit(
                {
                    action: 'X',
                    entity: 'Y',
                    before: () => {
                        throw new Error('snapshot failed');
                    },
                    after: () => ({ ok: true }),
                },
                async () => 'done' as const,
            );

            const result = await wrapped();
            expect(result).toBe('done');
            const call = prismaMock.auditLog.create.mock.calls[0][0];
            expect(call.data.oldValue).toBeNull();
            expect(call.data.newValue).toBe(JSON.stringify({ ok: true }));
        });
    });

    describe('getAuditLogs', () => {
        it('returns logs for an admin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            const fakeLogs = [{ id: 1, action: 'CREATE' }] as any;
            prismaMock.auditLog.findMany.mockResolvedValue(fakeLogs);

            const result = await audit.getAuditLogs(10);

            expect(result).toEqual({ success: true, logs: fakeLogs });
            expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 10, orderBy: { createdAt: 'desc' } }),
            );
        });

        it('returns logs for a superadmin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('superadmin'));
            prismaMock.auditLog.findMany.mockResolvedValue([] as any);

            const result = await audit.getAuditLogs();
            expect((result as any).success).toBe(true);
        });

        it('returns logs for an auditor', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('auditor'));
            prismaMock.auditLog.findMany.mockResolvedValue([] as any);

            const result = await audit.getAuditLogs();
            expect((result as any).success).toBe(true);
        });

        it('rejects users without auditor/admin/superadmin roles', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('technician'));

            const result = await audit.getAuditLogs();
            expect(result).toEqual({ error: 'Unauthorized' });
            expect(prismaMock.auditLog.findMany).not.toHaveBeenCalled();
        });

        it('rejects unauthenticated requests', async () => {
            getCachedAuth.mockResolvedValue(null);

            const result = await audit.getAuditLogs();
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('uses default limit of 50 when not specified', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.auditLog.findMany.mockResolvedValue([] as any);

            await audit.getAuditLogs();

            expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 50 }),
            );
        });

        it('returns error string when Prisma throws', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.auditLog.findMany.mockRejectedValue(new Error('db down'));

            const result = await audit.getAuditLogs();
            expect(result).toEqual({ error: 'Failed to fetch logs' });
            consoleErr.mockRestore();
        });
    });
});
