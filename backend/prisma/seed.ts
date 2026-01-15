
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const password = await bcrypt.hash('password123', 10);

    // Users
    const admin = await prisma.user.upsert({
        where: { email: 'admin@ims.pro' },
        update: { password },
        create: {
            email: 'admin@ims.pro',
            password,
            name: 'Admin User',
            role: 'admin',
            department: 'IT Management',
            avatar: 'https://i.pravatar.cc/150?u=1',
        },
    });

    const staff = await prisma.user.upsert({
        where: { email: 'somchai@ims.pro' },
        update: { password },
        create: {
            email: 'somchai@ims.pro',
            password,
            name: 'Somchai Staff',
            role: 'user',
            department: 'Sales Dept',
            avatar: 'https://i.pravatar.cc/150?u=8',
        },
    });

    // Inventory
    await prisma.inventoryItem.deleteMany({});
    await prisma.inventoryItem.createMany({
        data: [
            { name: 'MacBook Pro M2', category: 'IT Equipment', type: 'durable', serial: 'MBP-2023-001', status: 'available', image: '💻', stock: 1 },
            { name: 'Projector Epson', category: 'Audio Visual', type: 'durable', serial: 'PJ-EPS-099', status: 'borrowed', image: '📽️', stock: 1 },
            { name: 'Canon DSLR 80D', category: 'Camera', type: 'durable', serial: 'CAM-80D-005', status: 'available', image: '📷', stock: 1 },
            { name: 'A4 Paper (Double A)', category: 'Office Supply', type: 'consumable', serial: 'SUP-A4-001', status: 'available', image: '📄', stock: 50 },
        ],
    });

    // Settings
    // Demo Users
    const demoPassword = await bcrypt.hash('demo123', 10);
    const demoUsers = [
        { email: 'superadmin@demo.com', name: 'Demo Superadmin', role: 'superadmin', department: 'Executive' },
        { email: 'admin@demo.com', name: 'Demo Admin', role: 'admin', department: 'IT' },
        { email: 'approver@demo.com', name: 'Demo Approver', role: 'approver', department: 'Management' },
        { email: 'auditor@demo.com', name: 'Demo Auditor', role: 'auditor', department: 'Finance' },
        { email: 'tech@demo.com', name: 'Demo Technician', role: 'technician', department: 'Maintenance' },
        { email: 'user@demo.com', name: 'Demo User', role: 'user', department: 'Sales' },
    ];

    for (const user of demoUsers) {
        await prisma.user.upsert({
            where: { email: user.email },
            update: { password: demoPassword, role: user.role }, // Update role/password if exists
            create: {
                email: user.email,
                password: demoPassword,
                name: user.name,
                role: user.role,
                department: user.department,
                avatar: `https://ui-avatars.com/api/?name=${user.name.replace(' ', '+')}&background=random`,
            },
        });
    }

    // Settings (Upsert to prevent duplicates)
    await prisma.settings.upsert({
        where: { id: 1 },
        update: {},
        create: {
            orgName: 'IMS Corporation',
            borrowLimit: 7,
            checkInterval: 7,
            maintenanceAlert: true,
            allowRegistration: true, // Enable for demo
        },
    });

    console.log('Seed data created');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
