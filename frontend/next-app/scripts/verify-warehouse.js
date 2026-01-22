const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// 1. Manually Load .env (since we are running with node, not next)
try {
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
        console.log('Loading .env from:', envPath);
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const val = parts.slice(1).join('=').trim().replace(/"/g, ''); // Remove quotes if any
                if (key && !key.startsWith('#')) {
                    process.env[key] = val;
                }
            }
        });
    } else {
        console.log('Warning: .env file not found at', envPath);
    }
} catch (e) {
    console.error('Error loading .env:', e);
}

const prisma = new PrismaClient();

async function main() {
    console.log('Connecting to database...');
    try {
        const warehouses = await prisma.warehouse.findMany({
            include: {
                province: true,
                division: true,
                managers: true
            },
            orderBy: { id: 'desc' }
        });

        console.log('\n=============================================');
        console.log(`📦  Warehouse Verification List (${warehouses.length} Found)`);
        console.log('=============================================');

        if (warehouses.length === 0) {
            console.log('❌ No warehouses found in database.');
        } else {
            warehouses.forEach(w => {
                console.log(`\n🔹 [ID: ${w.id}] ${w.name}`);
                console.log(`   Code:     ${w.code}`);
                console.log(`   Type:     ${w.type.toUpperCase()}`);

                if (w.type === 'provincial') {
                    console.log(`   Province: ${w.province ? '✅ ' + w.province.name : '❌ MISSING PROVINCE'}`);
                } else if (w.type === 'division') {
                    console.log(`   Division: ${w.division ? '✅ ' + w.division.name : '❌ MISSING DIVISION'}`);
                }

                const managerNames = w.managers.map(m => m.name).join(', ');
                console.log(`   Managers: ${managerNames || 'None'}`);
                console.log('   Status:   ' + (w.isActive ? 'Active' : 'Inactive'));
            });
            console.log('\n=============================================');
            console.log('✅ Check if your newly created warehouse is listed above.');
        }

    } catch (error) {
        console.error('❌ Error querying database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
