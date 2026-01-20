
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ROLES = [
    { slug: 'superadmin', name: 'Super Administrator' },
    { slug: 'admin', name: 'Administrator' },
    { slug: 'approver', name: 'Approver' },
    { slug: 'auditor', name: 'Auditor' },
    { slug: 'technician', name: 'Technician' },
    { slug: 'user', name: 'Standard User' },
];

async function migrate() {
    console.log('🚀 Starting Role Migration...');

    // 1. Create Roles
    for (const r of ROLES) {
        await prisma.role.upsert({
            where: { slug: r.slug },
            update: {},
            create: {
                slug: r.slug,
                name: r.name,
                description: `Default ${r.name} role`
            }
        });
        console.log(`✅ Role ensured: ${r.slug}`);
    }

    // 2. Migrate Users
    const users = await prisma.user.findMany({
        include: { userRoles: true }
    });

    console.log(`Found ${users.length} users to check.`);

    for (const user of users) {
        if (!user.role) continue;

        // If user already has roles linked, skip (or we can sync?)
        if (user.userRoles.length > 0) {
            console.log(`User ${user.email} already has roles. Skipping.`);
            continue;
        }

        const targetRole = ROLES.find(r => r.slug === user.role);
        if (targetRole) {
            // Find role ID
            const roleRecord = await prisma.role.findUnique({ where: { slug: targetRole.slug } });

            if (roleRecord) {
                await prisma.userRole.create({
                    data: {
                        userId: user.id,
                        roleId: roleRecord.id
                    }
                });
                console.log(`➕ Assigned ${user.email} -> ${targetRole.slug}`);
            }
        } else {
            console.warn(`⚠️ Unknown role string "${user.role}" for user ${user.email}`);
        }
    }

    console.log('🎉 Migration Complete!');
}

migrate()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
