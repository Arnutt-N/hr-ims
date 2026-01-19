import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { z } from 'zod';
import prisma from './lib/prisma';
import bcrypt from 'bcrypt';
import { User } from '@prisma/client';

async function getUser(email: string): Promise<User | undefined> {
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        return user ?? undefined;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw new Error('Failed to fetch user.');
    }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    try {
                        const user = await getUser(email);
                        if (!user) return null;

                        const passwordsMatch = await bcrypt.compare(password, user.password);

                        if (passwordsMatch) {
                            return {
                                ...user,
                                id: user.id.toString(),
                            };
                        }
                    } catch (e) {
                        console.error('Error during authorize:', e);
                        return null;
                    }
                }

                return null;
            },
        }),
    ],
    secret: process.env.AUTH_SECRET || "fallback-secret-key-for-dev",
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id?.toString() || "";
                token.role = user.role || "user";
                token.tokenVersion = (user as any).tokenVersion || 0;
            }

            // Periodically check token validity (e.g., every request or optimised)
            // For now, checks whenever JWT is accessed
            if (token.id) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: parseInt(token.id as string) },
                    select: { tokenVersion: true }
                });

                // If user doesn't exist or token version mismatch, invalidate
                if (!dbUser || (dbUser.tokenVersion && dbUser.tokenVersion > (token.tokenVersion as number))) {
                    console.log(`[Auth] Invalidation triggered for user ${token.id}. DB Version: ${dbUser?.tokenVersion}, Token Version: ${token.tokenVersion}`);
                    return null; // This will trigger sign out in most cases
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
            }
            return session;
        },
    },
});
