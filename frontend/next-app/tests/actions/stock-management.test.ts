import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('stock-management Server Actions', () => {
    let stockMgmt: typeof import('@/lib/actions/stock-management');
    let authMock: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        ({ auth: authMock } = (await import('@/auth')) as unknown as { auth: Mock });
        authMock.mockReset();
        authMock.mockResolvedValue(sessionFor('admin', { id: 4 }));
        stockMgmt = await import('@/lib/actions/stock-management');
    });

    describe('adjustStockQuantity', () => {
        it('rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const result = await stockMgmt.adjustStockQuantity(1, 10, 5, 'restock');
            expect(result).toEqual({ success: false, message: 'Unauthorized' });
        });

        it('rejects cross-warehouse adjustment for non-admin', async () => {
            authMock.mockResolvedValue(sessionFor('approver', { id: 5 }));
            prismaMock.warehouse.findMany.mockResolvedValue([{ id: 2 }] as any);
            prismaMock.user.findUnique.mockResolvedValue({ department: null } as any);

            const result = await stockMgmt.adjustStockQuantity(99, 10, 5, 'restock');
            expect(result).toEqual({ success: false, message: 'Stock level not found' });
            expect(prismaMock.$transaction).not.toHaveBeenCalled();
        });

        it('reads current stock, updates by adjustment, and records a transaction', async () => {
            prismaMock.stockLevel.findUnique.mockResolvedValue({ id: 99, quantity: 10 } as any);
            prismaMock.stockLevel.update.mockResolvedValue({} as any);
            prismaMock.stockTransaction.create.mockResolvedValue({} as any);

            const result = await stockMgmt.adjustStockQuantity(1, 10, 5, 'restock');

            expect(result.success).toBe(true);
            expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
            expect(prismaMock.stockLevel.update).toHaveBeenCalledWith({
                where: { id: 99 },
                data: { quantity: { increment: 5 } },
            });
            expect(prismaMock.stockTransaction.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    warehouseId: 1,
                    itemId: 10,
                    quantity: 5,
                    type: 'adjustment',
                    userId: 4,
                    note: 'restock',
                }),
            });
        });

        it('rolls back when stock-level row is missing', async () => {
            prismaMock.stockLevel.findUnique.mockResolvedValue(null);
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});

            const result = await stockMgmt.adjustStockQuantity(1, 10, 5, 'note');

            expect(result.success).toBe(false);
            expect(prismaMock.stockLevel.update).not.toHaveBeenCalled();
            expect(prismaMock.stockTransaction.create).not.toHaveBeenCalled();
            err.mockRestore();
        });

        it('handles negative adjustments (deductions)', async () => {
            prismaMock.stockLevel.findUnique.mockResolvedValue({ id: 99, quantity: 10 } as any);
            prismaMock.stockLevel.update.mockResolvedValue({} as any);
            prismaMock.stockTransaction.create.mockResolvedValue({} as any);

            await stockMgmt.adjustStockQuantity(1, 10, -3, 'damaged');

            expect(prismaMock.stockLevel.update).toHaveBeenCalledWith({
                where: { id: 99 },
                data: { quantity: { increment: -3 } },
            });
        });
    });

    describe('updateStockLimits', () => {
        it('rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const result = await stockMgmt.updateStockLimits(1, 10, 5);
            expect(result).toEqual({ success: false, message: 'Unauthorized' });
        });

        it('rejects cross-warehouse update for non-admin', async () => {
            authMock.mockResolvedValue(sessionFor('approver', { id: 5 }));
            prismaMock.warehouse.findMany.mockResolvedValue([{ id: 2 }] as any);
            prismaMock.user.findUnique.mockResolvedValue({ department: null } as any);

            const result = await stockMgmt.updateStockLimits(99, 10, 5);
            expect(result).toEqual({ success: false, message: 'Stock level not found' });
            expect(prismaMock.stockLevel.update).not.toHaveBeenCalled();
        });
        it('updates only minStock when maxStock undefined', async () => {
            prismaMock.stockLevel.update.mockResolvedValue({} as any);

            await stockMgmt.updateStockLimits(1, 10, 5, undefined);

            expect(prismaMock.stockLevel.update).toHaveBeenCalledWith({
                where: { warehouseId_itemId: { warehouseId: 1, itemId: 10 } },
                data: { minStock: 5 },
            });
        });

        it('updates both min and max', async () => {
            prismaMock.stockLevel.update.mockResolvedValue({} as any);

            await stockMgmt.updateStockLimits(1, 10, 5, 100);

            expect(prismaMock.stockLevel.update).toHaveBeenCalledWith({
                where: { warehouseId_itemId: { warehouseId: 1, itemId: 10 } },
                data: { minStock: 5, maxStock: 100 },
            });
        });

        it('returns failure on DB error', async () => {
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.stockLevel.update.mockRejectedValue(new Error('boom'));

            const result = await stockMgmt.updateStockLimits(1, 10, 5);
            expect(result.success).toBe(false);
            err.mockRestore();
        });
    });

    describe('getItemDetail', () => {
        it('returns item with stockLevels', async () => {
            const fake = { id: 10, stockLevels: [] };
            prismaMock.inventoryItem.findUnique.mockResolvedValue(fake as any);

            const result = await stockMgmt.getItemDetail(10);
            expect(result).toEqual(fake);
        });

        it('returns null on DB error', async () => {
            prismaMock.inventoryItem.findUnique.mockRejectedValue(new Error('boom'));
            const result = await stockMgmt.getItemDetail(10);
            expect(result).toBeNull();
        });
    });

    describe('getStockHistory', () => {
        it('returns paginated transactions + total page count', async () => {
            prismaMock.stockTransaction.findMany.mockResolvedValue([{ id: 1 }] as any);
            prismaMock.stockTransaction.count.mockResolvedValue(45 as any);

            const result = await stockMgmt.getStockHistory(10, 2, 20);

            expect(result.pagination).toEqual({
                page: 2,
                perPage: 20,
                total: 45,
                totalPages: 3,
            });
            expect(prismaMock.stockTransaction.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { itemId: 10 }, take: 20, skip: 20 }),
            );
        });

        it('returns empty defaults on DB error', async () => {
            prismaMock.stockTransaction.findMany.mockRejectedValue(new Error('boom'));
            const result = await stockMgmt.getStockHistory(10);
            expect(result).toEqual({
                transactions: [],
                pagination: { page: 1, perPage: 20, total: 0, totalPages: 0 },
            });
        });
    });
});
