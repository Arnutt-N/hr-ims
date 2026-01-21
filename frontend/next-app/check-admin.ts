
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const email = 'superadmin@demo.com';
    console.log(`Checking user: ${email}...`);
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        console.log('User not found!');
    } else {
        console.log(`User found. Role: ${user.role}`);

        // Check permissions
        // const perms = await prisma.rolePermission.findMany({ where: { role: user.role } });
        // console.log(`Permissions found for role ${user.role}: ${perms.length}`);

        if (user.role !== 'superadmin') {
            console.log('Updating role to superadmin...');
            await prisma.user.update({
                where: { email },
                data: { role: 'superadmin' }
            });
            console.log('Role updated.');
        } else {
            console.log('Role is already superadmin.');
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
