import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { z } from 'zod';
import prisma from './lib/prisma';
import bcrypt from 'bcrypt';
import { User as PrismaUser } from '@prisma/client';
import { ensureUserHasPrimaryRole } from './lib/role-sync';
import { Role } from '@/lib/types/user-types';

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
    session: { strategy: 'jwt' },
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
                        if (user.status !== 'active') return null;

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
    secret: process.env.AUTH_SECRET,
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id?.toString() || "";
                token.role = (user as any).role || "user";
                token.tokenVersion = (user as any).tokenVersion || 1;
            }

            const tokenId = typeof token.id === 'string' ? token.id : '';
            const fallbackRole = typeof token.role === 'string' ? token.role : 'user';

            if (!tokenId) {
                return token;
            }

            try {
                // 1. Fetch User Roles & current Token Version
                const userDb = await prisma.user.findUnique({
                    where: { id: Number.parseInt(tokenId, 10) },
                    include: {
                        userRoles: {
                            include: { role: true }
                        }
                    }
                });

                if (!userDb || userDb.status !== 'active') {
                    return null;
                }

                // Check tokenVersion for revocation
                if (typeof token.tokenVersion === 'number' && token.tokenVersion !== userDb.tokenVersion) {
                    console.log('Session revoked via tokenVersion mismatch');
                    return null; // This will effectively log the user out
                }

                token.tokenVersion = userDb.tokenVersion;

                // Extract role slugs e.g. ["admin", "approver"]
                const roles = userDb.userRoles.map((ur) => ur.role.slug);

                // Backfill the primary relation for legacy users that only have the string role.
                if (roles.length === 0 && userDb.role) {
                    await ensureUserHasPrimaryRole(prisma, userDb.id, userDb.role as Role);
                    roles.push(userDb.role);
                } else if (roles.length === 0 && fallbackRole) {
                    roles.push(fallbackRole);
                }

                token.roles = roles;

                // PROMOTE ROLE: If superadmin is in the list, ensure token.role is also superadmin
                // This handles legacy pages that only check token.role
                if (roles.includes('superadmin')) {
                    token.role = 'superadmin';
                } else if (roles.includes('admin') && token.role !== 'superadmin') {
                    token.role = 'admin';
                } else {
                    token.role = roles[0] || userDb.role || fallbackRole;
                }

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
                token.roles = [typeof token.role === 'string' ? token.role : 'user'];
                token.permissions = [];
            }

            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                const sessionRole = typeof token.role === 'string' ? token.role : 'user';
                session.user.id = typeof token.id === 'string' ? token.id : '';
                (session.user as any).role = sessionRole;
                (session.user as any).roles = Array.isArray(token.roles)
                    ? token.roles.filter((role): role is string => typeof role === 'string')
                    : [sessionRole];
                (session.user as any).permissions = Array.isArray(token.permissions)
                    ? token.permissions.filter((permission): permission is string => typeof permission === 'string')
                    : [];
                (session.user as any).tokenVersion = typeof token.tokenVersion === 'number' ? token.tokenVersion : 1;
            }
            return session;
        },
    },
});
