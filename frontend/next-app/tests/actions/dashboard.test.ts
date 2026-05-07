import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/lib/auth-cache', () => ({ getCachedAuth: vi.fn() }));

describe('dashboard Server Actions', () => {
    let dashboard: typeof import('@/lib/actions/dashboard');
    let getCachedAuth: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        // dashboard.ts references `prisma.stockLevel.fields.minStock` (Prisma
        // field-reference helper) inside a where clause. Mock harness doesn't
        // model `fields`, so stub a stand-in token that is a no-op when
        // serialized — the mocked findMany/count never inspect it.
        (prismaMock.stockLevel as any).fields = { minStock: 'minStock', quantity: 'quantity' };
        ({ getCachedAuth } = (await import('@/lib/auth-cache')) as { getCachedAuth: Mock });
        getCachedAuth.mockReset();
        dashboard = await import('@/lib/actions/dashboard');
    });

    describe('getDashboardStats', () => {
        it('returns null when unauthenticated', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await dashboard.getDashboardStats();
            expect(result).toBeNull();
        });

        it('aggregates totals + recent activity', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.inventoryItem.count.mockResolvedValue(42 as any);
            prismaMock.stockLevel.count.mockResolvedValue(3 as any);
            prismaMock.request.count.mockResolvedValue(7 as any);
            prismaMock.stockLevel.findMany.mockResolvedValue([] as any);
            prismaMock.stockTransaction.findMany.mockResolvedValue([
                {
                    type: 'outbound',
                    createdAt: new Date('2026-05-07'),
                    user: { name: 'A' },
                    item: { name: 'Pen' },
                },
                {
                    type: 'inbound',
                    createdAt: new Date('2026-05-06'),
                    user: { name: 'B' },
                    item: { name: 'Stapler' },
                },
                {
                    type: 'adjustment',
                    createdAt: new Date('2026-05-05'),
                    user: { name: 'C' },
                    item: { name: 'Tape' },
                },
            ] as any);

            const result = (await dashboard.getDashboardStats()) as any;

            expect(result.totalItems).toBe(42);
            expect(result.lowStockItems).toBe(3);
            expect(result.pendingRequests).toBe(7);
            expect(result.recentActivity).toHaveLength(3);
            expect(result.recentActivity[0].action).toBe('Withdraw');
            expect(result.recentActivity[1].action).toBe('Return');
            expect(result.recentActivity[2].action).toBe('Update');
        });

        it('returns zeros + empty arrays on DB failure', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.inventoryItem.count.mockRejectedValue(new Error('boom'));

            const result = (await dashboard.getDashboardStats()) as any;
            expect(result).toEqual({
                totalItems: 0,
                lowStockItems: 0,
                pendingRequests: 0,
                lowStockList: [],
                recentActivity: [],
            });
            errSpy.mockRestore();
        });
    });

    describe('getLowStockItems', () => {
        it('returns [] when unauthenticated', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await dashboard.getLowStockItems();
            expect(result).toEqual([]);
        });

        it('returns top-5 stock-level rows for authenticated user', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.stockLevel.findMany.mockResolvedValue([{ id: 1 }] as any);

            const result = await dashboard.getLowStockItems();
            expect(result).toHaveLength(1);
            const call = prismaMock.stockLevel.findMany.mock.calls[0][0];
            expect(call.take).toBe(5);
        });

        it('returns [] on DB failure', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.stockLevel.findMany.mockRejectedValue(new Error('boom'));

            const result = await dashboard.getLowStockItems();
            expect(result).toEqual([]);
            errSpy.mockRestore();
        });
    });
});
