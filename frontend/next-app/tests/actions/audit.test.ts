import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/auth-cache', () => ({ getCachedAuth: vi.fn() }));

describe('audit Server Actions', () => {
    let logActivity: typeof import('@/lib/actions/audit').logActivity;
    let getAuditLogs: typeof import('@/lib/actions/audit').getAuditLogs;
    let getCachedAuth: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        ({ getCachedAuth } = (await import('@/lib/auth-cache')) as { getCachedAuth: Mock });
        getCachedAuth.mockReset();
        ({ logActivity, getAuditLogs } = await import('@/lib/actions/audit'));
    });

    describe('logActivity', () => {
        it('creates an audit row when session present', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            prismaMock.auditLog.create.mockResolvedValue({} as any);

            await logActivity('CREATE', 'InventoryItem', 'item-1', { name: 'pen' });

            expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
                data: {
                    userId: 4,
                    action: 'CREATE',
                    entity: 'InventoryItem',
                    entityId: 'item-1',
                    details: JSON.stringify({ name: 'pen' }),
                },
            });
        });

        it('serialises details=null as null', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            prismaMock.auditLog.create.mockResolvedValue({} as any);

            await logActivity('DELETE', 'X', 'x-1');

            expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ details: null, entityId: 'x-1' }),
                }),
            );
        });

        it('skips silently when no session', async () => {
            getCachedAuth.mockResolvedValue(null);

            await logActivity('CREATE', 'X');

            expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
        });

        it('swallows DB errors so the calling action still completes', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.auditLog.create.mockRejectedValue(new Error('boom'));

            await expect(logActivity('CREATE', 'X', 'x-1')).resolves.toBeUndefined();
            expect(consoleErr).toHaveBeenCalled();
            consoleErr.mockRestore();
        });
    });

    describe('getAuditLogs', () => {
        it('returns logs for an admin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            const fakeLogs = [{ id: 1, action: 'CREATE' }] as any;
            prismaMock.auditLog.findMany.mockResolvedValue(fakeLogs);

            const result = await getAuditLogs(10);

            expect(result).toEqual({ success: true, logs: fakeLogs });
            expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 10, orderBy: { createdAt: 'desc' } }),
            );
        });

        it('returns logs for a superadmin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('superadmin'));
            prismaMock.auditLog.findMany.mockResolvedValue([] as any);

            const result = await getAuditLogs();

            expect((result as any).success).toBe(true);
        });

        it('returns logs for an auditor', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('auditor'));
            prismaMock.auditLog.findMany.mockResolvedValue([] as any);

            const result = await getAuditLogs();

            expect((result as any).success).toBe(true);
        });

        it('rejects users without auditor/admin/superadmin roles', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('technician'));

            const result = await getAuditLogs();

            expect(result).toEqual({ error: 'Unauthorized' });
            expect(prismaMock.auditLog.findMany).not.toHaveBeenCalled();
        });

        it('rejects unauthenticated requests', async () => {
            getCachedAuth.mockResolvedValue(null);

            const result = await getAuditLogs();

            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('uses default limit of 50 when not specified', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.auditLog.findMany.mockResolvedValue([] as any);

            await getAuditLogs();

            expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 50 }),
            );
        });

        it('returns error string when Prisma throws', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.auditLog.findMany.mockRejectedValue(new Error('db down'));

            const result = await getAuditLogs();

            expect(result).toEqual({ error: 'Failed to fetch logs' });
            consoleErr.mockRestore();
        });
    });
});
