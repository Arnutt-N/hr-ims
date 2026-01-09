'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { redirect } from 'next/navigation';

const InventorySchema = z.object({
    id: z.coerce.number(),
    name: z.string().min(1, 'Name is required'),
    category: z.string().min(1, 'Category is required'),
    type: z.enum(['durable', 'consumable']),
    serial: z.string().optional(),
    status: z.enum(['available', 'borrowed', 'maintenance']),
    stock: z.coerce.number().min(0),
});

const CreateInventory = InventorySchema.omit({ id: true });
const UpdateInventory = InventorySchema;

export async function fetchInventoryItems(
    query: string,
    currentPage: number,
) {
    const ITEMS_PER_PAGE = 10;
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;

    try {
        const items = await prisma.inventoryItem.findMany({
            where: {
                OR: [
                    { name: { contains: query } },
                    { category: { contains: query } },
                    { serial: { contains: query } },
                ],
            },
            orderBy: { updatedAt: 'desc' },
            take: ITEMS_PER_PAGE,
            skip: offset,
        });

        return items;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch inventory items.');
    }
}

export async function fetchInventoryPages(query: string) {
    const ITEMS_PER_PAGE = 10;
    try {
        const count = await prisma.inventoryItem.count({
            where: {
                OR: [
                    { name: { contains: query } },
                    { category: { contains: query } },
                    { serial: { contains: query } },
                ],
            },
        });
        return Math.ceil(count / ITEMS_PER_PAGE);
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch total inventory pages.');
    }
}

export async function deleteInventoryItem(id: number) {
    try {
        await prisma.inventoryItem.delete({
            where: { id },
        });
        revalidatePath('/inventory');
        return { message: 'Deleted Inventory Item.' };
    } catch (error) {
        return { message: 'Database Error: Failed to Delete Inventory Item.' };
    }
}
