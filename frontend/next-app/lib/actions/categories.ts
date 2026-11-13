'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/audit';
import { z } from 'zod';
import { requireRole, ADMIN_ROLES } from '@/lib/auth-guards';

const categorySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
});

export async function getCategories() {
    const session = await requireRole();
    if (!session) return { error: 'Unauthorized' };

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
    const session = await requireRole(...ADMIN_ROLES);
    if (!session) return { error: 'Unauthorized' };

    try {
        const validated = categorySchema.parse(data);

        // Check duplicate
        const existing = await prisma.category.findUnique({
            where: { name: validated.name }
        });
        if (existing) return { error: 'Category already exists' };

        const category = await prisma.$transaction(async (tx) => {
            const created = await tx.category.create({
                data: validated
            });

            await tx.auditLog.create({
                data: {
                    userId: parseInt(session.user.id),
                    action: 'CREATE',
                    entity: 'Category',
                    entityId: String(created.id),
                    details: JSON.stringify({ name: created.name }),
                }
            });

            return created;
        });

        revalidatePath('/settings/categories');
        return { success: true, category };
    } catch (error) {
        console.error('Failed to create category:', error);
        return { error: 'Failed to create category' };
    }
}

export async function updateCategory(id: number, data: any) {
    const session = await requireRole(...ADMIN_ROLES);
    if (!session) return { error: 'Unauthorized' };

    try {
        const validated = categorySchema.partial().parse(data);

        const category = await prisma.$transaction(async (tx) => {
            const updated = await tx.category.update({
                where: { id },
                data: validated
            });

            await tx.auditLog.create({
                data: {
                    userId: parseInt(session.user.id),
                    action: 'UPDATE',
                    entity: 'Category',
                    entityId: String(updated.id),
                    details: JSON.stringify({ name: updated.name, updates: validated }),
                }
            });

            return updated;
        });

        revalidatePath('/settings/categories');
        return { success: true, category };
    } catch (error) {
        console.error('Failed to update category:', error);
        return { error: 'Failed to update category' };
    }
}

export async function deleteCategory(id: number) {
    const session = await requireRole(...ADMIN_ROLES);
    if (!session) return { error: 'Unauthorized' };

    try {
        await prisma.$transaction(async (tx) => {
            const category = await tx.category.delete({
                where: { id }
            });

            await tx.auditLog.create({
                data: {
                    userId: parseInt(session.user.id),
                    action: 'DELETE',
                    entity: 'Category',
                    entityId: String(id),
                    details: JSON.stringify({ name: category.name }),
                }
            });
        });

        revalidatePath('/settings/categories');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete category:', error);
        return { error: 'Failed to delete category' };
    }
}

export async function syncCategories() {
    const session = await requireRole(...ADMIN_ROLES);
    if (!session) return { error: 'Unauthorized' };

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
