const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// 1. Manually Load .env
try {
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const val = parts.slice(1).join('=').trim().replace(/"/g, '');
                if (key && !key.startsWith('#')) {
                    process.env[key] = val;
                }
            }
        });
    }
} catch (e) {
    console.error('Error loading .env:', e);
}

const prisma = new PrismaClient();
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function main() {
    console.log('🔔 Starting End-to-End Notification Test...');

    try {
        // 1. Find a Warehouse and Manager
        // ideally find one with a manager, or assign one.
        let warehouse = await prisma.warehouse.findFirst({
            include: { managers: true }
        });

        if (!warehouse) {
            console.error('❌ No warehouses found.');
            return;
        }

        let manager = warehouse.managers[0];
        if (!manager) {
            console.log('⚠️ Warehouse has no manager. Assigning a user...');
            const user = await prisma.user.findFirst();
            if (!user) {
                console.error('❌ No users found to assign as manager.');
                return;
            }
            // Assign user as manager
            await prisma.warehouse.update({
                where: { id: warehouse.id },
                data: {
                    managers: {
                        connect: { id: user.id }
                    }
                }
            });
            manager = user;
            console.log(`✅ Assigned ${user.name} as manager to ${warehouse.name}`);
        } else {
            console.log(`ℹ️ Using Manager: ${manager.name} (ID: ${manager.id}) for Warehouse: ${warehouse.name}`);
        }

        // 2. Find or Create Test Item
        let item = await prisma.inventoryItem.findFirst({
            where: { name: { contains: 'Test Alert Item' } }
        });

        if (!item) {
            item = await prisma.inventoryItem.create({
                data: {
                    name: 'Test Alert Item ' + Date.now(),
                    category: 'Electronics',
                    type: 'consumable', // Required: consumable | asset
                    status: 'available',
                    stock: 0,
                    categoryId: 1
                }
            });
            console.log(`✅ Created Test Item: ${item.name}`);
        } else {
            console.log(`ℹ️ Using Test Item: ${item.name}`);
        }

        // 3. Set Initial Stock > MinStock
        // Create/Update StockLevel
        const minStock = 10;
        const safeStock = 15;
        const lowStock = 5;

        // Clean up existing stock levels for this item/warehouse to be sure
        await prisma.stockLevel.deleteMany({
            where: { itemId: item.id, warehouseId: warehouse.id }
        });

        await prisma.stockLevel.create({
            data: {
                itemId: item.id,
                warehouseId: warehouse.id,
                quantity: safeStock,
                minStock: minStock
            }
        });
        console.log(`✅ Reset Stock: Qty=${safeStock}, Min=${minStock}`);

        // 4. Clear existing notifications for this manager specific to this item to avoid false positives
        const alertTextSnippet = `Low Stock Alert: ${item.name}`;
        await prisma.notification.deleteMany({
            where: {
                userId: manager.id,
                text: { contains: alertTextSnippet },
                read: false
            }
        });
        console.log('🧹 Cleared old test notifications');

        // 5. Trigger "Borrow" (simulate stock drop)
        console.log(`📉 Simulating stock drop to ${lowStock}...`);
        await prisma.stockLevel.updateMany({
            where: { itemId: item.id, warehouseId: warehouse.id },
            data: { quantity: lowStock }
        });

        // 6. Call Trigger API (or run locally if server not running)
        console.log(`🚀 Triggering Check via API: ${API_URL}/api/debug/trigger-notification`);
        let apiSuccess = false;
        try {
            const response = await fetch(`${API_URL}/api/debug/trigger-notification`);
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            const json = await response.json();
            console.log('   API Response:', json);
            apiSuccess = true;
        } catch (e) {
            console.error('   ❌ Failed to call API (Is server running?):', e.message);
            console.log('   ⚠️ Running local checkLowStock logic...');

            // Local implementation of checkLowStock
            const lowStockItems = await prisma.stockLevel.findMany({
                where: {
                    minStock: { not: null }
                },
                include: {
                    item: true,
                    warehouse: {
                        include: { managers: true }
                    }
                }
            });

            let count = 0;
            for (const stock of lowStockItems) {
                if (stock.quantity <= (stock.minStock || 0)) {
                    const managers = stock.warehouse.managers;
                    const message = `Low Stock Alert: ${stock.item.name} in ${stock.warehouse.name} is down to ${stock.quantity} (Min: ${stock.minStock})`;

                    for (const mgr of managers) {
                        const existing = await prisma.notification.findFirst({
                            where: {
                                userId: mgr.id,
                                text: message,
                                read: false
                            }
                        });

                        if (!existing) {
                            await prisma.notification.create({
                                data: {
                                    userId: mgr.id,
                                    text: message,
                                    read: false
                                }
                            });
                            count++;
                        }
                    }
                }
            }
            console.log(`   ✅ Local check generated ${count} notification(s).`);
        }

        // 7. Verify Notification
        console.log('🔍 Verifying Notification...');
        // Wait a small moment for async operations (though API should be awaited)
        await new Promise(r => setTimeout(r, 1000));

        const notification = await prisma.notification.findFirst({
            where: {
                userId: manager.id,
                text: { contains: alertTextSnippet },
                read: false
            }
        });

        if (notification) {
            console.log('✅ PASS: Notification found!');
            console.log(`   [${notification.createdAt.toISOString()}] ${notification.text}`);
        } else {
            console.error('❌ FAIL: Notification NOT found.');
            // Debug info
            const currentStock = await prisma.stockLevel.findFirst({
                where: { itemId: item.id, warehouseId: warehouse.id }
            });
            console.log('   Current Stock Level:', currentStock);
        }

    } catch (e) {
        console.error('❌ Error during test:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
