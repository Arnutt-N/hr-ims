import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/lib/auth-cache', () => ({ getCachedAuth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/actions/audit', () => ({ logActivity: vi.fn() }));

describe('permissions Server Actions', () => {
    let permissions: typeof import('@/lib/actions/permissions');
    let getCachedAuth: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        ({ getCachedAuth } = (await import('@/lib/auth-cache')) as { getCachedAuth: Mock });
        getCachedAuth.mockReset();
        permissions = await import('@/lib/actions/permissions');
    });

    describe('getPermissions', () => {
        it('rejects non-superadmin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            const result = await permissions.getPermissions();
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('rejects unauthenticated', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await permissions.getPermissions();
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('returns role permissions for superadmin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('superadmin'));
            prismaMock.rolePermission.findMany.mockResolvedValue([
                { role: 'admin', menu: 'inventory', path: '/inventory', canView: true },
            ] as any);

            const result = await permissions.getPermissions();
            expect((result as any).success).toBe(true);
            expect(prismaMock.rolePermission.findMany).toHaveBeenCalledWith({
                orderBy: { role: 'asc' },
            });
        });
    });

    describe('updatePermission', () => {
        it('rejects non-superadmin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            const result = await permissions.updatePermission('admin', 'inventory', '/inventory', true);
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('upserts permission and bumps tokenVersion of all users with that role', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('superadmin'));
            prismaMock.rolePermission.upsert.mockResolvedValue({ id: 1 } as any);
            prismaMock.user.findMany.mockResolvedValue([{ id: 4 }, { id: 5 }] as any);
            prismaMock.user.updateMany.mockResolvedValue({ count: 2 } as any);

            const result = await permissions.updatePermission('admin', 'inventory', '/inventory', false);

            expect((result as any).success).toBe(true);
            expect(prismaMock.rolePermission.upsert).toHaveBeenCalledWith({
                where: { role_menu: { role: 'admin', menu: 'inventory' } },
                update: { canView: false, path: '/inventory' },
                create: { role: 'admin', menu: 'inventory', path: '/inventory', canView: false },
            });
            expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
                where: { id: { in: [4, 5] } },
                data: { tokenVersion: { increment: 1 } },
            });
        });

        it('skips updateMany when no affected users', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('superadmin'));
            prismaMock.rolePermission.upsert.mockResolvedValue({} as any);
            prismaMock.user.findMany.mockResolvedValue([] as any);

            await permissions.updatePermission('admin', 'inventory', '/inventory', true);
            expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
        });

        it('returns failure on DB error', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('superadmin'));
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.$transaction.mockRejectedValue(new Error('boom'));

            const result = await permissions.updatePermission('admin', 'inventory', '/inventory', true);
            expect(result).toEqual({ error: 'Failed to update permission' });
            err.mockRestore();
        });
    });
});
