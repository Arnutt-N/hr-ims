'use server';

import { auth } from '@/auth';

/** Role constants to eliminate stringly-typed role checks across Server Actions */
export const ADMIN_ROLES: readonly string[] = ['admin', 'superadmin'];
export const APPROVER_ROLES: readonly string[] = ['admin', 'superadmin', 'approver'];
export const SUPERADMIN_ONLY: readonly string[] = ['superadmin'];

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
    if (roles.length > 0 && !roles.includes(session.user.role)) return null;
    return session;
}
