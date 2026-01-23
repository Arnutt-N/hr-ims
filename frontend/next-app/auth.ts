import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { z } from 'zod';
import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from './lib/prisma';
import bcrypt from 'bcrypt';
import { User as PrismaUser } from '@prisma/client';

async function getUser(email: string): Promise<PrismaUser | undefined> {
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
    adapter: PrismaAdapter(prisma),
    session: { strategy: 'jwt' }, // Keep JWT for compatibility with current flow, but PrismaAdapter will help with session tracking if we use it manually or switch later.
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
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id?.toString() || "";
                token.role = (user as any).role || "user";
                token.tokenVersion = (user as any).tokenVersion || 1;

                // FORCE FIX: Ensure superadmin@demo.com is always superadmin
                if (user.email === 'superadmin@demo.com') {
                    token.role = 'superadmin';
                }

                try {
                    // 1. Fetch User Roles & current Token Version
                    const userDb = await prisma.user.findUnique({
                        where: { id: parseInt(token.id) },
                        include: {
                            userRoles: {
                                include: { role: true }
                            }
                        }
                    });

                    // Check tokenVersion for revocation
                    if (userDb && token.tokenVersion !== userDb.tokenVersion) {
                        console.log('Session revoked via tokenVersion mismatch');
                        return null; // This will effectively log the user out
                    }

                    // Extract role slugs e.g. ["admin", "approver"]
                    const roles = userDb?.userRoles.map(ur => ur.role.slug) || [];

                    // Fallback to the legacy role string if no multi-roles assigned
                    if (roles.length === 0 && token.role) {
                        roles.push(token.role);
                    }
                    token.roles = roles;

                    // 2. Fetch Permissions for ALL assigned roles
                    const permissions = await prisma.rolePermission.findMany({
                        where: {
                            OR: [
                                { role: { in: roles } }, // Legacy string-based match
                                { roleRef: { slug: { in: roles } } } // Relation-based match
                            ],
                            canView: true
                        }
                    });

                    token.permissions = Array.from(new Set(permissions.map(p => p.path)));

                } catch (e) {
                    console.error('Failed to fetch roles/permissions:', e);
                    token.roles = [token.role];
                    token.permissions = [];
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id;
                (session.user as any).role = token.role;
                (session.user as any).roles = token.roles || [token.role];
                (session.user as any).permissions = token.permissions || [];
                (session.user as any).tokenVersion = token.tokenVersion;
            }
            return session;
        },
    },
});
