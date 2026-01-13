import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';

export default NextAuth(authConfig).auth((req) => {
    const { nextUrl } = req;
    const user = req.auth?.user as any;
    const userRole = user?.role;
    const userId = user?.id;

    // Inject user headers for API calls to backend
    if (nextUrl.pathname.startsWith('/api/') && !nextUrl.pathname.startsWith('/api/auth/')) {
        if (userId && userRole) {
            const requestHeaders = new Headers(req.headers);
            requestHeaders.set('x-user-id', userId.toString());
            requestHeaders.set('x-user-role', userRole);

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

    // Route permissions mapping (for page-level protection)
    const permissions: Record<string, string[]> = {
        '/settings': ['superadmin'],
        '/users': ['superadmin', 'admin'],
        '/reports': ['superadmin', 'admin', 'auditor'],
        '/history': ['superadmin', 'admin', 'auditor'],
        '/requests': ['superadmin', 'admin', 'approver'],
        '/maintenance': ['superadmin', 'admin', 'technician'],
        '/scanner': ['superadmin', 'admin', 'technician'],
        '/tags': ['superadmin', 'admin'],
    };

    // Find if the current path check is required
    const currentPath = nextUrl.pathname;
    const restrictedPath = Object.keys(permissions).find(path => currentPath.startsWith(path));

    if (restrictedPath) {
        const allowedRoles = permissions[restrictedPath];
        if (!userRole || !allowedRoles.includes(userRole)) {
            const dashboardUrl = new URL('/dashboard', nextUrl.origin);
            return NextResponse.redirect(dashboardUrl);
        }
    }

    return NextResponse.next();
});

export const config = {
    // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
