import { auth } from '@/auth';

/** Role constants to eliminate stringly-typed role checks across Server Actions */
export const ADMIN_ROLES: readonly string[] = ['admin', 'superadmin'];
export const APPROVER_ROLES: readonly string[] = ['admin', 'superadmin', 'approver'];
export const SUPERADMIN_ONLY: readonly string[] = ['superadmin'];

type SessionLike = {
    user?: {
        role?: string | null;
        roles?: string[] | null;
    } | null;
} | null;

export function getSessionRoles(session: SessionLike): string[] {
    const roleList = session?.user?.roles?.filter(Boolean) ?? [];
    if (roleList.length > 0) return roleList;

    return session?.user?.role ? [session.user.role] : [];
}

export function sessionHasAnyRole(session: SessionLike, ...allowedRoles: string[]): boolean {
    if (allowedRoles.length === 0) return !!session?.user;

    const userRoles = getSessionRoles(session);
    return userRoles.some((role) => allowedRoles.includes(role));
}

/**
 * Returns the authenticated session if the user has one of the specified roles.
 * Returns null if unauthenticated or unauthorized.
 *
 * Usage:
 *   const session = await requireRole(...ADMIN_ROLES);
 *   if (!session) return { error: 'Unauthorized' };
 */
export async function requireRole(...roles: string[]) {
    const session = await auth();
    if (!session?.user) return null;
    if (roles.length > 0 && !sessionHasAnyRole(session, ...roles)) return null;
    return session;
}
