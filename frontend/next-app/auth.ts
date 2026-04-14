import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { Prisma } from '@prisma/client';
import { authConfig } from './auth.config';
import { z } from 'zod';
import prisma from './lib/prisma';
import bcrypt from 'bcrypt';
import { ensureUserHasPrimaryRole } from './lib/role-sync';
import { Role } from '@/lib/types/user-types';
import { getRoleList } from '@/lib/role-access';

type UserWithRoles = Prisma.UserGetPayload<{
    include: {
        userRoles: {
            include: {
                role: true;
            };
        };
    };
}>;

type AuthenticatedUser = {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: string;
    roles: string[];
    permissions: string[];
    tokenVersion: number;
};

async function getUser(email: string): Promise<UserWithRoles | undefined> {
    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                userRoles: {
                    include: {
                        role: true,
                    },
                },
            },
        });
        return user ?? undefined;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw new Error('Failed to fetch user.');
    }
}

function getPrimaryRole(roles: string[], fallbackRole: string): string {
    if (roles.includes('superadmin')) {
        return 'superadmin';
    }

    if (roles.includes('admin')) {
        return 'admin';
    }

    return roles[0] || fallbackRole;
}

async function getPermissionsForRoles(roleSlugs: string[]): Promise<string[]> {
    if (roleSlugs.length === 0) {
        return [];
    }

    const permissions = await prisma.rolePermission.findMany({
        where: {
            OR: [
                { role: { in: roleSlugs } },
                { roleRef: { slug: { in: roleSlugs } } },
            ],
            canView: true,
        },
        select: {
            path: true,
        },
    });

    return Array.from(new Set(permissions.map((permission) => permission.path)));
}

async function buildAuthenticatedUser(user: UserWithRoles): Promise<AuthenticatedUser> {
    const fallbackRole = user.role || 'user';
    const roles = user.userRoles.map((userRole) => userRole.role.slug);

    if (roles.length === 0 && user.role) {
        await ensureUserHasPrimaryRole(prisma, user.id, user.role as Role);
        roles.push(user.role);
    }

    const normalizedRoles = getRoleList({
        roles,
        role: fallbackRole,
    });

    const primaryRole = getPrimaryRole(normalizedRoles, fallbackRole);
    const permissions = await getPermissionsForRoles(normalizedRoles);

    return {
        id: user.id.toString(),
        email: user.email,
        name: user.name,
        image: user.avatar,
        role: primaryRole,
        roles: getRoleList({
            roles: normalizedRoles,
            role: primaryRole,
        }),
        permissions,
        tokenVersion: user.tokenVersion,
    };
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
                            return await buildAuthenticatedUser(user);
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
        // Spread first so jwt/session below override any same-named callbacks,
        // while preserving `authorized` (only defined in authConfig).
        ...authConfig.callbacks,
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id?.toString() || "";
                token.role = user.role || "user";
                token.roles = Array.isArray(user.roles) ? user.roles : [];
                token.permissions = Array.isArray(user.permissions) ? user.permissions : [];
                token.tokenVersion = typeof user.tokenVersion === 'number' ? user.tokenVersion : 1;
            }

            const tokenId = typeof token.id === 'string' ? token.id : '';
            const fallbackRole = typeof token.role === 'string' ? token.role : 'user';

            if (!tokenId) {
                return token;
            }

            try {
                const userDb = await prisma.user.findUnique({
                    where: { id: Number.parseInt(tokenId, 10) },
                    select: {
                        role: true,
                        status: true,
                        tokenVersion: true,
                    },
                });

                if (!userDb || userDb.status !== 'active') {
                    return null;
                }

                if (typeof token.tokenVersion === 'number' && token.tokenVersion !== userDb.tokenVersion) {
                    return null;
                }

                token.tokenVersion = userDb.tokenVersion;
                token.role = typeof token.role === 'string' ? token.role : userDb.role || fallbackRole;
                token.roles = getRoleList({
                    roles: Array.isArray(token.roles)
                        ? token.roles.filter((role): role is string => typeof role === 'string')
                        : [],
                    role: typeof token.role === 'string' ? token.role : undefined,
                });
                token.permissions = Array.isArray(token.permissions)
                    ? token.permissions.filter((permission): permission is string => typeof permission === 'string')
                    : [];
            } catch (e) {
                console.error('Failed to validate session token:', e);
                token.roles = [typeof token.role === 'string' ? token.role : 'user'];
                token.permissions = [];
            }

            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                const sessionRole = typeof token.role === 'string' ? token.role : 'user';
                const sessionRoles = getRoleList({
                    roles: Array.isArray(token.roles)
                        ? token.roles.filter((role): role is string => typeof role === 'string')
                        : [],
                    role: sessionRole,
                });
                session.user.id = typeof token.id === 'string' ? token.id : '';
                (session.user as any).role = sessionRole;
                (session.user as any).roles = sessionRoles;
                (session.user as any).permissions = Array.isArray(token.permissions)
                    ? token.permissions.filter((permission): permission is string => typeof permission === 'string')
                    : [];
                (session.user as any).tokenVersion = typeof token.tokenVersion === 'number' ? token.tokenVersion : 1;
            }
            return session;
        },
    },
});
