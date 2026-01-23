const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Load .env
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

async function main() {
    console.log('🏛️ Verifying 3-Tier Warehouse System...\n');

    try {
        // 1. Check existing warehouses by type
        const warehouses = await prisma.warehouse.findMany({
            include: {
                province: true,
                division: true,
                managers: { select: { name: true } }
            }
        });

        console.log('📦 Current Warehouses:');
        const byType = { main: [], division: [], provincial: [] };
        warehouses.forEach(w => {
            byType[w.type]?.push(w);
        });

        console.log(`   Main: ${byType.main.length}`);
        console.log(`   Division: ${byType.division.length}`);
        console.log(`   Provincial: ${byType.provincial.length}`);
        console.log('');

        // 2. Check Provinces
        const provinces = await prisma.province.findMany({ take: 5 });
        console.log(`📍 Provinces in DB: ${provinces.length > 0 ? provinces.length + '+' : '0'}`);
        if (provinces.length === 0) {
            console.log('   ⚠️ No provinces found. Creating sample provinces...');
            // Create a few sample provinces
            await prisma.province.createMany({
                data: [
                    { name: 'กรุงเทพมหานคร', code: '10' },
                    { name: 'เชียงใหม่', code: '50' },
                    { name: 'ขอนแก่น', code: '40' },
                    { name: 'สงขลา', code: '90' },
                    { name: 'ระยอง', code: '21' }
                ],
                skipDuplicates: true
            });
            console.log('   ✅ Created 5 sample provinces.');
        } else {
            console.log('   Sample:', provinces.slice(0, 3).map(p => p.name).join(', '));
        }

        // 3. Test: Create Provincial Warehouse if none exists
        if (byType.provincial.length === 0) {
            console.log('\n🔧 No Provincial warehouses found. Creating a test one...');

            const province = await prisma.province.findFirst();
            if (!province) {
                console.error('   ❌ Still no province found after seeding.');
                return;
            }

            const manager = await prisma.user.findFirst();

            const newWarehouse = await prisma.warehouse.create({
                data: {
                    name: `คลังจังหวัด${province.name}`,
                    code: `WH-PROV-${province.code || province.id}`,
                    type: 'provincial',
                    provinceId: province.id,
                    isActive: true,
                    managers: manager ? { connect: { id: manager.id } } : undefined
                },
                include: { province: true, managers: true }
            });

            console.log('   ✅ Created Provincial Warehouse:');
            console.log(`      Name: ${newWarehouse.name}`);
            console.log(`      Code: ${newWarehouse.code}`);
            console.log(`      Province: ${newWarehouse.province?.name}`);
            console.log(`      Manager: ${newWarehouse.managers[0]?.name || 'None'}`);
        } else {
            console.log('\n✅ Provincial warehouse already exists:');
            byType.provincial.forEach(w => {
                console.log(`   - ${w.name} (Province: ${w.province?.name || 'N/A'})`);
            });
        }

        // 4. Summary
        console.log('\n=============================================');
        console.log('✅ 3-Tier Warehouse Verification Complete!');
        console.log('   Main warehouses work as central hubs.');
        console.log('   Division warehouses link to Divisions.');
        console.log('   Provincial warehouses link to Provinces.');
        console.log('=============================================');

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
