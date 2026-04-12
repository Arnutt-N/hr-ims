import { auth } from './auth';
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

export default auth(async (req) => {
    const { nextUrl } = req;
    // req.auth is populated by the SAME NextAuth instance (auth.ts) that wrote
    // the JWT cookie — jwt+session callbacks always run, so roles/permissions
    // are present.  This does mean one DB round-trip per request (the jwt
    // callback fetches userRoles + permissions).  Acceptable for an internal
    // tool; add TTL-based caching in the jwt callback if it becomes a bottleneck.
    const user = req.auth?.user;
    const userRoles: string[] = user?.roles ?? (user?.role ? [user.role] : []);
    const userPermissions: string[] = user?.permissions ?? [];
    const userId: string | undefined = user?.id;

    // Inject user headers for API calls to backend
    if (nextUrl.pathname.startsWith('/api/') && !nextUrl.pathname.startsWith('/api/auth/')) {
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set('x-internal-key', INTERNAL_API_KEY);

        if (userId && userRoles.length > 0) {
            requestHeaders.set('x-user-id', userId.toString());
            requestHeaders.set('x-user-role', userRoles.join(','));
        }

        return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Superadmin bypass
    if (userRoles.includes('superadmin')) {
        return NextResponse.next();
    }

    // Protected modules RBAC
    const protectedModules = [
        '/inventory', '/cart', '/my-assets', '/requests', '/maintenance',
        '/history', '/reports', '/scanner', '/tags', '/settings', '/users', '/logs'
    ];

    const isProtected = protectedModules.some(path => nextUrl.pathname.startsWith(path));

    if (isProtected) {
        // Path-based permission match
        const hasPermission = userPermissions.some((allowedPath: string) => {
            if (nextUrl.pathname === allowedPath) return true;
            if (nextUrl.pathname.startsWith(`${allowedPath}/`)) return true;
            if (allowedPath.startsWith(`${nextUrl.pathname}/`)) return true;
            return false;
        });

        // Legacy role fallback
        const matchingLegacyRule = legacyRoleRules.find((rule) =>
            nextUrl.pathname.startsWith(rule.prefix)
        );
        const hasLegacyAccess =
            !matchingLegacyRule ||
            matchingLegacyRule.roles.some((role) => userRoles.includes(role));

        if (!hasPermission && !hasLegacyAccess) {
            console.log(
                `[Proxy] Access Denied: roles=[${userRoles.join(',')}] path=${nextUrl.pathname}`,
            );
            return NextResponse.redirect(new URL('/dashboard?error=access_denied', nextUrl.origin));
        }
    }

    return NextResponse.next();
});

export const config = {
    matcher: ['/((?!_next/static|_next/image|.*\\.png$).*)'],
};
