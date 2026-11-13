import prisma from '@/lib/prisma';
import { ADMIN_ROLES, sessionHasAnyRole } from '@/lib/role-access';
import type { Session } from 'next-auth';

export function isAdminSession(session: Session | null | undefined): boolean {
    return sessionHasAnyRole(session, ...ADMIN_ROLES);
}

export function isReadAllSession(session: Session | null | undefined): boolean {
    return sessionHasAnyRole(session, ...ADMIN_ROLES, 'auditor');
}

export async function canAccessWarehouse(
    session: Session | null | undefined,
    warehouseId: number
): Promise<boolean> {
    if (!session?.user?.id) return false;
    if (isAdminSession(session)) return true;
    const managed = await getManagedWarehouseIds(parseInt(session.user.id));
    return managed.includes(warehouseId);
}

export async function getManagedWarehouseIds(userId: number): Promise<number[]> {
    if (!Number.isFinite(userId) || userId <= 0) return [];

    const ids = new Set<number>();

    const managed = await prisma.warehouse.findMany({
        where: { managers: { some: { id: userId } } },
        select: { id: true },
    });
    for (const w of managed) ids.add(w.id);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { department: true },
    });

    if (user?.department) {
        const mapping = await prisma.departmentMapping.findFirst({
            where: { department: user.department },
            select: { warehouseId: true },
        });
        if (mapping) ids.add(mapping.warehouseId);
    }

    return Array.from(ids);
}
