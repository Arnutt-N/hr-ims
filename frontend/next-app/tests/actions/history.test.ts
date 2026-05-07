import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/auth', () => ({ auth: vi.fn() }));

describe('history Server Action', () => {
    let history: typeof import('@/lib/actions/history');
    let authMock: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        ({ auth: authMock } = (await import('@/auth')) as { auth: Mock });
        authMock.mockReset();
        history = await import('@/lib/actions/history');
    });

    it('rejects unauthenticated', async () => {
        authMock.mockResolvedValue(null);
        const result = await history.getHistory();
        expect(result).toEqual({ error: 'Unauthorized' });
    });

    it('returns full history when no filters', async () => {
        authMock.mockResolvedValue(sessionFor('admin'));
        prismaMock.history.findMany.mockResolvedValue([{ id: 1 }] as any);

        const result = await history.getHistory();
        expect((result as any).success).toBe(true);
        const call = prismaMock.history.findMany.mock.calls[0][0];
        expect(call.where).toEqual({});
        expect(call.take).toBe(100);
    });

    it('builds OR clause for free-text query', async () => {
        authMock.mockResolvedValue(sessionFor('admin'));
        prismaMock.history.findMany.mockResolvedValue([] as any);

        await history.getHistory({ query: 'pen' });

        const where = prismaMock.history.findMany.mock.calls[0][0].where;
        expect(where.OR).toEqual([
            { item: { contains: 'pen' } },
            { status: { contains: 'pen' } },
            { action: { contains: 'pen' } },
        ]);
    });

    it('filters by action when not "all"', async () => {
        authMock.mockResolvedValue(sessionFor('admin'));
        prismaMock.history.findMany.mockResolvedValue([] as any);

        await history.getHistory({ action: 'borrow' });

        const where = prismaMock.history.findMany.mock.calls[0][0].where;
        expect(where.action).toBe('borrow');
    });

    it('does NOT filter when action is "all"', async () => {
        authMock.mockResolvedValue(sessionFor('admin'));
        prismaMock.history.findMany.mockResolvedValue([] as any);

        await history.getHistory({ action: 'all' });

        const where = prismaMock.history.findMany.mock.calls[0][0].where;
        expect(where.action).toBeUndefined();
    });

    it('builds inclusive end-of-day date range', async () => {
        authMock.mockResolvedValue(sessionFor('admin'));
        prismaMock.history.findMany.mockResolvedValue([] as any);

        await history.getHistory({ startDate: '2026-01-01', endDate: '2026-01-31' });

        const where = prismaMock.history.findMany.mock.calls[0][0].where;
        expect(where.date.gte).toEqual(new Date('2026-01-01'));
        // endDate must be 23:59:59.999 of the given day
        const lte: Date = where.date.lte;
        expect(lte.getHours()).toBe(23);
        expect(lte.getMinutes()).toBe(59);
        expect(lte.getMilliseconds()).toBe(999);
    });

    it('returns generic error on DB failure', async () => {
        authMock.mockResolvedValue(sessionFor('admin'));
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        prismaMock.history.findMany.mockRejectedValue(new Error('boom'));

        const result = await history.getHistory();
        expect(result).toEqual({ error: 'Failed to fetch history' });
        errSpy.mockRestore();
    });
});
