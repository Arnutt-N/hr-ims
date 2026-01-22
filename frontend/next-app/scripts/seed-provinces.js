const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// 1. Load .env manually
try {
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
        console.log('Loading .env from:', envPath);
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
    console.log('🌱 Starting Manual Seeding...');

    // 1. Ministry
    console.log('Creating Ministry...');
    const ministry = await prisma.ministry.upsert({
        where: { id: 1 },
        update: {},
        create: { name: 'กระทรวงยุติธรรม', abbr: 'MOJ' }
    });

    // 2. Department
    console.log('Creating Department...');
    const department = await prisma.department.upsert({
        where: { id: 1 },
        update: {},
        create: { name: 'กรมสิทธิเสรีภาพ', abbr: 'RLPD', ministryId: ministry.id }
    });

    // 3. Divisions
    console.log('Creating Divisions...');
    const divisions = [
        { name: 'สำนักงานเลขานุการกรม', abbr: 'สลก', departmentId: department.id },
        { name: 'กองบริหารทรัพยากรบุคคล', abbr: 'กบค', departmentId: department.id },
        { name: 'กองแผนงาน', abbr: 'กผ', departmentId: department.id },
        { name: 'ศูนย์เทคโนโลยีสารสนเทศ', abbr: 'ศทส', departmentId: department.id },
    ];

    for (const div of divisions) {
        await prisma.division.upsert({
            where: { id: divisions.indexOf(div) + 1 },
            update: {},
            create: div
        });
    }

    // 4. Provinces
    console.log('Creating Provinces...');
    const provinces = [
        { name: 'กรุงเทพมหานคร', code: '10' },
        { name: 'เชียงใหม่', code: '50' },
        { name: 'ขอนแก่น', code: '40' },
        { name: 'สงขลา', code: '90' },
        { name: 'นครราชสีมา', code: '30' },
        { name: 'ภูเก็ต', code: '83' },
    ];

    for (const prov of provinces) {
        await prisma.province.upsert({
            where: { id: provinces.indexOf(prov) + 1 },
            update: {},
            create: prov
        });
    }

    const count = await prisma.province.count();
    console.log(`✅ Seeding Complete! Total Provinces: ${count}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
