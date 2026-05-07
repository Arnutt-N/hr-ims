import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/auth-cache', () => ({ getCachedAuth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('maintenance Server Actions', () => {
    let maintenance: typeof import('@/lib/actions/maintenance');
    let getCachedAuth: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        ({ getCachedAuth } = (await import('@/lib/auth-cache')) as { getCachedAuth: Mock });
        getCachedAuth.mockReset();
        maintenance = await import('@/lib/actions/maintenance');
    });

    describe('getMaintenanceItems', () => {
        it('rejects unauthenticated', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await maintenance.getMaintenanceItems();
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('rejects users without admin/superadmin/technician', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('user'));
            const result = await maintenance.getMaintenanceItems();
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('returns items in maintenance or issue_reported status', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('technician'));
            prismaMock.inventoryItem.findMany.mockResolvedValue([{ id: 1 }] as any);

            const result = await maintenance.getMaintenanceItems();

            expect((result as any).success).toBe(true);
            const where = prismaMock.inventoryItem.findMany.mock.calls[0][0].where;
            expect(where.OR).toEqual([
                { status: 'maintenance' },
                { status: 'issue_reported' },
            ]);
        });
    });

    describe('updateMaintenanceStatus', () => {
        it('rejects non-admin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('technician'));
            const result = await maintenance.updateMaintenanceStatus(1, 'maintenance');
            expect(result).toEqual({ error: 'Unauthorized - Admin only' });
        });

        it('updates status + writes history', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            prismaMock.inventoryItem.update.mockResolvedValue({} as any);
            prismaMock.history.create.mockResolvedValue({} as any);

            const result = await maintenance.updateMaintenanceStatus(7, 'maintenance', 'Power outage');

            expect((result as any).success).toBe(true);
            expect(prismaMock.inventoryItem.update).toHaveBeenCalledWith({
                where: { id: 7 },
                data: expect.objectContaining({
                    status: 'maintenance',
                    repairNotes: 'Power outage',
                    currentHolderId: undefined,
                }),
            });
            expect(prismaMock.history.create).toHaveBeenCalled();
        });

        it('releases currentHolderId when status flips to "available"', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            prismaMock.inventoryItem.update.mockResolvedValue({} as any);
            prismaMock.history.create.mockResolvedValue({} as any);

            await maintenance.updateMaintenanceStatus(7, 'available');

            const updateData = prismaMock.inventoryItem.update.mock.calls[0][0].data;
            expect(updateData.currentHolderId).toBeNull();
        });

        it('returns error on DB failure', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.inventoryItem.update.mockRejectedValue(new Error('boom'));

            const result = await maintenance.updateMaintenanceStatus(1, 'maintenance');
            expect(result).toEqual({ error: 'Failed to update status' });
            errSpy.mockRestore();
        });
    });
});
