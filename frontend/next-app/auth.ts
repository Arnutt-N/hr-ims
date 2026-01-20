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
                // Backward compatibility: keep role string for now, but use new system primarily
                token.role = user.role || "user";
                token.tokenVersion = (user as any).tokenVersion || 0;

                try {
                    // 1. Fetch User Roles (Many-to-Many)
                    const userWithRoles = await prisma.user.findUnique({
                        where: { id: parseInt(token.id) },
                        include: {
                            userRoles: {
                                include: { role: true }
                            }
                        }
                    });

                    // Extract role slugs e.g. ["admin", "approver"]
                    const roles = userWithRoles?.userRoles.map(ur => ur.role.slug) || [];
                    // Fallback: if no relation, use string field
                    if (roles.length === 0 && token.role) {
                        roles.push(token.role);
                    }
                    token.roles = roles;

                    // 2. Fetch Permissions for ALL roles
                    // Get role definitions for slug array
                    const permissions = await prisma.rolePermission.findMany({
                        where: {
                            OR: [
                                { role: { in: roles } }, // Legacy string match
                                { roleRef: { slug: { in: roles } } } // New relation match
                            ],
                            canView: true
                        }
                    });

                    token.permissions = Array.from(new Set(permissions.map(p => p.path))); // Unique paths only

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
                session.user.role = token.role; // Legacy
                (session.user as any).roles = token.roles || [token.role]; // New Array
                (session.user as any).permissions = token.permissions;
            }
            return session;
        },
    },
});
