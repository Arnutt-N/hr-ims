export const ADMIN_ROLES: readonly string[] = ['admin', 'superadmin'];
export const APPROVER_ROLES: readonly string[] = ['admin', 'superadmin', 'approver'];
export const SUPERADMIN_ONLY: readonly string[] = ['superadmin'];

const ROLE_PRIORITY = ['superadmin', 'admin', 'approver', 'auditor', 'technician', 'user'] as const;

export type RoleAwareUser = {
    role?: string | null;
    roles?: string[] | null;
} | null | undefined;

export type SessionLike = {
    user?: RoleAwareUser | null;
} | null | undefined;

function rolePriority(role: string): number {
    const index = ROLE_PRIORITY.indexOf(role as typeof ROLE_PRIORITY[number]);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function getRoleList(user: RoleAwareUser): string[] {
    const roles = [
        ...(user?.roles?.filter((role): role is string => typeof role === 'string' && role.length > 0) ?? []),
        ...(typeof user?.role === 'string' && user.role.length > 0 ? [user.role] : []),
    ];

    return Array.from(new Set(roles)).sort((left, right) => {
        const leftPriority = rolePriority(left);
        const rightPriority = rolePriority(right);

        if (leftPriority !== rightPriority) {
            return leftPriority - rightPriority;
        }

        return left.localeCompare(right);
    });
}

export function getSessionRoles(session: SessionLike): string[] {
    return getRoleList(session?.user);
}

export function userHasAnyRole(user: RoleAwareUser, ...allowedRoles: string[]): boolean {
    if (allowedRoles.length === 0) return !!user;

    const userRoles = getRoleList(user);
    return userRoles.some((role) => allowedRoles.includes(role));
}

export function sessionHasAnyRole(session: SessionLike, ...allowedRoles: string[]): boolean {
    return userHasAnyRole(session?.user, ...allowedRoles);
}
