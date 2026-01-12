import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';

export default NextAuth(authConfig).auth((req) => {
    const { nextUrl } = req;
    const user = req.auth?.user as any;
    const userRole = user?.role;

    // Route permissions mapping
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
