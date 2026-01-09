
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const userCount = await prisma.user.count();
        console.log(`Users: ${userCount}`);

        if (userCount === 0) {
            console.log('Database empty. Seeding needed.');
            process.exit(2);
        }

        console.log('Database verification successful.');
    } catch (e) {
        console.error('Database verification failed:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
