const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('📊 Database Status Report');
    console.log('=================================');

    const counts = {
        Users: await prisma.user.count(),
        Roles: await prisma.role.count(),
        Warehouses: await prisma.warehouse.count(),
        InventoryItems: await prisma.inventoryItem.count(),
        StockLevels: await prisma.stockLevel.count(),
        Requests: await prisma.request.count(),
        Notifications: await prisma.notification.count(),
        Provinces: await prisma.province.count(),
        Divisions: await prisma.division.count(),
        Departments: await prisma.department.count(),
        History: await prisma.history.count(),
        StockTransactions: await prisma.stockTransaction.count(),
        AuditLogs: await prisma.auditLog.count(),
        Categories: await prisma.category.count(),
    };

    Object.entries(counts).forEach(([model, count]) => {
        const icon = count > 0 ? '✅' : '⚠️';
        console.log(`${icon} ${model.padEnd(20)}: ${count}`);
    });

    console.log('=================================');

    // Check specific critical data for testing notifications
    const lowStockItems = await prisma.stockLevel.count({
        where: {
            quantity: { lte: prisma.stockLevel.fields.minStock }
        }
    });
    console.log(`📉 Low Stock Items     : ${lowStockItems} (Needed for Notification Test)`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
