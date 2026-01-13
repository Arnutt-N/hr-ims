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
    warehouseId?: number,
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
            include: {
                stockLevels: true,
            },
            orderBy: { updatedAt: 'desc' },
            take: ITEMS_PER_PAGE,
            skip: offset,
        });

        // Map stock based on warehouse selection
        return items.map(item => {
            let displayStock = 0;
            if (warehouseId) {
                const level = item.stockLevels.find(l => l.warehouseId === warehouseId);
                displayStock = level ? level.quantity : 0;
            } else {
                // Sum all stock levels if no warehouse selected
                displayStock = item.stockLevels.reduce((sum, l) => sum + l.quantity, 0);
            }

            return {
                ...item,
                stock: displayStock
            };
        });
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


export async function importInventoryItems(items: any[]) {
    try {
        let successCount = 0;
        let errors: string[] = [];

        // Determine a default warehouse if not provided (e.g. first one)
        // For now, we assume if warehouseId is passed in item, use it.
        // If not, we might create item without stock levels (global).

        // Use transaction for stability? Or allow partial success?
        // Partial success is better for large imports usually, reporting errors.
        // But transaction is safer. Let's do transaction.
        await prisma.$transaction(async (tx) => {
            for (const item of items) {
                // Validate fields?
                if (!item.name || !item.category) {
                    // primitive validation
                    throw new Error(`Invalid item data for ${item.name || 'Unknown'}`);
                }

                // Create Item
                const newItem = await tx.inventoryItem.create({
                    data: {
                        name: item.name,
                        category: item.category,
                        type: item.type || 'durable',
                        serial: item.serial || null,
                        status: 'available',
                        image: item.image || null,
                        stock: 0, // Deprecated
                    }
                });

                // If quantity/warehouse provided
                if (item.warehouseId && item.quantity) {
                    // Check if stock level exists?
                    // New item, so it won't.
                    await tx.stockLevel.create({
                        data: {
                            itemId: newItem.id,
                            warehouseId: parseInt(item.warehouseId),
                            quantity: parseInt(item.quantity) || 0,
                            minStock: item.minStock ? parseInt(item.minStock) : 0
                        }
                    });
                }

                successCount++;
            }
        });

        revalidatePath('/inventory');
        return { success: true, count: successCount };
    } catch (error) {
        console.error('Import Error:', error);
        return { success: false, error: 'Failed to import items. Check data format or unique constraints.' };
    }
}
