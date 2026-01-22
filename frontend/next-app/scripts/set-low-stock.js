const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('📉 Setting Low Stock for Testing...');

    // Find "Dell XPS 15" or similar
    const item = await prisma.inventoryItem.findFirst({
        where: { name: { contains: 'Dell' } }
    });

    if (!item) {
        console.error('Item not found');
        return;
    }

    // Update stock to 1 (Min usually 10)
    await prisma.stockLevel.updateMany({
        where: { itemId: item.id },
        data: { quantity: 1, minStock: 10 }
    });

    console.log(`✅ Set stock for ${item.name} to 1 (Min: 10)`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
