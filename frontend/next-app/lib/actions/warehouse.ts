'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/audit';
import { z } from 'zod';// Validation Schemas
const warehouseSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    code: z.string().min(2, 'Code is required'),
    type: z.string(), // "main", "division", "provincial"
    divisionId: z.number().nullable().optional(),
    provinceId: z.number().nullable().optional(),
    managerIds: z.array(z.number()).optional(),
    isActive: z.boolean().optional().default(true)
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
                division: {
                    select: { id: true, name: true, abbr: true }
                },
                province: {
                    select: { id: true, name: true, code: true }
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
    // Restriction: Only admin/superadmin
    const role = session?.user?.role;
    if (!session || (role !== 'superadmin' && role !== 'admin')) {
        return { error: 'Unauthorized - Admin only' };
    }

    try {
        const validated = warehouseSchema.parse(data);

        // Check duplicate code
        const existing = await prisma.warehouse.findUnique({
            where: { code: validated.code }
        });
        if (existing) return { error: 'Warehouse code already exists' };

        // Construct managers connection
        const managersConnect = validated.managerIds?.map(id => ({ id })) || [];

        const warehouse = await prisma.warehouse.create({
            data: {
                name: validated.name,
                code: validated.code,
                type: validated.type,
                divisionId: validated.divisionId,
                provinceId: validated.provinceId,
                isActive: validated.isActive,
                managers: {
                    connect: managersConnect
                }
            }
        });

        revalidatePath('/settings/warehouses');
        return { success: true, warehouse };
    } catch (error) {
        if (error instanceof z.ZodError) return { error: error.issues[0].message };
        console.error(error);
        return { error: 'Failed to create warehouse' };
    }
}

export async function updateWarehouse(id: number, data: any) {
    const session = await auth();
    // Restriction: Only admin/superadmin
    const role = session?.user?.role;
    if (!session || (role !== 'superadmin' && role !== 'admin')) {
        return { error: 'Unauthorized - Admin only' };
    }

    try {
        const validated = warehouseSchema.parse(data);

        // Construct managers connection (set replaces all existing relations)
        const managersSet = validated.managerIds?.map(id => ({ id })) || [];

        const warehouse = await prisma.warehouse.update({
            where: { id },
            data: {
                name: validated.name,
                code: validated.code,
                type: validated.type,
                divisionId: validated.divisionId,
                provinceId: validated.provinceId,
                isActive: validated.isActive,
                managers: {
                    set: managersSet
                }
            }
        });

        revalidatePath('/settings/warehouses');
        return { success: true, warehouse };
    } catch (error) {
        console.error(error);
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

export async function getDivisions() {
    try {
        const divisions = await prisma.division.findMany({
            orderBy: { name: 'asc' }
        });
        return { success: true, divisions };
    } catch (error) {
        console.error('Failed to fetch divisions:', error);
        return { error: 'Failed to fetch divisions' };
    }
}

export async function getProvinces() {
    try {
        const provinces = await prisma.province.findMany({
            orderBy: { name: 'asc' }
        });
        return { success: true, provinces };
    } catch (error) {
        console.error('Failed to fetch provinces:', error);
        return { error: 'Failed to fetch provinces' };
    }
}
