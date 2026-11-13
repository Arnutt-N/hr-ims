/**
 * Object-level authorization helpers (IDOR remediation).
 *
 * Policy (see project-log-md/cursor/2026-11-11_object-authz-inventory.md §2):
 * - 404 not 403 on object-level deny — never leak record existence.
 * - admin tier (superadmin/admin) bypasses object scope on operational resources.
 * - warehouse scope: a user "manages" a warehouse when they are listed in
 *   `Warehouse.managers` or their `department` maps to it via DepartmentMapping.
 * - identity must come from the verified session/JWT only, never from the body.
 *
 * All functions take the caller-supplied `req.user` as an explicit argument so
 * the identity source stays auditable at every call site.
 */

export interface AuthzUser {
    id: number | string;
    role?: string;
    roles?: string[];
    department?: string | null;
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

/**
 * Warehouse IDs the user manages, derived from:
 * 1. `Warehouse.managers` relation (direct manager)
 * 2. `DepartmentMapping` where `department = user.department`
 * Prisma User has no warehouseId/departmentId column — do not "fix" that here;
 * the two sources above are the schema's actual answer.
 */
export async function getManagedWarehouseIds(
    prisma: any,
    user: AuthzUser
): Promise<number[]> {
    const userId = Number(user.id);
    const ids = new Set<number>();

    const managed = await prisma.warehouse.findMany({
        where: { managers: { some: { id: userId } } },
        select: { id: true },
    });
    for (const w of managed) ids.add(w.id);

    if (user.department) {
        const mapping = await prisma.departmentMapping.findFirst({
            where: { department: user.department },
            select: { warehouseId: true },
        });
        if (mapping) ids.add(mapping.warehouseId);
    }

    return Array.from(ids);
}

/**
 * Assert the user may operate on `warehouseId`.
 * Admin tier passes; otherwise the warehouse must be in the user's managed set.
 * Throws NotFoundError (404 policy) instead of Forbidden on denial.
 */
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
