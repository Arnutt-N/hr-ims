import { auth } from './auth';
import { NextResponse } from 'next/server';
import { authorizeRequest, isLegacyFallbackEnabled } from './lib/proxy-authorize';
import { buildBackendHeaders } from './lib/proxy-headers';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

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
        // Client-sent x-user-* / x-internal-key are stripped inside the
        // builder; identity comes from the session only.
        const requestHeaders = buildBackendHeaders(
            req.headers,
            { id: userId, roles: userRoles },
            INTERNAL_API_KEY,
        );

        return NextResponse.next({ request: { headers: requestHeaders } });
    }

    const decision = authorizeRequest({
        pathname: nextUrl.pathname,
        userRoles,
        userPermissions,
        legacyFallbackEnabled: isLegacyFallbackEnabled(process.env.RBAC_LEGACY_FALLBACK),
    });

    if (!decision.allow) {
        console.log(
            `[Proxy] Access Denied: roles=[${userRoles.join(',')}] path=${nextUrl.pathname}`,
        );
        return NextResponse.redirect(new URL('/dashboard?error=access_denied', nextUrl.origin));
    }

    return NextResponse.next();
});

export const config = {
    matcher: ['/((?!_next/static|_next/image|.*\\.png$).*)'],
};
