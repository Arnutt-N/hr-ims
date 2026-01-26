
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding sample notifications...');

    // Find users
    const admin = await prisma.user.findUnique({
        where: { email: 'admin@ims.pro' }
    });

    const demoAdmin = await prisma.user.findUnique({
        where: { email: 'admin@demo.com' }
    });

    const users = [admin, demoAdmin].filter(Boolean);

    if (users.length === 0) {
        console.error('❌ No admin users found to seed notifications for.');
        return;
    }

    const sampleNotifications = [
        { text: '⚠️ Low Stock Alert: MacBook Pro M3 in คลังกลาง is down to 2 (Min: 5)' },
        { text: '⚠️ Low Stock Alert: iPad Air 5 in คลังอุปกรณ์ไอที is down to 1 (Min: 3)' },
        { text: '📦 New Request: #1024 Borrow Request from Somchai Staff' },
        { text: '✅ Your request #1023 has been approved.' },
        { text: '🗓️ Reminder: You have 3 items overdue for return.' },
    ];

    for (const user of users) {
        console.log(`- Seeding for ${user.email}`);
        for (const notif of sampleNotifications) {
            await prisma.notification.create({
                data: {
                    userId: user.id,
                    text: notif.text,
                    read: false,
                    createdAt: new Date(Date.now() - Math.random() * 86400000) // Random time in last 24h
                }
            });
        }
    }

    console.log('✅ Seeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
