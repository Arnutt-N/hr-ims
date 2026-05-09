import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/lib/auth-cache', () => ({ getCachedAuth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/meilisearch', () => ({ searchInventoryItems: vi.fn() }));
vi.mock('@/lib/actions/notifications', () => ({
    checkLowStockInternal: vi.fn().mockResolvedValue(undefined),
}));

describe('inventory Server Actions', () => {
    let inventory: typeof import('@/lib/actions/inventory');
    let getCachedAuth: Mock;
    let searchInventoryItems: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        ({ getCachedAuth } = (await import('@/lib/auth-cache')) as { getCachedAuth: Mock });
        ({ searchInventoryItems } = (await import('@/lib/meilisearch')) as { searchInventoryItems: Mock });
        getCachedAuth.mockReset();
        searchInventoryItems.mockReset();
        inventory = await import('@/lib/actions/inventory');
    });

    const validInput = {
        name: 'Pen',
        category: 'Stationery',
        type: 'consumable' as const,
        status: 'available' as const,
        stock: 0,
    };

    describe('fetchInventoryItems', () => {
        it('returns items with summed stock when no warehouseId given', async () => {
            searchInventoryItems.mockResolvedValue([]);
            prismaMock.inventoryItem.findMany.mockResolvedValue([
                { id: 1, name: 'Pen', stockLevels: [{ warehouseId: 1, quantity: 3 }, { warehouseId: 2, quantity: 5 }] },
            ] as any);

            const result = await inventory.fetchInventoryItems('', 1);

            expect(result[0].stock).toBe(8);
        });

        it('filters stock by warehouseId when given', async () => {
            searchInventoryItems.mockResolvedValue([]);
            prismaMock.inventoryItem.findMany.mockResolvedValue([
                {
                    id: 1,
                    stockLevels: [{ warehouseId: 1, quantity: 3 }, { warehouseId: 2, quantity: 5 }],
                },
            ] as any);

            const result = await inventory.fetchInventoryItems('', 1, undefined, 2);

            expect(result[0].stock).toBe(5);
        });

        it('falls back to Prisma OR-search when Meilisearch throws', async () => {
            searchInventoryItems.mockRejectedValue(new Error('search down'));
            prismaMock.inventoryItem.findMany.mockResolvedValue([] as any);

            await inventory.fetchInventoryItems('pen', 1);

            const call = prismaMock.inventoryItem.findMany.mock.calls[0][0];
            const search = call.where.AND[1];
            expect(search).toEqual({
                OR: [
                    { name: { contains: 'pen' } },
                    { category: { contains: 'pen' } },
                    { serial: { contains: 'pen' } },
                ],
            });
        });

        it('uses Meilisearch ID list when query returns matches', async () => {
            searchInventoryItems.mockResolvedValue([42, 43]);
            prismaMock.inventoryItem.findMany.mockResolvedValue([] as any);

            await inventory.fetchInventoryItems('search', 1);

            const call = prismaMock.inventoryItem.findMany.mock.calls[0][0];
            expect(call.where.AND[1]).toEqual({ id: { in: [42, 43] } });
        });

        it('throws on DB error', async () => {
            searchInventoryItems.mockResolvedValue([]);
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.inventoryItem.findMany.mockRejectedValue(new Error('boom'));

            await expect(inventory.fetchInventoryItems('', 1)).rejects.toThrow(
                'Failed to fetch inventory items.',
            );
            err.mockRestore();
        });
    });

    describe('fetchInventoryPages', () => {
        it('rounds up to ITEMS_PER_PAGE buckets', async () => {
            searchInventoryItems.mockResolvedValue([]);
            prismaMock.inventoryItem.count.mockResolvedValue(25 as any);

            const pages = await inventory.fetchInventoryPages('');

            // ITEMS_PER_PAGE is 12 → 25 / 12 = 2.08 → 3
            expect(pages).toBe(3);
        });

        it('throws on DB error', async () => {
            searchInventoryItems.mockResolvedValue([]);
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.inventoryItem.count.mockRejectedValue(new Error('boom'));

            await expect(inventory.fetchInventoryPages('')).rejects.toThrow(
                'Failed to fetch total inventory pages.',
            );
            err.mockRestore();
        });
    });

    describe('createInventoryItem', () => {
        it('rejects unauthenticated', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await inventory.createInventoryItem(validInput);
            expect(result).toEqual({ success: false, message: 'Unauthorized' });
        });

        it('rejects non-admin role', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('user'));
            const result = await inventory.createInventoryItem(validInput);
            expect(result).toEqual({ success: false, message: 'Unauthorized' });
        });

        it('creates item for admin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.inventoryItem.create.mockResolvedValue({} as any);

            const result = await inventory.createInventoryItem(validInput);
            expect(result).toMatchObject({ success: true });
            expect(prismaMock.inventoryItem.create).toHaveBeenCalled();
        });

        it('returns failure on DB error', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.inventoryItem.create.mockRejectedValue(new Error('boom'));

            const result = await inventory.createInventoryItem(validInput);
            expect(result).toMatchObject({ success: false });
            err.mockRestore();
        });
    });

    describe('updateInventoryItem', () => {
        it('rejects unauthenticated', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await inventory.updateInventoryItem(1, validInput);
            expect(result).toEqual({ success: false, message: 'Unauthorized' });
        });

        it('updates item for admin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.inventoryItem.update.mockResolvedValue({} as any);

            const result = await inventory.updateInventoryItem(5, validInput);

            expect(prismaMock.inventoryItem.update).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: 5 } }),
            );
            expect(result.success).toBe(true);
        });
    });

    describe('deleteInventoryItem', () => {
        it('rejects unauthenticated', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await inventory.deleteInventoryItem(1);
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('deletes for admin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.inventoryItem.delete.mockResolvedValue({} as any);

            const result = await inventory.deleteInventoryItem(5);
            expect(result).toMatchObject({ message: 'Deleted Inventory Item.' });
            expect(prismaMock.inventoryItem.delete).toHaveBeenCalledWith({ where: { id: 5 } });
        });
    });

    describe('importInventoryItems', () => {
        it('rejects unauthenticated', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await inventory.importInventoryItems([]);
            expect(result).toEqual({ success: false, error: 'Unauthorized' });
        });

        it('imports rows in a single $transaction', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.inventoryItem.create.mockResolvedValue({ id: 1 } as any);
            prismaMock.stockLevel.create.mockResolvedValue({} as any);

            const items = [
                { name: 'A', category: 'C', type: 'consumable' },
                { name: 'B', category: 'C', warehouseId: '7', quantity: '5' },
            ];

            const result = await inventory.importInventoryItems(items);

            expect(result).toMatchObject({ success: true, count: 2 });
            expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
            expect(prismaMock.inventoryItem.create).toHaveBeenCalledTimes(2);
            // First item has no warehouseId/quantity, so no stockLevel create.
            // Second item does → 1 stockLevel create.
            expect(prismaMock.stockLevel.create).toHaveBeenCalledTimes(1);
        });

        it('rolls back when an item is missing required fields', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});

            const result = await inventory.importInventoryItems([{ name: 'A' }]); // missing category

            expect(result).toMatchObject({ success: false });
            err.mockRestore();
        });
    });
});
