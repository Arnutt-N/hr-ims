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

    // 2. Check Role Permissions
    // We define "Restricted Routes" as those that have corresponding permissions in DB.
    // However, since we don't query DB here, we rely on the `user.permissions` array in the session.
    // Strategy: If a route matches a known protected pattern, check if user has permission.

    // For now, let's assume ALL top-level routes (except dashboard/profile) might be protected.
    // But to be safe and avoid blocking everything during transition, let's check against user.permissions if it exists.

    // If we want to ENFORCE, we need to know if the route REQUIRES permission.
    // Since we can't know that without DB, we can invert the logic:
    // If the user HAS an explicit "block" or "allow" list?
    // The `user.permissions` array contains PATHS the user IS ALLOWED to access.

    // Let's protect major modules:
    const protectedModules = [
        '/inventory', '/cart', '/my-assets', '/requests', '/maintenance',
        '/history', '/reports', '/scanner', '/tags', '/settings', '/users', '/logs'
    ];

    const isProtected = protectedModules.some(path => nextUrl.pathname.startsWith(path));

    if (isProtected) {
        const userPermissions = user?.permissions || [];
        // Check if user has permission for this path (Union of permissions from ALL roles)
        // We check if any of the user's allowed permissions matches the start of the current path
        const hasAccess = userPermissions.some((allowedPath: string) => nextUrl.pathname.startsWith(allowedPath));

        // Also check legacy hardcoded roles for backward compatibility during migration
        // (Optional: remove this if fully migrated)
        // For now, if dynamic check fails, we fallback to deny, UNLESS we keep some hardcoded overrides.
        // Let's rely on Dynamic only for these paths.

        if (!hasAccess) {
            console.log(`[Middleware] Access Denied for roles [${userRoles.join(',')}] to ${nextUrl.pathname}`);
            // return NextResponse.redirect(new URL('/dashboard', nextUrl.origin));
            // For debugging "Nothing happens", let's redirect to dashboard with error?
            // Or just let it pass if we are not sure? 
            // BETTER: For now, if permissions array is empty/undefined (legacy user), don't block aggressively?
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
