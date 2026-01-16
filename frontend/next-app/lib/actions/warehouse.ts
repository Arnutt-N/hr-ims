'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/audit';
import { z } from 'zod';

const warehouseSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    code: z.string().min(1, 'Code is required'),
    type: z.enum(['central', 'division']),
    divisionId: z.coerce.number().nullable().optional(),
    managerIds: z.array(z.coerce.number()).optional(),
    isActive: z.boolean().optional()
});

export async function getWarehouses() {
    const session = await auth();
    if (!session) return { error: 'Unauthorized' };

    try {
        const warehouses = await prisma.warehouse.findMany({
            include: {
                managers: {
                    select: { id: true, name: true, email: true, avatar: true }
                },
                _count: {
                    select: { stockLevels: true }
                }
            },
            orderBy: { name: 'asc' }
        });
        return { success: true, warehouses };
    } catch (error) {
        console.error('Failed to fetch warehouses:', error);
        return { error: 'Failed to fetch warehouses' };
    }
}

export async function createWarehouse(data: any) {
    const session = await auth();
    if (!session || (session.user?.role !== 'superadmin' && session.user?.role !== 'admin')) {
        return { error: 'Unauthorized' };
    }

    try {
        const validated = warehouseSchema.parse(data);

        // Check for duplicate code
        const existing = await prisma.warehouse.findUnique({
            where: { code: validated.code }
        });
        if (existing) return { error: 'Warehouse code already exists' };

        const warehouse = await prisma.warehouse.create({
            data: {
                name: validated.name,
                code: validated.code,
                type: validated.type,
                divisionId: validated.divisionId || null,
                isActive: validated.isActive ?? true,
                managers: validated.managerIds ? {
                    connect: validated.managerIds.map(id => ({ id }))
                } : undefined
            }
        });

        await logActivity('WAREHOUSE_CREATE', 'Warehouse', warehouse.name, { code: warehouse.code });
        revalidatePath('/settings/warehouses');
        return { success: true, warehouse };
    } catch (error) {
        console.error('Failed to create warehouse:', error);
        return { error: 'Failed to create warehouse' };
    }
}

export async function updateWarehouse(id: number, data: any) {
    const session = await auth();
    if (!session || (session.user?.role !== 'superadmin' && session.user?.role !== 'admin')) {
        return { error: 'Unauthorized' };
    }

    try {
        const validated = warehouseSchema.partial().parse(data);

        const warehouse = await prisma.warehouse.update({
            where: { id },
            data: {
                ...validated,
                managers: validated.managerIds ? {
                    set: validated.managerIds.map(id => ({ id })) // Replace existing managers
                } : undefined
            }
        });

        await logActivity('WAREHOUSE_UPDATE', 'Warehouse', warehouse.name, { id, updates: data });
        revalidatePath('/settings/warehouses');
        return { success: true, warehouse };
    } catch (error) {
        console.error('Failed to update warehouse:', error);
        return { error: 'Failed to update warehouse' };
    }
}

export async function deleteWarehouse(id: number) {
    const session = await auth();
    if (!session || (session.user?.role !== 'superadmin')) {
        return { error: 'Unauthorized - Superadmin only' };
    }

    try {
        const warehouse = await prisma.warehouse.delete({
            where: { id }
        });
        await logActivity('WAREHOUSE_DELETE', 'Warehouse', warehouse.name, { id });
        revalidatePath('/settings/warehouses');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete warehouse:', error);
        return { error: 'Failed to delete warehouse' };
    }
}
