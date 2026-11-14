'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/audit';
import { z } from 'zod';
import { requireRole, ADMIN_ROLES } from '@/lib/auth-guards';
import { sessionHasAnyRole } from '@/lib/role-access';
import { getManagedWarehouseIds } from '@/lib/warehouse-scope';

// Validation Schemas
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
    const session = await requireRole(...ADMIN_ROLES);
    if (!session) return { error: 'Unauthorized' };

    try {
        const validated = warehouseSchema.parse(data);

        // Check duplicate code
        const existing = await prisma.warehouse.findUnique({
            where: { code: validated.code }
        });
        if (existing) return { error: 'Warehouse code already exists' };

        // Construct managers connection
        const managersConnect = validated.managerIds?.map(id => ({ id })) || [];

        const warehouse = await prisma.$transaction(async (tx) => {
            const created = await tx.warehouse.create({
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

            await tx.auditLog.create({
                data: {
                    userId: parseInt(session.user.id),
                    action: 'CREATE',
                    entity: 'Warehouse',
                    entityId: String(created.id),
                    details: JSON.stringify({ name: created.name, code: created.code, type: created.type }),
                }
            });

            return created;
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
    const session = await requireRole(...ADMIN_ROLES);
    if (!session) return { error: 'Unauthorized' };

    try {
        const validated = warehouseSchema.parse(data);

        // Construct managers connection (set replaces all existing relations)
        const managersSet = validated.managerIds?.map(id => ({ id })) || [];

        const warehouse = await prisma.$transaction(async (tx) => {
            const updated = await tx.warehouse.update({
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

            await tx.auditLog.create({
                data: {
                    userId: parseInt(session.user.id),
                    action: 'UPDATE',
                    entity: 'Warehouse',
                    entityId: String(updated.id),
                    details: JSON.stringify({ name: updated.name, code: updated.code, type: updated.type }),
                }
            });

            return updated;
        });

        revalidatePath('/settings/warehouses');
        return { success: true, warehouse };
    } catch (error) {
        console.error(error);
        return { error: 'Failed to update warehouse' };
    }
}

export async function deleteWarehouse(id: number) {
    const session = await requireRole('superadmin');
    if (!session) return { error: 'Unauthorized' };

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
    const session = await auth();
    if (!session) return { error: 'Unauthorized' };

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
    const session = await auth();
    if (!session) return { error: 'Unauthorized' };

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

/**
 * Warehouses the current user may move stock OUT of.
 *
 * The backend enforces this on `POST /api/stock-transfers` (V22, 2026-11-14):
 * a transfer is only accepted when the caller manages the source warehouse or
 * their department is mapped to it. Without this action the UI offers every
 * warehouse in the system, so a user picks one and gets a 404 that reads like
 * "this warehouse does not exist" when it plainly does.
 *
 * Admin tier gets everything. Everyone else gets the same set the backend will
 * accept, computed by the same helper, so the dropdown and the API cannot drift.
 */
export async function getTransferSourceWarehouses() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const userId = parseInt(session.user.id);
        const isAdmin = sessionHasAnyRole(session, ...ADMIN_ROLES);

        const warehouses = await prisma.warehouse.findMany({
            where: isAdmin
                ? { isActive: true }
                : { isActive: true, id: { in: await getManagedWarehouseIds(userId) } },
            select: { id: true, name: true, code: true, type: true, isActive: true },
            orderBy: { name: 'asc' },
        });

        return { success: true, warehouses };
    } catch (error) {
        console.error('Failed to fetch transfer source warehouses:', error);
        return { error: 'Failed to fetch transfer source warehouses' };
    }
}
