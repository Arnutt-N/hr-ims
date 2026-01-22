const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Fixing Missing Data...');
    console.log('Available Models:', Object.keys(prisma).filter(k => !k.startsWith('_')));

    // 1. SYNC CATEGORIES
    console.log('🔄 Syncing Categories...');
    const items = await prisma.inventoryItem.findMany({
        select: { category: true },
        distinct: ['category']
    });

    for (const item of items) {
        if (!item.category) continue;

        let cat = await prisma.category.findUnique({
            where: { name: item.category }
        });

        if (!cat) {
            cat = await prisma.category.create({
                data: { name: item.category, description: 'Seeded Category' }
            });
            console.log(`   + Created Category: ${cat.name}`);
        }

        // Link items
        await prisma.inventoryItem.updateMany({
            where: { category: item.category, categoryId: null },
            data: { categoryId: cat.id }
        });
    }

    // 2. SEED AUDIT LOGS
    console.log('📜 Seeding Audit Logs...');
    const user = await prisma.user.findFirst({ where: { role: 'superadmin' } });
    if (user) {
        const logs = [
            { action: 'LOGIN', entity: 'System', details: 'User logged in' },
            { action: 'SEED_DATA', entity: 'Database', details: 'Manual seeding executed' },
            { action: 'UPDATE_STOCK', entity: 'Inventory', details: 'Updated MacBook stock' },
        ];

        for (const log of logs) {
            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: log.action,
                    entity: log.entity,
                    details: log.details,
                    createdAt: new Date()
                }
            });
        }
        console.log(`   + Added ${logs.length} audit logs.`);
    }

    console.log('✅ Fix Complete!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
