import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/auth', () => ({ auth: vi.fn() }));

describe('reports Server Action', () => {
    let reports: typeof import('@/lib/actions/reports');
    let authMock: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        ({ auth: authMock } = (await import('@/auth')) as { auth: Mock });
        authMock.mockReset();
        reports = await import('@/lib/actions/reports');
    });

    it('rejects unauthenticated', async () => {
        authMock.mockResolvedValue(null);
        const result = await reports.getReportStats();
        expect(result).toEqual({ error: 'Unauthorized' });
    });

    it('aggregates stats across all 4 dimensions', async () => {
        authMock.mockResolvedValue(sessionFor('admin'));
        prismaMock.inventoryItem.groupBy = vi.fn().mockResolvedValue([
            { status: 'available', _count: { id: 10 } },
        ]) as any;
        prismaMock.history.groupBy = vi.fn().mockResolvedValue([
            { item: 'Pen', _count: { id: 7 } },
        ]) as any;
        prismaMock.user.groupBy = vi.fn().mockResolvedValue([]) as any;
        prismaMock.request.groupBy = vi.fn().mockResolvedValue([
            { userId: 8, _count: { id: 3 } },
            { userId: 9, _count: { id: 1 } },
        ]) as any;
        prismaMock.user.findMany.mockResolvedValue([
            { id: 8, department: 'Eng' },
            { id: 9, department: 'Sales' },
        ] as any);
        prismaMock.history.findMany.mockResolvedValue([
            { date: new Date('2026-04-15'), action: 'borrow' },
            { date: new Date('2026-04-20'), action: 'withdraw' },
            { date: new Date('2026-05-01'), action: 'borrow' },
        ] as any);

        const result = (await reports.getReportStats()) as any;

        expect(result.success).toBe(true);
        expect(result.stats.statusBreakdown).toHaveLength(1);
        expect(result.stats.topBorrowed).toHaveLength(1);
        expect(result.stats.topDepartments).toEqual([
            { name: 'Eng', count: 3 },
            { name: 'Sales', count: 1 },
        ]);
        // 2 distinct months: 2026-04 and 2026-05
        expect(result.stats.monthlyTrend).toHaveLength(2);
    });

    it('returns error when DB throws', async () => {
        authMock.mockResolvedValue(sessionFor('admin'));
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        (prismaMock.inventoryItem as any).groupBy = vi.fn().mockRejectedValue(new Error('boom'));

        const result = await reports.getReportStats();
        expect(result).toEqual({ error: 'Failed to fetch reports' });
        errSpy.mockRestore();
    });
});
