import {
    NotFoundError,
    isAdminTier,
    getManagedWarehouseIds,
    assertWarehouseAccess,
} from '../../lib/authz';

describe('authz helpers', () => {
    it('NotFoundError has statusCode 404', () => {
        const err = new NotFoundError();
        expect(err).toBeInstanceOf(Error);
        expect(err.statusCode).toBe(404);
        expect(err.name).toBe('NotFoundError');
    });

    describe('isAdminTier', () => {
        it('returns true for superadmin or admin in role or roles', () => {
            expect(isAdminTier({ id: 1, role: 'superadmin' })).toBe(true);
            expect(isAdminTier({ id: 2, role: 'admin' })).toBe(true);
            expect(isAdminTier({ id: 3, role: 'user', roles: ['user', 'admin'] })).toBe(true);
            expect(isAdminTier({ id: 4, role: 'approver', roles: ['approver'] })).toBe(false);
            expect(isAdminTier({ id: 5, role: 'user' })).toBe(false);
        });
    });

    describe('getManagedWarehouseIds', () => {
        it('combines Warehouse.managers and DepartmentMapping without duplicates', async () => {
            const prismaMock = {
                warehouse: {
                    findMany: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
                },
                departmentMapping: {
                    findFirst: jest.fn().mockResolvedValue({ warehouseId: 2 }),
                },
            };

            const ids = await getManagedWarehouseIds(prismaMock, {
                id: 10,
                department: 'IT',
            });

            expect(ids.sort()).toEqual([1, 2]);
            expect(prismaMock.warehouse.findMany).toHaveBeenCalledWith({
                where: { managers: { some: { id: 10 } } },
                select: { id: true },
            });
            expect(prismaMock.departmentMapping.findFirst).toHaveBeenCalledWith({
                where: { department: 'IT' },
                select: { warehouseId: true },
            });
        });

        it('adds mapped warehouse when user has department', async () => {
            const prismaMock = {
                warehouse: { findMany: jest.fn().mockResolvedValue([]) },
                departmentMapping: { findFirst: jest.fn().mockResolvedValue({ warehouseId: 5 }) },
            };

            const ids = await getManagedWarehouseIds(prismaMock, {
                id: 10,
                department: 'Finance',
            });

            expect(ids).toEqual([5]);
        });

        it('skips department lookup when department is null', async () => {
            const prismaMock = {
                warehouse: { findMany: jest.fn().mockResolvedValue([]) },
                departmentMapping: { findFirst: jest.fn() },
            };

            const ids = await getManagedWarehouseIds(prismaMock, { id: 10, department: null });

            expect(ids).toEqual([]);
            expect(prismaMock.departmentMapping.findFirst).not.toHaveBeenCalled();
        });
    });

    describe('assertWarehouseAccess', () => {
        it('allows admin tier without querying warehouses', async () => {
            const prismaMock = {
                warehouse: { findMany: jest.fn() },
                departmentMapping: { findFirst: jest.fn() },
            };

            await expect(
                assertWarehouseAccess(prismaMock, { id: 1, role: 'admin' }, 99)
            ).resolves.toBeUndefined();
            expect(prismaMock.warehouse.findMany).not.toHaveBeenCalled();
        });

        it('allows managed warehouse and throws NotFoundError for unmanaged', async () => {
            const prismaMock = {
                warehouse: { findMany: jest.fn().mockResolvedValue([{ id: 3 }]) },
                departmentMapping: { findFirst: jest.fn().mockResolvedValue(null) },
            };

            await expect(
                assertWarehouseAccess(prismaMock, { id: 5, role: 'approver' }, 3)
            ).resolves.toBeUndefined();

            await expect(
                assertWarehouseAccess(prismaMock, { id: 5, role: 'approver' }, 99)
            ).rejects.toThrow(NotFoundError);
        });
    });
});
