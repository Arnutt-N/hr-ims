/**
 * IDOR Test Fixture
 *
 * Builds a self-contained synthetic dataset for `idor.test.ts` and tears it
 * down afterwards. The suite issues mutating requests (stock adjustments,
 * request status transitions), so it must never run against a database that
 * holds anything real.
 *
 * Isolation strategy
 * - Every row this fixture creates is namespaced with `IDOR_FIXTURE_PREFIX`
 *   (emails, warehouse codes, item serials, department names).
 * - `teardownIdorFixture` deletes only rows carrying that prefix, in FK order.
 * - Every assertion in `idor.test.ts` references a fixture id, so the suite is
 *   safe against a database that also holds seeded demo data (which is what
 *   `security-e2e.yml` provides: `prisma db push` + `prisma db seed`).
 * - `checkDatabaseIsolation` refuses a non-SQLite target, because a mutating
 *   authorization suite must never talk to a shared server.
 *
 * Two warehouses are created so that "assigned" vs "unassigned" is a real
 * distinction rather than a guess:
 * - WH-A (`IDOR-FIX-A`) is managed by the approver fixture user.
 * - WH-B (`IDOR-FIX-B`) is managed by nobody in the fixture.
 */

import prisma from '../../../utils/prisma';

export const IDOR_FIXTURE_PREFIX = 'idor-fixture-';

/** Marker used to prove a mutation did or did not happen. */
export const FIXTURE_MARKER = 'IDOR_FIXTURE_MARKER';

export type IdorFixture = {
    warehouses: {
        /** Managed by the approver fixture user. */
        assigned: { id: number; code: string };
        /** Managed by no fixture user. */
        unassigned: { id: number; code: string };
    };
    users: {
        /** Plain `user` role, no warehouse assignment. */
        owner: { id: number; email: string };
        /** A second plain `user` — the IDOR victim for horizontal tests. */
        victim: { id: number; email: string };
        /** `approver` role that manages `warehouses.assigned`. */
        assignedApprover: { id: number; email: string };
        /** `approver` role that manages nothing. */
        unassignedApprover: { id: number; email: string };
        /** `admin` role — the positive control for admin-only routes. */
        admin: { id: number; email: string };
        /** `technician` role — scoped to their own requests (V20). */
        technician: { id: number; email: string };
        /** `auditor` role — read-only, scoped to their own requests (V20). */
        auditor: { id: number; email: string };
    };
    items: {
        /** Item stocked in both warehouses. */
        shared: { id: number; name: string };
    };
    stockLevels: {
        assigned: { id: number; warehouseId: number; itemId: number; quantity: number };
        unassigned: { id: number; warehouseId: number; itemId: number; quantity: number };
    };
    requests: {
        /** Owned by `users.owner`, targets `warehouses.assigned`, pending. */
        ownerPending: { id: number; userId: number; warehouseId: number };
        /** Owned by `users.victim`, targets `warehouses.assigned`, pending. */
        victimPending: { id: number; userId: number; warehouseId: number };
        /** Owned by `users.victim`, targets `warehouses.unassigned`, pending. */
        victimUnassigned: { id: number; userId: number; warehouseId: number };
        /** Owned by `users.victim`, no warehouse at all — the V21 case. */
        victimNoWarehouse: { id: number; userId: number; warehouseId: null };
    };
};

/**
 * Refuse to run against anything but a local SQLite file.
 *
 * This suite mutates stock quantities and request statuses. Against a shared
 * MySQL/TiDB server that would be destructive; against a local SQLite file the
 * blast radius is one throwaway file. Returns a report so the suite can log
 * what it found next to the fixture rows it created.
 */
export async function checkDatabaseIsolation(): Promise<{
    url: string;
    preExistingWarehouses: number;
    preExistingRequests: number;
}> {
    const url = process.env.DATABASE_URL ?? '';
    if (!url.startsWith('file:')) {
        throw new Error(
            `Refusing to run the mutating IDOR suite against a non-SQLite target ` +
                `(DATABASE_URL=${url || '<unset>'}). Use a throwaway file: database.`,
        );
    }

    return {
        url,
        preExistingWarehouses: await prisma.warehouse.count({
            where: { code: { not: { startsWith: IDOR_FIXTURE_PREFIX } } },
        }),
        preExistingRequests: await prisma.request.count({
            where: { user: { email: { not: { startsWith: IDOR_FIXTURE_PREFIX } } } },
        }),
    };
}

