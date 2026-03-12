'use server';

import { auth } from '@/auth';

/** Role constants to eliminate stringly-typed role checks across Server Actions */
export const ADMIN_ROLES = ['admin', 'superadmin'] as const;
export const APPROVER_ROLES = ['admin', 'superadmin', 'approver'] as const;

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
