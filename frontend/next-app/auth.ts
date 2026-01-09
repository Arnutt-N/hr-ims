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

export const { auth, signIn, signOut } = NextAuth({
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

                        if (passwordsMatch) return user;
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
});
