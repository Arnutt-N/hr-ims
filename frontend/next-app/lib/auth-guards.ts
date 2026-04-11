import { auth } from '@/auth';
import { sessionHasAnyRole } from '@/lib/role-access';

export {
    ADMIN_ROLES,
    APPROVER_ROLES,
    SUPERADMIN_ONLY,
    getSessionRoles,
    sessionHasAnyRole,
    userHasAnyRole,
} from '@/lib/role-access';

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
