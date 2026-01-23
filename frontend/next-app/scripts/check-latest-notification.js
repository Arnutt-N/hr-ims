const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const notif = await prisma.notification.findFirst({
            where: { text: { contains: 'Low Stock Alert' } },
            orderBy: { createdAt: 'desc' }
        });
        console.log('Last Notification:', notif);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
