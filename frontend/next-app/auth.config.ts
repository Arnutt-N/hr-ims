import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
            const isOnLogin = nextUrl.pathname === '/login';
            const isOnSettings = nextUrl.pathname.startsWith('/settings');

            console.log(`[Middleware] Path: ${nextUrl.pathname}, LoggedIn: ${isLoggedIn}`);

            if (isOnDashboard || isOnSettings) {
                if (isLoggedIn) return true;
                return false; // Redirect unauthenticated users to login page
            } else if (isLoggedIn && isOnLogin) {
                // Potential redirect loop if session is invalid in DB but cookie exists
                // We'll allow staying on login page if it's a direct access or if we suspect a loop
                // For now, let's keep it but monitor. If it loops, the user will be stuck.
                // A safer way is to ONLY redirect if we are SURE. 
                // But in NextAuth v5 middleware, we can't check DB.
                // So we'll disable this auto-redirect for now to be safe.
                // return Response.redirect(new URL('/dashboard', nextUrl));
                return true;
            }
            return true;
        },
    },
    providers: [], // Add providers with an empty array for now
    secret: process.env.AUTH_SECRET || "fallback-secret-key-for-dev",
} satisfies NextAuthConfig;
