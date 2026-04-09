
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ROLE_LABELS: Record<string, string> = {
    superadmin: 'Super Administrator',
    admin: 'Administrator',
    approver: 'Approver',
    auditor: 'Auditor',
    technician: 'Technician',
    user: 'Standard User',
};

const ROLE_PERMISSIONS: Record<string, Array<{ menu: string; path: string }>> = {
    superadmin: [
        { menu: 'Dashboard', path: '/dashboard' },
        { menu: 'Inventory', path: '/inventory' },
        { menu: 'Cart', path: '/cart' },
        { menu: 'My Assets', path: '/my-assets' },
        { menu: 'Requests', path: '/requests' },
        { menu: 'Maintenance', path: '/maintenance' },
        { menu: 'History', path: '/history' },
        { menu: 'Reports', path: '/reports' },
        { menu: 'Scanner', path: '/scanner' },
        { menu: 'Tags', path: '/tags' },
        { menu: 'Users', path: '/users' },
        { menu: 'Audit Logs', path: '/logs' },
        { menu: 'Categories', path: '/settings/categories' },
        { menu: 'Warehouses', path: '/settings/warehouses' },
        { menu: 'Dept Mapping', path: '/settings/departments' },
        { menu: 'System Config', path: '/settings/system' },
        { menu: 'Permissions', path: '/settings/permissions' },
        { menu: 'Active Sessions', path: '/settings/sessions' },
        { menu: 'Logging', path: '/settings/logging' },
        { menu: 'Backup & Restore', path: '/settings/backup' },
        { menu: 'Email Config', path: '/settings/email' },
        { menu: 'System Health', path: '/settings/health' },
    ],
    admin: [
        { menu: 'Dashboard', path: '/dashboard' },
        { menu: 'Inventory', path: '/inventory' },
        { menu: 'Cart', path: '/cart' },
        { menu: 'My Assets', path: '/my-assets' },
        { menu: 'Requests', path: '/requests' },
        { menu: 'Maintenance', path: '/maintenance' },
        { menu: 'History', path: '/history' },
        { menu: 'Reports', path: '/reports' },
        { menu: 'Scanner', path: '/scanner' },
        { menu: 'Tags', path: '/tags' },
        { menu: 'Users', path: '/users' },
        { menu: 'Audit Logs', path: '/logs' },
        { menu: 'Categories', path: '/settings/categories' },
        { menu: 'Warehouses', path: '/settings/warehouses' },
        { menu: 'Dept Mapping', path: '/settings/departments' },
        { menu: 'Permissions', path: '/settings/permissions' },
        { menu: 'Active Sessions', path: '/settings/sessions' },
        { menu: 'System Health', path: '/settings/health' },
    ],
    approver: [
        { menu: 'Dashboard', path: '/dashboard' },
        { menu: 'Inventory', path: '/inventory' },
        { menu: 'Cart', path: '/cart' },
        { menu: 'My Assets', path: '/my-assets' },
        { menu: 'Requests', path: '/requests' },
    ],
    auditor: [
        { menu: 'Dashboard', path: '/dashboard' },
        { menu: 'Inventory', path: '/inventory' },
        { menu: 'Cart', path: '/cart' },
        { menu: 'My Assets', path: '/my-assets' },
        { menu: 'History', path: '/history' },
        { menu: 'Reports', path: '/reports' },
        { menu: 'Audit Logs', path: '/logs' },
    ],
    technician: [
        { menu: 'Dashboard', path: '/dashboard' },
        { menu: 'Inventory', path: '/inventory' },
        { menu: 'Cart', path: '/cart' },
        { menu: 'My Assets', path: '/my-assets' },
        { menu: 'Maintenance', path: '/maintenance' },
        { menu: 'Scanner', path: '/scanner' },
    ],
    user: [
        { menu: 'Dashboard', path: '/dashboard' },
        { menu: 'Inventory', path: '/inventory' },
        { menu: 'Cart', path: '/cart' },
        { menu: 'My Assets', path: '/my-assets' },
    ],
};

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

    await prisma.history.deleteMany({});
    await prisma.requestItem.deleteMany({});
    await prisma.request.deleteMany({});
    await prisma.departmentMapping.deleteMany({});
    await prisma.userRole.deleteMany({});
    await prisma.rolePermission.deleteMany({});

    // Inventory
    // Inventory - Clear dependent tables first
    await prisma.stockLevel.deleteMany({});
    await prisma.cartItem.deleteMany({});
    await prisma.stockTransaction.deleteMany({});
    await prisma.stockTransfer.deleteMany({});
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

    const allSeedUsers = [
        { id: admin.id, role: 'admin' },
        { id: staff.id, role: 'user' },
        ...(
            await prisma.user.findMany({
                where: {
                    email: {
                        in: demoUsers.map((user) => user.email),
                    },
                },
                select: { id: true, role: true },
            })
        ),
    ];

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

    // ==========================================
    // SEED ORGANIZATION STRUCTURE
    // ==========================================

    // 1. Ministry
    const ministry = await prisma.ministry.upsert({
        where: { id: 1 },
        update: {},
        create: { name: 'กระทรวงยุติธรรม', abbr: 'MOJ' }
    });

    // 2. Department
    const department = await prisma.department.upsert({
        where: { id: 1 },
        update: {},
        create: { name: 'กรมสิทธิเสรีภาพ', abbr: 'RLPD', ministryId: ministry.id }
    });

    // 3. Divisions
    const divisions = [
        { name: 'สำนักงานเลขานุการกรม', abbr: 'สลก', departmentId: department.id },
        { name: 'กองบริหารทรัพยากรบุคคล', abbr: 'กบค', departmentId: department.id },
        { name: 'กองแผนงาน', abbr: 'กผ', departmentId: department.id },
        { name: 'ศูนย์เทคโนโลยีสารสนเทศ', abbr: 'ศทส', departmentId: department.id },
    ];

    for (const div of divisions) {
        await prisma.division.upsert({
            where: { id: divisions.indexOf(div) + 1 }, // Simple ID strategy for seed
            update: {},
            create: div
        });
    }

    // 4. Provinces
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

    // 5. Warehouses
    const mainWarehouse = await prisma.warehouse.upsert({
        where: { code: 'WH-HQ' },
        update: {
            name: 'Main Warehouse',
            type: 'main',
            isActive: true,
        },
        create: {
            name: 'Main Warehouse',
            code: 'WH-HQ',
            type: 'main',
            isActive: true,
            managers: {
                connect: { id: admin.id },
            },
        },
    });

    for (const [slug, name] of Object.entries(ROLE_LABELS)) {
        await prisma.role.upsert({
            where: { slug },
            update: {
                name,
                description: `Default ${name} role`,
            },
            create: {
                slug,
                name,
                description: `Default ${name} role`,
            },
        });
    }

    for (const seededUser of allSeedUsers) {
        const role = await prisma.role.findUnique({
            where: { slug: seededUser.role },
        });

        if (!role) {
            continue;
        }

        await prisma.userRole.upsert({
            where: {
                userId_roleId: {
                    userId: seededUser.id,
                    roleId: role.id,
                },
            },
            update: {},
            create: {
                userId: seededUser.id,
                roleId: role.id,
            },
        });
    }

    for (const [roleSlug, permissions] of Object.entries(ROLE_PERMISSIONS)) {
        const role = await prisma.role.findUnique({
            where: { slug: roleSlug },
        });

        for (const permission of permissions) {
            await prisma.rolePermission.upsert({
                where: {
                    role_menu: {
                        role: roleSlug,
                        menu: permission.menu,
                    },
                },
                update: {
                    path: permission.path,
                    canView: true,
                    roleId: role?.id,
                },
                create: {
                    role: roleSlug,
                    roleId: role?.id,
                    menu: permission.menu,
                    path: permission.path,
                    canView: true,
                },
            });
        }
    }

    await prisma.warehouse.upsert({
        where: { code: 'WH-IT' },
        update: {
            name: 'IT Warehouse',
            type: 'division',
            divisionId: 4,
            isActive: true,
        },
        create: {
            name: 'IT Warehouse',
            code: 'WH-IT',
            type: 'division',
            divisionId: 4,
            isActive: true,
            managers: {
                connect: { id: admin.id },
            },
        },
    });


    // ==========================================
    // SEED INVENTORY & STOCK
    // ==========================================

    // 6. Test Inventory Items
    const itemsData = [
        { name: 'MacBook Pro M3', category: 'IT', type: 'durable', serial: 'MBP-M3-001', status: 'available', image: '💻', stock: 10 },
        { name: 'Dell XPS 15', category: 'IT', type: 'durable', serial: 'DELL-XPS-001', status: 'available', image: '💻', stock: 5 },
        { name: 'iPad Air 5', category: 'IT', type: 'durable', serial: 'IPAD-A5-001', status: 'borrowed', image: '📱', stock: 3 },
        { name: 'Logitech MX Master 3S', category: 'Accessory', type: 'durable', status: 'available', image: '🖱️', stock: 20 },
        { name: 'A4 Paper (Double A)', category: 'Office Supply', type: 'consumable', status: 'available', image: '📄', stock: 100 },
        { name: 'Blue Pen (Quantum)', category: 'Office Supply', type: 'consumable', status: 'available', image: '🖊️', stock: 200 },
        { name: 'HDMI Cable 2m', category: 'Accessory', type: 'durable', status: 'available', image: '🔌', stock: 15 },
        { name: 'Projector Epson X5', category: 'AV', type: 'durable', serial: 'PJ-EPS-X5', status: 'maintenance', image: '📽️', stock: 1 },
        { name: 'Office Chair Ergo', category: 'Furniture', type: 'durable', status: 'available', image: '🪑', stock: 5 },
        { name: 'Whiteboard Marker', category: 'Office Supply', type: 'consumable', status: 'available', image: '🖍️', stock: 50 },
    ];

    console.log('Creating Inventory Items & Stock...');

    for (const item of itemsData) {
        const createdItem = await prisma.inventoryItem.upsert({
            where: { serial: item.serial || `GEN-${Math.floor(Math.random() * 10000)}` }, // Fallback for non-serial items
            update: {},
            create: {
                name: item.name,
                category: item.category,
                type: item.type,
                serial: item.serial || undefined,
                status: item.status,
                image: item.image,
                // Create Stock Level for Main Warehouse
                stockLevels: {
                    create: {
                        warehouseId: mainWarehouse.id,
                        quantity: item.stock,
                        minStock: 10, // Alert if below 10
                        maxStock: 500
                    }
                }
            }
        });

        // Seed Low Stock Scenario (e.g., for iPad)
        if (item.name.includes('iPad')) {
            await prisma.stockLevel.upsert({
                where: { warehouseId_itemId: { warehouseId: mainWarehouse.id, itemId: createdItem.id } },
                update: { quantity: 2, minStock: 5 }, // 2 < 5 -> Low Stock!
                create: { warehouseId: mainWarehouse.id, itemId: createdItem.id, quantity: 2, minStock: 5 }
            });
        }
    }

    // ==========================================
    // SEED REQUESTS
    // ==========================================
    console.log('Creating Mock Requests...');

    const users = await prisma.user.findMany();
    const user = users.find(u => u.role === 'user') || users[0];
    const items = await prisma.inventoryItem.findMany();

    if (user && items.length > 0) {
        // 1. Pending Borrow Request
        await prisma.request.create({
            data: {
                userId: user.id,
                type: 'borrow',
                status: 'pending',
                warehouseId: mainWarehouse.id,
                requestItems: {
                    create: { itemId: items[0].id, quantity: 1 }
                }
            }
        });

        // 2. Approved Withdraw Request (consumable)
        const consumable = items.find(i => i.type === 'consumable');
        if (consumable) {
            await prisma.request.create({
                data: {
                    userId: user.id,
                    type: 'withdraw',
                    status: 'approved',
                    warehouseId: mainWarehouse.id,
                    requestItems: {
                        create: { itemId: consumable.id, quantity: 5 }
                    }
                }
            });
        }
    }

    // ==========================================
    // SEED DEPARTMENT USERS
    // ==========================================
    console.log('Creating Department Users...');
    const deptUsers = [
        { email: 'it_staff@demo.com', name: 'IT Staff', dept: 'IT', role: 'user' },
        { email: 'hr_staff@demo.com', name: 'HR Staff', dept: 'Human Resources', role: 'user' },
        { email: 'finance_staff@demo.com', name: 'Finance Staff', dept: 'Finance', role: 'auditor' },
    ];

    for (const u of deptUsers) {
        await prisma.user.upsert({
            where: { email: u.email },
            update: {},
            create: {
                email: u.email,
                password: await bcrypt.hash('demo123', 10),
                name: u.name,
                role: u.role,
                department: u.dept,
                avatar: `https://ui-avatars.com/api/?name=${u.name.replace(' ', '+')}&background=random`
            }
        });
    }

    // ==========================================
    // SEED DEPARTMENT MAPPINGS
    // ==========================================
    console.log('Creating Department Mappings...');
    // Map IT Department to Main Warehouse
    await prisma.departmentMapping.upsert({
        where: { department: 'IT' },
        update: {},
        create: {
            department: 'IT',
            warehouseId: mainWarehouse.id
        }
    });

    // ==========================================
    // SEED HISTORY & AUDIT LOGS
    // ==========================================
    console.log('Creating History & Audit Logs...');
    const allUsers = await prisma.user.findMany();
    const allItems = await prisma.inventoryItem.findMany();

    // 1. History (Login/User Actions)
    await prisma.history.createMany({
        data: [
            { userId: allUsers[0].id, action: 'LOGIN', item: 'System', status: 'Success' },
            { userId: allUsers[0].id, action: 'VIEW_REPORT', item: 'Inventory Summary', status: 'Success' },
            { userId: allUsers[1]?.id || allUsers[0].id, action: 'LOGIN', item: 'System', status: 'Success' },
        ]
    });

    // 2. Stock Transactions (Simulate Scanner/Audit)
    if (allItems.length > 0) {
        // Inbound (Receive Stock)
        await prisma.stockTransaction.create({
            data: {
                warehouseId: mainWarehouse.id,
                itemId: allItems[0].id,
                quantity: 10,
                type: 'inbound',
                referenceId: 'PO-2024-001',
                note: 'Received from Vendor (Scanned)',
                userId: allUsers[0].id
            }
        });

        // Transfer Out
        await prisma.stockTransaction.create({
            data: {
                warehouseId: mainWarehouse.id,
                itemId: allItems[1]?.id || allItems[0].id,
                quantity: -1,
                type: 'transfer_out',
                referenceId: 'TR-2024-999',
                note: 'Transfer to Branch',
                userId: allUsers[0].id
            }
        });
    }

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
