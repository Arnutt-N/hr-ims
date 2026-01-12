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
    type?: string,
) {
    const ITEMS_PER_PAGE = 12; // Increased for grid view
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;

    const typeFilter = type && type !== 'all' ? { type: type } : {};

    try {
        const items = await prisma.inventoryItem.findMany({
            where: {
                AND: [
                    typeFilter,
                    {
                        OR: [
                            { name: { contains: query } },
                            { category: { contains: query } },
                            { serial: { contains: query } },
                        ],
                    }
                ]
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

export async function fetchInventoryPages(query: string, type?: string) {
    const ITEMS_PER_PAGE = 12;
    const typeFilter = type && type !== 'all' ? { type: type } : {};

    try {
        const count = await prisma.inventoryItem.count({
            where: {
                AND: [
                    typeFilter,
                    {
                        OR: [
                            { name: { contains: query } },
                            { category: { contains: query } },
                            { serial: { contains: query } },
                        ],
                    }
                ]
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
