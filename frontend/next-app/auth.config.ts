import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnLogin = nextUrl.pathname === '/login';
            const isOnRegister = nextUrl.pathname === '/register';
            const isOnForgotPassword = nextUrl.pathname === '/forgot-password';
            const isOnResetPassword = nextUrl.pathname.startsWith('/reset-password');
            const isApiRoute = nextUrl.pathname.startsWith('/api/');

            const isPublic = isOnLogin || isOnRegister || isOnForgotPassword || isOnResetPassword || isApiRoute;

            if (!isPublic && !isLoggedIn) {
                return false; // Redirect unauthenticated users to login
            }
            if (isLoggedIn && isOnLogin) {
                return Response.redirect(new URL('/dashboard', nextUrl));
            }
            return true;
        },
    },
    providers: [], // Add providers with an empty array for now
    secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig;
