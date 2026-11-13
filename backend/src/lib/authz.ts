export interface AuthzUser {
    id: number | string;
    userId?: number | string;
    role?: string;
    roles?: string[];
    department?: string | null;
}

export function parsePositiveInt(value: unknown): number | null {
    if (typeof value === 'number') {
        return Number.isInteger(value) && value > 0 ? value : null;
    }
    if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) {
        return null;
    }
    const parsed = Number(value.trim());
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export class NotFoundError extends Error {
    public readonly statusCode = 404;
    constructor(message = 'Resource not found') {
        super(message);
        this.name = 'NotFoundError';
    }
}

const ADMIN_TIER = ['superadmin', 'admin'];

export function isAdminTier(user: AuthzUser): boolean {
    const roles = user.roles?.length ? user.roles : [user.role];
    return roles.some((r) => ADMIN_TIER.includes(String(r).toLowerCase()));
}

export async function getManagedWarehouseIds(
    prisma: any,
    user: AuthzUser
): Promise<number[]> {
    const userId = Number(user.id ?? user.userId);
    if (!Number.isFinite(userId) || userId <= 0) return [];
    const ids = new Set<number>();

    const managed = await prisma.warehouse.findMany({
        where: { managers: { some: { id: userId } } },
        select: { id: true },
    });
    for (const w of managed) ids.add(w.id);

    let department = user.department;
    if (department === undefined && prisma.user?.findUnique) {
        const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { department: true },
        });
        department = dbUser?.department ?? null;
    }

    if (department) {
        const mapping = await prisma.departmentMapping.findFirst({
            where: { department },
            select: { warehouseId: true },
        });
        if (mapping) ids.add(mapping.warehouseId);
    }

    return Array.from(ids);
}

export async function assertWarehouseAccess(
    prisma: any,
    user: AuthzUser,
    warehouseId: number
): Promise<void> {
    if (isAdminTier(user)) return;
    const managed = await getManagedWarehouseIds(prisma, user);
    if (!managed.includes(warehouseId)) {
        throw new NotFoundError();
    }
}
