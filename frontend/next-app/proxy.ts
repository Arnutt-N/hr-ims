import NextAuth from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';

const legacyRoleRules = [
    { prefix: '/requests', roles: ['superadmin', 'admin', 'approver'] },
    { prefix: '/maintenance', roles: ['superadmin', 'admin', 'technician'] },
    { prefix: '/history', roles: ['superadmin', 'admin', 'auditor'] },
    { prefix: '/reports', roles: ['superadmin', 'admin', 'auditor'] },
    { prefix: '/scanner', roles: ['superadmin', 'admin', 'technician'] },
    { prefix: '/tags', roles: ['superadmin', 'admin'] },
    { prefix: '/settings', roles: ['superadmin', 'admin'] },
    { prefix: '/users', roles: ['superadmin', 'admin'] },
    { prefix: '/logs', roles: ['superadmin', 'admin', 'auditor'] },
] as const;

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'test-internal-key';

export default NextAuth(authConfig).auth(async (req) => {
    const { nextUrl } = req;
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });
    const user = req.auth?.user as any;

    const tokenRoles = Array.isArray(token?.roles)
        ? token.roles.filter((role): role is string => typeof role === 'string')
        : [];
    const fallbackRole = typeof token?.role === 'string' ? token.role : user?.role;
    const userRoles: string[] = tokenRoles.length > 0
        ? tokenRoles
        : (fallbackRole ? [fallbackRole] : []);
    const userPermissions: string[] = Array.isArray(token?.permissions)
        ? token.permissions.filter((permission): permission is string => typeof permission === 'string')
        : [];
    const userId = typeof token?.id === 'string' ? token.id : user?.id;

    // Inject user headers for API calls to backend
    if (nextUrl.pathname.startsWith('/api/') && !nextUrl.pathname.startsWith('/api/auth/')) {
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set('x-internal-key', INTERNAL_API_KEY);

        if (userId && userRoles.length > 0) {
            requestHeaders.set('x-user-id', userId.toString());
            // Join roles with comma
            requestHeaders.set('x-user-role', userRoles.join(','));

            return NextResponse.next({
                request: {
                    headers: requestHeaders,
                },
            });
        }

        // No auth user for API call - let backend reject it
        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
    }

    // Dynamic RBAC Check
    // 1. Superadmin bypass. Check the normalized roles list AND the legacy
    // `token.role` field as a belt-and-suspenders — an older cookie issued
    // before the jwt-callback refactor may still carry the promoted role
    // string without the `roles` array, and we don't want to lock the user
    // out of a dashboard-visit that would itself refresh the cookie.
    const legacyTokenRole = typeof token?.role === 'string' ? token.role : null;
    const isSuperadmin =
        userRoles.includes('superadmin') || legacyTokenRole === 'superadmin';
    if (isSuperadmin) {
        return NextResponse.next();
    }

    // Let's protect major modules:
    const protectedModules = [
        '/inventory', '/cart', '/my-assets', '/requests', '/maintenance',
        '/history', '/reports', '/scanner', '/tags', '/settings', '/users', '/logs'
    ];

    const isProtected = protectedModules.some(path => nextUrl.pathname.startsWith(path));

    if (isProtected) {
        // Path-based permission match. Allow when the current path is the
        // permitted path, a descendant of it, or a parent section whose
        // children the user has rights to. The parent-section case is
        // necessary so that e.g. /settings loads for an admin who only
        // has /settings/categories — otherwise the shared settings
        // layout would never render for that user.
        const hasPermission = userPermissions.some((allowedPath: string) => {
            if (nextUrl.pathname === allowedPath) return true;
            if (nextUrl.pathname.startsWith(`${allowedPath}/`)) return true;
            if (allowedPath.startsWith(`${nextUrl.pathname}/`)) return true;
            return false;
        });

        // Legacy role fallback. Even when the JWT carries permissions, if
        // they don't cover the requested path we fall back to the
        // hard-coded role rules. This was previously gated on an empty
        // permissions array, which meant a stale/partial permission list
        // could lock a legitimate admin out. Running the legacy check
        // unconditionally keeps /settings, /users, etc. reachable for
        // anyone the role table says should see them.
        const matchingLegacyRule = legacyRoleRules.find((rule) =>
            nextUrl.pathname.startsWith(rule.prefix)
        );
        const legacyRoleCheckNames: readonly string[] = matchingLegacyRule?.roles ?? [];
        const legacyTokenRoleAllowed =
            legacyTokenRole !== null && legacyRoleCheckNames.includes(legacyTokenRole);
        const hasLegacyAccess =
            !matchingLegacyRule ||
            matchingLegacyRule.roles.some((role) => userRoles.includes(role)) ||
            legacyTokenRoleAllowed;

        if (!hasPermission && !hasLegacyAccess) {
            console.log(
                `[Proxy Middleware] Access Denied for roles [${userRoles.join(',')}] (legacy role: ${legacyTokenRole ?? 'none'}) to ${nextUrl.pathname}`,
            );
            return NextResponse.redirect(new URL('/dashboard?error=access_denied', nextUrl.origin));
        }
    }

    return NextResponse.next();
});

export const config = {
    // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
    matcher: ['/((?!_next/static|_next/image|.*\\.png$).*)'],
};
