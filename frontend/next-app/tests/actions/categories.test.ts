import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/lib/auth-cache', () => ({ getCachedAuth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/actions/audit', () => ({ logActivity: vi.fn() }));

describe('categories Server Actions', () => {
    let categories: typeof import('@/lib/actions/categories');
    let getCachedAuth: Mock;
    let logActivity: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        ({ getCachedAuth } = (await import('@/lib/auth-cache')) as { getCachedAuth: Mock });
        ({ logActivity } = (await import('@/lib/actions/audit')) as { logActivity: Mock });
        getCachedAuth.mockReset();
        logActivity.mockReset();
        categories = await import('@/lib/actions/categories');
    });

    describe('getCategories', () => {
        it('returns sorted list', async () => {
            prismaMock.category.findMany.mockResolvedValue([
                { id: 1, name: 'A' },
                { id: 2, name: 'B' },
            ] as any);

            const result = await categories.getCategories();

            expect(result).toMatchObject({ success: true });
            expect(prismaMock.category.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ orderBy: { name: 'asc' } }),
            );
        });

        it('returns error on DB failure', async () => {
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.category.findMany.mockRejectedValue(new Error('boom'));
            const result = await categories.getCategories();
            expect(result).toEqual({ error: 'Failed to fetch categories' });
            err.mockRestore();
        });
    });

    describe('createCategory', () => {
        it('creates a new category and logs activity', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.category.findUnique.mockResolvedValue(null);
            prismaMock.category.create.mockResolvedValue({ id: 5, name: 'Pens' } as any);

            const result = await categories.createCategory({ name: 'Pens' });

            expect(result).toMatchObject({ success: true });
            expect(prismaMock.category.create).toHaveBeenCalledWith({
                data: { name: 'Pens' },
            });
            expect(logActivity).toHaveBeenCalledWith('CATEGORY_CREATE', 'Category', 'Pens', { id: 5 });
        });

        it('rejects unauthenticated', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await categories.createCategory({ name: 'Pens' });
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('rejects non-admin role', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('user'));
            const result = await categories.createCategory({ name: 'Pens' });
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('rejects duplicate name', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.category.findUnique.mockResolvedValue({ id: 1, name: 'Pens' } as any);

            const result = await categories.createCategory({ name: 'Pens' });
            expect(result).toEqual({ error: 'Category already exists' });
            expect(prismaMock.category.create).not.toHaveBeenCalled();
        });

        it('returns error when validation fails', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});
            const result = await categories.createCategory({ name: '' });
            expect(result).toEqual({ error: 'Failed to create category' });
            err.mockRestore();
        });
    });

    describe('updateCategory', () => {
        it('updates category with partial schema', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.category.update.mockResolvedValue({ id: 1, name: 'Edited' } as any);

            await categories.updateCategory(1, { name: 'Edited' });

            expect(prismaMock.category.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { name: 'Edited' },
            });
            expect(logActivity).toHaveBeenCalled();
        });

        it('rejects unauthenticated', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await categories.updateCategory(1, { name: 'X' });
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('returns error on DB failure', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.category.update.mockRejectedValue(new Error('boom'));
            const result = await categories.updateCategory(1, { name: 'X' });
            expect(result).toEqual({ error: 'Failed to update category' });
            err.mockRestore();
        });
    });

    describe('deleteCategory', () => {
        it('deletes and logs', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.category.delete.mockResolvedValue({ id: 1, name: 'Pens' } as any);

            const result = await categories.deleteCategory(1);

            expect(result).toEqual({ success: true });
            expect(logActivity).toHaveBeenCalledWith('CATEGORY_DELETE', 'Category', 'Pens', { id: 1 });
        });

        it('rejects unauthenticated', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await categories.deleteCategory(1);
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('returns error on DB failure', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.category.delete.mockRejectedValue(new Error('boom'));
            const result = await categories.deleteCategory(1);
            expect(result).toEqual({ error: 'Failed to delete category' });
            err.mockRestore();
        });
    });

    describe('syncCategories', () => {
        it('rejects unauthenticated', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await categories.syncCategories();
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('creates new categories from inventory and links items', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.inventoryItem.findMany.mockResolvedValue([
                { category: 'Pens' },
                { category: 'Books' },
                { category: null },
            ] as any);
            prismaMock.category.findUnique
                .mockResolvedValueOnce(null) // Pens missing
                .mockResolvedValueOnce({ id: 2, name: 'Books' } as any); // Books exists
            prismaMock.category.create.mockResolvedValue({ id: 1, name: 'Pens' } as any);
            prismaMock.inventoryItem.updateMany.mockResolvedValue({ count: 3 } as any);

            const result = await categories.syncCategories();

            expect(result).toMatchObject({ success: true, createdCount: 1 });
            expect(logActivity).toHaveBeenCalledWith(
                'CATEGORY_SYNC',
                'System',
                'Migration',
                expect.objectContaining({ created: 1 }),
            );
        });

        it('returns error on DB failure', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.inventoryItem.findMany.mockRejectedValue(new Error('boom'));
            const result = await categories.syncCategories();
            expect(result).toEqual({ error: 'Failed to sync categories' });
            err.mockRestore();
        });
    });
});
