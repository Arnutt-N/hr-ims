const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding History Data...');

    const user = await prisma.user.findFirst();
    if (!user) {
        console.log('❌ No user found');
        return;
    }

    await prisma.history.createMany({
        data: [
            { userId: user.id, action: 'borrow', item: 'Dell XPS 15', status: 'approved', date: new Date() },
            { userId: user.id, action: 'borrow', item: 'Dell XPS 15', status: 'approved', date: new Date() },
            { userId: user.id, action: 'borrow', item: 'MacBook Pro', status: 'approved', date: new Date() },
            { userId: user.id, action: 'withdraw', item: 'HDMI Cable', status: 'completed', date: new Date() }
        ]
    });

    console.log('✅ Added 4 history records.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
