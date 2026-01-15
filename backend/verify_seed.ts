
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Verifying seed data...");
    const users = await prisma.user.findMany({
        where: {
            email: {
                in: [
                    'superadmin@demo.com',
                    'admin@demo.com',
                    'approver@demo.com',
                    'auditor@demo.com',
                    'tech@demo.com',
                    'user@demo.com'
                ]
            }
        }
    });

    console.log(`Found ${users.length} demo users.`);
    users.forEach(u => console.log(`- ${u.email} (${u.role})`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
