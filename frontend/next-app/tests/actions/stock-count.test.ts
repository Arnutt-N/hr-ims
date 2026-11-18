import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/actions/audit', () => ({ logActivity: vi.fn().mockResolvedValue(undefined) }));

describe('stock-count Server Actions', () => {
    let actions: typeof import('@/lib/actions/stock-count');
    let authMock: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        ({ auth: authMock } = (await import('@/auth')) as unknown as { auth: Mock });
        authMock.mockReset();
        authMock.mockResolvedValue(sessionFor('admin', { id: 4 }));
        actions = await import('@/lib/actions/stock-count');
    });

    it('snapshots system quantity when opening a round', async () => {
        prismaMock.stockLevel.findMany.mockResolvedValue([
            { itemId: 7, quantity: 20 },
            { itemId: 8, quantity: 5 }
        ] as any);
        prismaMock.stockCountRound.create.mockResolvedValue({
            id: 1,
            lines: [{ itemId: 7 }, { itemId: 8 }]
        } as any);

        const result = await actions.createStockCountRound({
            warehouseId: 3,
            assignedToId: 9
        });

        expect(result.success).toBe(true);
        const createCall = prismaMock.stockCountRound.create.mock.calls[0][0];
        expect(createCall.data.lines.create).toEqual([
            { itemId: 7, systemQuantity: 20 },
            { itemId: 8, systemQuantity: 5 }
        ]);
    });

    it('computes variance against stock at counting time', async () => {
        prismaMock.stockCountRound.findUnique.mockResolvedValue({
            id: 1,
            status: 'counting',
            assignedToId: 9,
            warehouseId: 3
        } as any);
        prismaMock.stockCountLine.findFirst.mockResolvedValue({
            id: 10,
            systemQuantity: 20,
            itemId: 7
        } as any);
        prismaMock.stockLevel.findUnique.mockResolvedValue({ id: 55, quantity: 90 } as any);
        prismaMock.stockCountLine.update.mockResolvedValue({} as any);
        prismaMock.stockCountRound.update.mockResolvedValue({ id: 1, status: 'review' } as any);

        const result = await actions.recordStockCount(1, [
            { lineId: 10, countedQuantity: 18, note: 'พบเสียหาย 2 ชิ้น' }
        ]);

        expect(result.success).toBe(true);
        const updateCall = prismaMock.stockCountLine.update.mock.calls[0][0];
        expect(updateCall.data).toMatchObject({ countedQuantity: 18, variance: -72 });
        expect(prismaMock.stockCountRound.update.mock.calls[0][0].data.status).toBe('review');
    });

    it('refuses to apply a round that is not approved', async () => {
        prismaMock.stockCountRound.findUnique.mockResolvedValue({
            id: 1,
            status: 'review',
            warehouseId: 3,
            lines: []
        } as any);

        const result = await actions.applyStockCount(1);

        expect(result).toEqual({ success: false, message: 'Round is not approved' });
        expect(prismaMock.stockCountRound.update).not.toHaveBeenCalled();
    });

    it('applies non-zero variances atomically with stock transaction and audit', async () => {
        prismaMock.stockCountRound.findUnique.mockResolvedValue({
            id: 1,
            status: 'approved',
            warehouseId: 3,
            lines: []
        } as any);
        prismaMock.warehouse.findMany.mockResolvedValue([{ id: 3 }] as any);
        prismaMock.user.findUnique.mockResolvedValue({ department: null } as any);
        prismaMock.stockLevel.findUnique.mockResolvedValue({ id: 55, quantity: 20 } as any);
        prismaMock.stockLevel.update.mockResolvedValue({} as any);
        prismaMock.stockTransaction.create.mockResolvedValue({} as any);
        prismaMock.auditLog.create.mockResolvedValue({} as any);
        prismaMock.stockCountRound.update.mockResolvedValue({ id: 1, status: 'applied' } as any);

        const txRoundUpdate = vi.fn().mockResolvedValue({});
        const txRoundUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
        prismaMock.$transaction.mockImplementationOnce(async (cb: any) => cb({
            stockCountRound: {
                findUnique: vi.fn().mockResolvedValue({
                    id: 1,
                    status: 'approved',
                    warehouseId: 3,
                    lines: [
                        { id: 10, itemId: 7, variance: -2, countedQuantity: 18 },
                        { id: 11, itemId: 8, variance: 0, countedQuantity: 5 }
                    ]
                }),
                update: txRoundUpdate,
                updateMany: txRoundUpdateMany
            },
            stockLevel: {
                findUnique: vi.fn().mockResolvedValue({ id: 55, quantity: 20 }),
                update: vi.fn().mockResolvedValue({})
            },
            stockTransaction: { create: vi.fn().mockResolvedValue({}) },
            auditLog: { create: vi.fn().mockResolvedValue({}) }
        } as any));

        const result = await actions.applyStockCount(1);

        expect(result.success).toBe(true);
        expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
        expect(txRoundUpdateMany).toHaveBeenCalledWith({
            where: { id: 1, status: 'approved' },
            data: expect.objectContaining({ status: 'applied' })
        });
    });

    it('rolls back the whole apply when the round was already claimed', async () => {
        prismaMock.stockCountRound.findUnique.mockResolvedValue({
            id: 1,
            status: 'approved',
            warehouseId: 3,
            lines: []
        } as any);
        prismaMock.warehouse.findMany.mockResolvedValue([{ id: 3 }] as any);
        prismaMock.user.findUnique.mockResolvedValue({ department: null } as any);

        prismaMock.$transaction.mockImplementationOnce(async (cb: any) => cb({
            stockCountRound: {
                findUnique: vi.fn().mockResolvedValue({
                    id: 1,
                    status: 'approved',
                    warehouseId: 3,
                    lines: [
                        { id: 10, itemId: 7, variance: -2, countedQuantity: 18 }
                    ]
                }),
                updateMany: vi.fn().mockResolvedValue({ count: 0 })
            },
            stockLevel: {
                findUnique: vi.fn().mockResolvedValue({ id: 55, quantity: 20 }),
                update: vi.fn().mockResolvedValue({})
            },
            stockTransaction: { create: vi.fn().mockResolvedValue({}) },
            auditLog: { create: vi.fn().mockResolvedValue({}) }
        } as any));
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const result = await actions.applyStockCount(1);

        expect(result).toEqual({ success: false, message: 'Failed to apply stock count' });
        expect(errSpy).toHaveBeenCalled();
        errSpy.mockRestore();
    });
});
