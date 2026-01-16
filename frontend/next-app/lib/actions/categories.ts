'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/audit';
import { z } from 'zod';

const categorySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
});

export async function getCategories() {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { items: true }
                }
            }
        });
        return { success: true, categories };
    } catch (error) {
        console.error('Failed to fetch categories:', error);
        return { error: 'Failed to fetch categories' };
    }
}

export async function createCategory(data: any) {
    const session = await auth();
    if (!session || (session.user?.role !== 'superadmin' && session.user?.role !== 'admin')) {
        return { error: 'Unauthorized' };
    }

    try {
        const validated = categorySchema.parse(data);

        // Check duplicate
        const existing = await prisma.category.findUnique({
            where: { name: validated.name }
        });
        if (existing) return { error: 'Category already exists' };

        const category = await prisma.category.create({
            data: validated
        });

        await logActivity('CATEGORY_CREATE', 'Category', category.name, { id: category.id });
        revalidatePath('/settings/categories');
        return { success: true, category };
    } catch (error) {
        console.error('Failed to create category:', error);
        return { error: 'Failed to create category' };
    }
}

export async function updateCategory(id: number, data: any) {
    const session = await auth();
    if (!session || (session.user?.role !== 'superadmin' && session.user?.role !== 'admin')) {
        return { error: 'Unauthorized' };
    }

    try {
        const validated = categorySchema.partial().parse(data);

        const category = await prisma.category.update({
            where: { id },
            data: validated
        });

        await logActivity('CATEGORY_UPDATE', 'Category', category.name, { id, updates: validated });
        revalidatePath('/settings/categories');
        return { success: true, category };
    } catch (error) {
        console.error('Failed to update category:', error);
        return { error: 'Failed to update category' };
    }
}

export async function deleteCategory(id: number) {
    const session = await auth();
    if (!session || (session.user?.role !== 'superadmin' && session.user?.role !== 'admin')) {
        return { error: 'Unauthorized' };
    }

    try {
        const category = await prisma.category.delete({
            where: { id }
        });

        await logActivity('CATEGORY_DELETE', 'Category', category.name, { id });
        revalidatePath('/settings/categories');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete category:', error);
        return { error: 'Failed to delete category' };
    }
}

export async function syncCategories() {
    const session = await auth();
    // Allow admin to run sync as well
    if (!session || (session.user?.role !== 'superadmin' && session.user?.role !== 'admin')) {
        return { error: 'Unauthorized' };
    }

    try {
        // 1. Get all unique category strings from InventoryItem
        const items = await prisma.inventoryItem.findMany({
            select: { category: true },
            distinct: ['category']
        });

        let createdCount = 0;
        let updatedCount = 0;

        for (const item of items) {
            if (!item.category) continue;

            // 2. Create Category if not exists
            let category = await prisma.category.findUnique({
                where: { name: item.category }
            });

            if (!category) {
                category = await prisma.category.create({
                    data: { name: item.category }
                });
                createdCount++;
            }

            // 3. Update items with this string to have the relation
            const result = await prisma.inventoryItem.updateMany({
                where: { category: item.category, categoryId: null },
                data: { categoryId: category.id }
            });
            updatedCount += result.count;
        }

        await logActivity('CATEGORY_SYNC', 'System', 'Migration', { created: createdCount, updatedItems: updatedCount });

        revalidatePath('/settings/categories');
        return { success: true, createdCount, updatedCount };

    } catch (error) {
        console.error('Failed to sync categories:', error);
        return { error: 'Failed to sync categories' };
    }
}
