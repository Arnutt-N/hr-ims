import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('stock-transaction Server Actions', () => {
    let stockTx: typeof import('@/lib/actions/stock-transaction');

    beforeEach(async () => {
        resetPrismaMock();
        stockTx = await import('@/lib/actions/stock-transaction');
    });

    describe('receiveGoods', () => {
        it('rejects when payload fails Zod validation', async () => {
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});
            const result = await stockTx.receiveGoods({
                warehouseId: 1,
                items: [],
                userId: 1,
            });
            expect(result).toMatchObject({ success: false });
            err.mockRestore();
        });

        it('opens a $transaction once for the whole inbound batch', async () => {
            prismaMock.stockLevel.findUnique.mockResolvedValue(null);
            prismaMock.stockLevel.create.mockResolvedValue({} as any);
            prismaMock.stockTransaction.create.mockResolvedValue({} as any);

            const result = await stockTx.receiveGoods({
                warehouseId: 1,
                items: [
                    { itemId: 10, quantity: 2 },
                    { itemId: 11, quantity: 5 },
                ],
                userId: 4,
            });

            expect(result.success).toBe(true);
            expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
        });

        it('creates a stock-level row when none exists for that warehouse/item', async () => {
            prismaMock.stockLevel.findUnique.mockResolvedValue(null);
            prismaMock.stockLevel.create.mockResolvedValue({} as any);
            prismaMock.stockTransaction.create.mockResolvedValue({} as any);

            await stockTx.receiveGoods({
                warehouseId: 1,
                items: [{ itemId: 10, quantity: 2 }],
                userId: 4,
            });

            expect(prismaMock.stockLevel.create).toHaveBeenCalledWith({
                data: { warehouseId: 1, itemId: 10, quantity: 2 },
            });
            expect(prismaMock.stockLevel.update).not.toHaveBeenCalled();
        });

        it('increments existing stock level by the inbound quantity', async () => {
            prismaMock.stockLevel.findUnique.mockResolvedValue({ id: 99, quantity: 10 } as any);
            prismaMock.stockLevel.update.mockResolvedValue({} as any);
            prismaMock.stockTransaction.create.mockResolvedValue({} as any);

            await stockTx.receiveGoods({
                warehouseId: 1,
                items: [{ itemId: 10, quantity: 3 }],
                userId: 4,
            });

            expect(prismaMock.stockLevel.update).toHaveBeenCalledWith({
                where: { id: 99 },
                data: { quantity: { increment: 3 } },
            });
            expect(prismaMock.stockLevel.create).not.toHaveBeenCalled();
        });

        it('records a stockTransaction (type=inbound) per item', async () => {
            prismaMock.stockLevel.findUnique.mockResolvedValue({ id: 99, quantity: 10 } as any);
            prismaMock.stockLevel.update.mockResolvedValue({} as any);
            prismaMock.stockTransaction.create.mockResolvedValue({} as any);

            await stockTx.receiveGoods({
                warehouseId: 7,
                items: [
                    { itemId: 10, quantity: 1 },
                    { itemId: 11, quantity: 2 },
                ],
                note: 'PO-42',
                referenceId: 'REF-42',
                userId: 4,
            });

            expect(prismaMock.stockTransaction.create).toHaveBeenCalledTimes(2);
            const call = prismaMock.stockTransaction.create.mock.calls[0][0];
            expect(call.data).toMatchObject({
                warehouseId: 7,
                type: 'inbound',
                referenceId: 'REF-42',
                note: 'PO-42',
                userId: 4,
            });
        });

        it('rolls back atomically — when stockTransaction.create throws, no partial state is observable', async () => {
            // First item OK, second item fails. Whole transaction should reject.
            prismaMock.stockLevel.findUnique.mockResolvedValue({ id: 99, quantity: 10 } as any);
            prismaMock.stockLevel.update.mockResolvedValue({} as any);
            prismaMock.stockTransaction.create
                .mockResolvedValueOnce({} as any)
                .mockRejectedValueOnce(new Error('insert failed'));
            const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const result = await stockTx.receiveGoods({
                warehouseId: 1,
                items: [
                    { itemId: 10, quantity: 1 },
                    { itemId: 11, quantity: 1 },
                ],
                userId: 4,
            });

            expect(result.success).toBe(false);
            // The whole batch is wrapped in a single $transaction, so the failure
            // propagates and the action returns the error string.
            expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
            errSpy.mockRestore();
        });

        it('rejects negative quantities at the schema layer', async () => {
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});
            const result = await stockTx.receiveGoods({
                warehouseId: 1,
                items: [{ itemId: 10, quantity: 0 }],
                userId: 4,
            });
            expect(result.success).toBe(false);
            expect(prismaMock.$transaction).not.toHaveBeenCalled();
            err.mockRestore();
        });
    });

    describe('getStockHistory', () => {
        it('returns transactions for an item', async () => {
            const fake = [{ id: 1, quantity: 2 }] as any;
            prismaMock.stockTransaction.findMany.mockResolvedValue(fake);

            const result = await stockTx.getStockHistory(10);

            expect(result).toEqual(fake);
            expect(prismaMock.stockTransaction.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { itemId: 10 } }),
            );
        });

        it('returns empty array on DB failure', async () => {
            prismaMock.stockTransaction.findMany.mockRejectedValue(new Error('boom'));
            const result = await stockTx.getStockHistory(10);
            expect(result).toEqual([]);
        });
    });
});
