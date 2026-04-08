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
            const isAuthPage = isOnLogin || isOnRegister || isOnForgotPassword || isOnResetPassword;
            const shouldRedirectAuthenticatedUser =
                isOnRegister || isOnForgotPassword || isOnResetPassword;

            const isPublic = isAuthPage || isApiRoute;

            if (!isPublic && !isLoggedIn) {
                return false; // Redirect unauthenticated users to login
            }
            // Keep /login page redirects inside the page itself so App Router receives
            // a normal Next redirect instead of a middleware redirect during RSC navigation.
            if (isLoggedIn && shouldRedirectAuthenticatedUser) {
                return Response.redirect(new URL('/dashboard', nextUrl));
            }
            return true;
        },
    },
    providers: [], // Add providers with an empty array for now
    secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig;
