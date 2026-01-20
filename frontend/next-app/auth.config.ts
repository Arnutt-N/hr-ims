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

            if (isOnDashboard || isOnSettings) {
                if (isLoggedIn) return true;
                return false; // Redirect to login
            } else if (isLoggedIn && isOnLogin) {
                return true;
            }
            return true;
        },
    },
    providers: [], // Add providers with an empty array for now
    secret: process.env.AUTH_SECRET || "fallback-secret-key-for-dev",
} satisfies NextAuthConfig;
