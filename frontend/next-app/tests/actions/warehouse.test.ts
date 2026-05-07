import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/auth-cache', () => ({ getCachedAuth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/actions/audit', () => ({ logActivity: vi.fn() }));

describe('warehouse Server Actions', () => {
    let warehouse: typeof import('@/lib/actions/warehouse');
    let authMock: Mock;
    let getCachedAuth: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        ({ auth: authMock } = (await import('@/auth')) as { auth: Mock });
        ({ getCachedAuth } = (await import('@/lib/auth-cache')) as { getCachedAuth: Mock });
        authMock.mockReset();
        getCachedAuth.mockReset();
        warehouse = await import('@/lib/actions/warehouse');
    });

    const validInput = {
        name: 'Central',
        code: 'CTL',
        type: 'main',
        divisionId: null,
        provinceId: null,
        managerIds: [4],
        isActive: true,
    };

    describe('getWarehouses', () => {
        it('rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const result = await warehouse.getWarehouses();
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('returns warehouses with relations', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.warehouse.findMany.mockResolvedValue([{ id: 1 }] as any);
            const result = (await warehouse.getWarehouses()) as any;
            expect(result.success).toBe(true);
            expect(result.warehouses).toHaveLength(1);
        });
    });

    describe('createWarehouse', () => {
        it('rejects non-admin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('user'));
            const result = await warehouse.createWarehouse(validInput);
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('rejects when code is duplicate', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.warehouse.findUnique.mockResolvedValue({ id: 1 } as any);
            const result = await warehouse.createWarehouse(validInput);
            expect(result).toEqual({ error: 'Warehouse code already exists' });
        });

        it('creates warehouse + connects managers', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.warehouse.findUnique.mockResolvedValue(null);
            prismaMock.warehouse.create.mockResolvedValue({ id: 7 } as any);

            const result = (await warehouse.createWarehouse(validInput)) as any;
            expect(result.success).toBe(true);
            expect(prismaMock.warehouse.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        name: 'Central',
                        code: 'CTL',
                        managers: { connect: [{ id: 4 }] },
                    }),
                }),
            );
        });

        it('returns Zod issue on bad input', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            const result = await warehouse.createWarehouse({ ...validInput, name: 'a' });
            expect((result as any).error).toBeTruthy();
        });
    });

    describe('updateWarehouse', () => {
        it('rejects non-admin', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await warehouse.updateWarehouse(1, validInput);
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('uses managers.set to replace relations', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.warehouse.update.mockResolvedValue({ id: 1 } as any);

            await warehouse.updateWarehouse(1, validInput);

            const data = prismaMock.warehouse.update.mock.calls[0][0].data;
            expect(data.managers).toEqual({ set: [{ id: 4 }] });
        });
    });

    describe('deleteWarehouse', () => {
        it('rejects non-superadmin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            const result = await warehouse.deleteWarehouse(1);
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('deletes and writes audit row for superadmin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('superadmin'));
            prismaMock.warehouse.delete.mockResolvedValue({ id: 1, name: 'Central' } as any);

            const result = await warehouse.deleteWarehouse(1);
            expect(result).toEqual({ success: true });
            expect(prismaMock.warehouse.delete).toHaveBeenCalledWith({ where: { id: 1 } });
        });

        it('returns error on DB failure', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('superadmin'));
            const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.warehouse.delete.mockRejectedValue(new Error('boom'));

            const result = await warehouse.deleteWarehouse(1);
            expect(result).toEqual({ error: 'Failed to delete warehouse' });
            errSpy.mockRestore();
        });
    });

    describe('getDivisions / getProvinces', () => {
        it('getDivisions returns ordered list', async () => {
            prismaMock.division.findMany.mockResolvedValue([{ id: 1 }] as any);
            const result = (await warehouse.getDivisions()) as any;
            expect(result.success).toBe(true);
        });

        it('getProvinces returns ordered list', async () => {
            prismaMock.province.findMany.mockResolvedValue([{ id: 1 }] as any);
            const result = (await warehouse.getProvinces()) as any;
            expect(result.success).toBe(true);
        });

        it('getDivisions returns error on DB failure', async () => {
            const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.division.findMany.mockRejectedValue(new Error('boom'));
            const result = await warehouse.getDivisions();
            expect(result).toEqual({ error: 'Failed to fetch divisions' });
            errSpy.mockRestore();
        });
    });
});
