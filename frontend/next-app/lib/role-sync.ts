import { Prisma, PrismaClient } from '@prisma/client';
import { Role } from '@/lib/types/user-types';

const ROLE_LABELS: Record<Role, string> = {
    [Role.superadmin]: 'Super Administrator',
    [Role.admin]: 'Administrator',
    [Role.approver]: 'Approver',
    [Role.auditor]: 'Auditor',
    [Role.technician]: 'Technician',
    [Role.user]: 'Standard User',
};

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export async function ensureUserHasPrimaryRole(prisma: PrismaLike, userId: number, roleSlug: Role) {
    const role = await prisma.role.upsert({
        where: { slug: roleSlug },
        update: {},
        create: {
            slug: roleSlug,
            name: ROLE_LABELS[roleSlug],
            description: `Default ${ROLE_LABELS[roleSlug]} role`,
        },
    });

    await prisma.userRole.deleteMany({
        where: {
            userId,
            NOT: {
                roleId: role.id,
            },
        },
    });

    await prisma.userRole.upsert({
        where: {
            userId_roleId: {
                userId,
                roleId: role.id,
            },
        },
        update: {},
        create: {
            userId,
            roleId: role.id,
        },
    });

    return role;
}

export async function syncUserPrimaryRole(
    prisma: PrismaLike,
    userId: number,
    currentRoleSlug: Role | null | undefined,
    nextRoleSlug: Role,
) {
    const nextRole = await ensureUserHasPrimaryRole(prisma, userId, nextRoleSlug);

    if (currentRoleSlug && currentRoleSlug !== nextRoleSlug) {
        const currentRole = await prisma.role.findUnique({
            where: { slug: currentRoleSlug },
        });

        if (currentRole) {
            await prisma.userRole.deleteMany({
                where: {
                    userId,
                    roleId: currentRole.id,
                },
            });
        }
    }

    return nextRole;
}
