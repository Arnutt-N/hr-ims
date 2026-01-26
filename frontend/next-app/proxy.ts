import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';

export default NextAuth(authConfig).auth((req) => {
    const { nextUrl } = req;
    const user = req.auth?.user as any;

    // Extract roles: Use array if available, fallback to single string in array
    const userRoles: string[] = user?.roles || (user?.role ? [user.role] : []);
    const userId = user?.id;

    // Inject user headers for API calls to backend
    if (nextUrl.pathname.startsWith('/api/') && !nextUrl.pathname.startsWith('/api/auth/')) {
        if (userId && userRoles.length > 0) {
            const requestHeaders = new Headers(req.headers);
            requestHeaders.set('x-user-id', userId.toString());
            // Join roles with comma
            requestHeaders.set('x-user-role', userRoles.join(','));

            return NextResponse.next({
                request: {
                    headers: requestHeaders,
                },
            });
        } else {
            // No auth user for API call - let backend reject it
            return NextResponse.next();
        }
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
        const userPermissions = user?.permissions || [];
        // Check if user has permission for this path (Union of permissions from ALL roles)
        const hasAccess = userPermissions.some((allowedPath: string) => nextUrl.pathname.startsWith(allowedPath));

        if (!hasAccess) {
            console.log(`[Proxy Middleware] Access Denied for roles [${userRoles.join(',')}] to ${nextUrl.pathname}`);
            if (!userPermissions.length) {
                // Fallback for legacy configuration
                return NextResponse.next();
            } else {
                return NextResponse.redirect(new URL('/dashboard?error=access_denied', nextUrl.origin));
            }
        }
    }

    return NextResponse.next();
});

export const config = {
    // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