/** Remove every row this fixture owns. Safe to call when nothing exists. */
export async function teardownIdorFixture(): Promise<void> {
    const users = await prisma.user.findMany({
        where: { email: { startsWith: IDOR_FIXTURE_PREFIX } },
        select: { id: true },
    });
    const userIds = users.map((u) => u.id);

    const warehouses = await prisma.warehouse.findMany({
        where: { code: { startsWith: IDOR_FIXTURE_PREFIX } },
        select: { id: true },
    });
    const warehouseIds = warehouses.map((w) => w.id);

    const items = await prisma.inventoryItem.findMany({
        where: { serial: { startsWith: IDOR_FIXTURE_PREFIX } },
        select: { id: true },
    });
    const itemIds = items.map((i) => i.id);

    const requests = await prisma.request.findMany({
        where: { userId: { in: userIds } },
        select: { id: true },
    });
    const requestIds = requests.map((r) => r.id);

    // FK-safe order: children before parents.
    await prisma.requestItem.deleteMany({ where: { requestId: { in: requestIds } } });
    await prisma.history.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.stockTransaction.deleteMany({ where: { userId: { in: userIds } } });
    // Stock transfers reference both warehouses and the requesting user, so
    // they must go before either parent. The V22 suite creates real transfers,
    // and leaving them behind breaks the warehouse delete below with a foreign
    // key violation.
    await prisma.stockTransfer.deleteMany({
        where: {
            OR: [
                { requestedBy: { in: userIds } },
                { fromWarehouseId: { in: warehouseIds } },
                { toWarehouseId: { in: warehouseIds } },
            ],
        },
    });
    await prisma.request.deleteMany({ where: { id: { in: requestIds } } });
    await prisma.stockLevel.deleteMany({ where: { warehouseId: { in: warehouseIds } } });
    await prisma.departmentMapping.deleteMany({
        where: { department: { startsWith: IDOR_FIXTURE_PREFIX } },
    });
    // Detach managers before deleting warehouses.
    for (const warehouseId of warehouseIds) {
        await prisma.warehouse.update({
            where: { id: warehouseId },
            data: { managers: { set: [] } },
        });
    }
    await prisma.warehouse.deleteMany({ where: { id: { in: warehouseIds } } });
    await prisma.inventoryItem.deleteMany({ where: { id: { in: itemIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

/** Create the synthetic dataset. Assumes `assertIsolatedDatabase` passed. */
export async function createIdorFixture(): Promise<IdorFixture> {
    await teardownIdorFixture();

    const mkUser = async (slug: string, role: string, department: string | null = null) =>
        prisma.user.create({
            data: {
                email: `${IDOR_FIXTURE_PREFIX}${slug}@example.invalid`,
                password: 'not-a-real-hash',
                name: `${IDOR_FIXTURE_PREFIX}${slug}`,
                role,
                department,
                status: 'active',
            },
            select: { id: true, email: true },
        });

    const owner = await mkUser('owner', 'user');
    const victim = await mkUser('victim', 'user');
    const assignedApprover = await mkUser('approver-assigned', 'approver');
    const unassignedApprover = await mkUser('approver-unassigned', 'approver');
    const admin = await mkUser('admin', 'admin');
    const technician = await mkUser('technician', 'technician');
    const auditor = await mkUser('auditor', 'auditor');

    const assignedWarehouse = await prisma.warehouse.create({
        data: {
            name: `${IDOR_FIXTURE_PREFIX}Assigned Warehouse`,
            code: `${IDOR_FIXTURE_PREFIX}A`,
            type: 'main',
            isActive: true,
            managers: { connect: [{ id: assignedApprover.id }] },
        },
        select: { id: true, code: true },
    });

    const unassignedWarehouse = await prisma.warehouse.create({
        data: {
            name: `${IDOR_FIXTURE_PREFIX}Unassigned Warehouse`,
            code: `${IDOR_FIXTURE_PREFIX}B`,
            type: 'main',
            isActive: true,
        },
        select: { id: true, code: true },
    });

    const item = await prisma.inventoryItem.create({
        data: {
            name: `${IDOR_FIXTURE_PREFIX}Shared Item`,
            category: 'fixture',
            type: 'consumable',
            serial: `${IDOR_FIXTURE_PREFIX}ITEM-1`,
            stock: 100,
        },
        select: { id: true, name: true },
    });

    const assignedStock = await prisma.stockLevel.create({
        data: {
            warehouseId: assignedWarehouse.id,
            itemId: item.id,
            quantity: 40,
            reserved: 0,
            minStock: 5,
        },
        select: { id: true, warehouseId: true, itemId: true, quantity: true },
    });

    const unassignedStock = await prisma.stockLevel.create({
        data: {
            warehouseId: unassignedWarehouse.id,
            itemId: item.id,
            quantity: 7,
            reserved: 0,
            minStock: 5,
        },
        select: { id: true, warehouseId: true, itemId: true, quantity: true },
    });

    const mkRequest = async (
        userId: number,
        warehouseId: number,
        quantity: number,
        status = 'pending',
    ) => {
        const created = await prisma.request.create({
            data: {
                userId,
                type: 'withdraw',
                status,
                warehouseId,
                requestItems: {
                    create: [{ itemId: item.id, quantity }],
                },
            },
            select: { id: true, userId: true, warehouseId: true },
        });
        // Reserve the quantity so an approval transition can succeed.
        await prisma.stockLevel.update({
            where: { warehouseId_itemId: { warehouseId, itemId: item.id } },
            data: { reserved: { increment: quantity } },
        });
        return {
            id: created.id,
            userId: created.userId,
            warehouseId: warehouseId as number,
        };
    };

    const ownerPending = await mkRequest(owner.id, assignedWarehouse.id, 2);
    const victimPending = await mkRequest(victim.id, assignedWarehouse.id, 3);
    const victimUnassigned = await mkRequest(victim.id, unassignedWarehouse.id, 1);

    // A request with no warehouse. Created directly rather than through
    // `mkRequest` because that helper reserves stock, which needs a warehouse.
    const noWarehouseRequest = await prisma.request.create({
        data: {
            userId: victim.id,
            type: 'withdraw',
            status: 'pending',
            warehouseId: null,
            requestItems: { create: [{ itemId: item.id, quantity: 1 }] },
        },
        select: { id: true, userId: true },
    });

    return {
        warehouses: {
            assigned: { id: assignedWarehouse.id, code: assignedWarehouse.code },
            unassigned: { id: unassignedWarehouse.id, code: unassignedWarehouse.code },
        },
        users: {
            owner,
            victim,
            assignedApprover,
            unassignedApprover,
            admin,
            technician,
            auditor,
        },
        items: { shared: item },
        stockLevels: {
            assigned: assignedStock,
            unassigned: unassignedStock,
        },
        requests: {
            ownerPending,
            victimPending,
            victimUnassigned,
            victimNoWarehouse: {
                id: noWarehouseRequest.id,
                userId: noWarehouseRequest.userId,
                warehouseId: null,
            },
        },
    };
}
