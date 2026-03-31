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
    // 1. Superadmin bypass (Check if ANY role is superadmin)
    if (userRoles.includes('superadmin')) {
        return NextResponse.next();
    }

    // Let's protect major modules:
    const protectedModules = [
        '/inventory', '/cart', '/my-assets', '/requests', '/maintenance',
        '/history', '/reports', '/scanner', '/tags', '/settings', '/users', '/logs'
    ];

    const isProtected = protectedModules.some(path => nextUrl.pathname.startsWith(path));

    if (isProtected) {
        // Check if user has permission for this path (Union of permissions from ALL roles)
        const hasAccess = userPermissions.some((allowedPath: string) => nextUrl.pathname.startsWith(allowedPath));

        if (!hasAccess) {
            console.log(`[Proxy Middleware] Access Denied for roles [${userRoles.join(',')}] to ${nextUrl.pathname}`);
            if (!userPermissions.length) {
                const matchingLegacyRule = legacyRoleRules.find((rule) => nextUrl.pathname.startsWith(rule.prefix));

                if (!matchingLegacyRule || matchingLegacyRule.roles.some((role) => userRoles.includes(role))) {
                    return NextResponse.next();
                }
            }

            return NextResponse.redirect(new URL('/dashboard?error=access_denied', nextUrl.origin));
        }
    }

    return NextResponse.next();
});

export const config = {
    // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
    matcher: ['/((?!_next/static|_next/image|.*\\.png$).*)'],
};
