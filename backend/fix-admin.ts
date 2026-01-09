
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Update admin user role
    const adminUser = await prisma.user.update({
        where: { email: 'admin@ims.pro' },
        data: { role: 'admin', name: 'Admin User' }
    });

    console.log('Admin user updated:', adminUser);

    // Create staff user if not exists
    const staffExists = await prisma.user.findUnique({ where: { email: 'somchai@ims.pro' } });
    if (!staffExists) {
        const bcrypt = await import('bcrypt');
        const password = await bcrypt.hash('password123', 10);
        await prisma.user.create({
            data: {
                email: 'somchai@ims.pro',
                password,
                name: 'Somchai Staff',
                role: 'user'
            }
        });
        console.log('Staff user created');
    }

    console.log('Done!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
