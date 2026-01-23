const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.history.count();
        console.log('History Records:', count);
        const items = await prisma.history.findMany({ take: 5 });
        console.log('Sample:', items);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
