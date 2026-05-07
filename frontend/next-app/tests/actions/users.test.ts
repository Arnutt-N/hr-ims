import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/auth-cache', () => ({ getCachedAuth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/actions/audit', () => ({ logActivity: vi.fn() }));
vi.mock('@/lib/role-sync', () => ({
    ensureUserHasPrimaryRole: vi.fn(),
    syncUserPrimaryRole: vi.fn(),
}));
vi.mock('bcrypt', () => ({
    default: { hash: vi.fn() },
    hash: vi.fn(),
}));

const VALID_PASSWORD = 'Test1234!';

describe('users Server Actions', () => {
    let users: typeof import('@/lib/actions/users');
    let getCachedAuth: Mock;
    let bcryptHash: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        ({ getCachedAuth } = (await import('@/lib/auth-cache')) as { getCachedAuth: Mock });
        getCachedAuth.mockReset();
        const bcryptModule = (await import('bcrypt')) as any;
        bcryptHash = bcryptModule.default?.hash ?? bcryptModule.hash;
        (bcryptHash as Mock).mockReset();
        (bcryptHash as Mock).mockResolvedValue('hashed');
        users = await import('@/lib/actions/users');
    });

    describe('getUsers', () => {
        it('returns users for admin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.user.findMany.mockResolvedValue([{ id: 1 }] as any);

            const result = await users.getUsers();
            expect((result as any).success).toBe(true);
        });

        it('rejects non-admin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('user'));
            const result = await users.getUsers();
            expect(result).toEqual({ error: 'Unauthorized - Admin only' });
        });

        it('rejects unauthenticated', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await users.getUsers();
            expect(result).toEqual({ error: 'Unauthorized - Admin only' });
        });
    });

    describe('createUser', () => {
        const validInput = {
            email: 'new@x.com',
            password: VALID_PASSWORD,
            name: 'Newbie',
            role: 'user',
            department: 'Eng',
            status: 'active',
        };

        it('rejects unauthenticated', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await users.createUser(validInput);
            expect(result).toEqual({ error: 'Unauthorized - Admin only' });
        });

        it('rejects non-admin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('user'));
            const result = await users.createUser(validInput);
            expect(result).toEqual({ error: 'Unauthorized - Admin only' });
        });

        it('rejects when admin tries to create a superadmin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            const result = await users.createUser({ ...validInput, role: 'superadmin' });
            expect(result).toEqual({
                error: 'Forbidden: Only Superadmin can create another Superadmin',
            });
        });

        it('allows superadmin to create another superadmin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('superadmin'));
            prismaMock.user.findUnique.mockResolvedValue(null);
            prismaMock.user.create.mockResolvedValue({ id: 99 } as any);

            const result = await users.createUser({ ...validInput, role: 'superadmin' });
            expect(result).toEqual({ success: true });
        });

        it('rejects duplicate email', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.user.findUnique.mockResolvedValue({ id: 1 } as any);

            const result = await users.createUser(validInput);
            expect(result).toEqual({ error: 'Email already exists' });
        });

        it('hashes password and creates user', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.user.findUnique.mockResolvedValue(null);
            prismaMock.user.create.mockResolvedValue({ id: 99 } as any);

            const result = await users.createUser(validInput);

            expect(bcryptHash).toHaveBeenCalledWith(VALID_PASSWORD, 10);
            expect(prismaMock.user.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    email: validInput.email,
                    password: 'hashed',
                    name: 'Newbie',
                }),
            });
            expect(result).toEqual({ success: true });
        });

        it('returns Zod issue message when password too weak', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            const result = await users.createUser({ ...validInput, password: 'weak' });
            expect((result as any).error).toBeTruthy();
            expect(prismaMock.user.create).not.toHaveBeenCalled();
        });
    });

    describe('updateUser', () => {
        it('rejects unauthenticated', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await users.updateUser(1, { name: 'New' });
            expect(result).toEqual({ error: 'Unauthorized - Admin only' });
        });

        it('rejects when target user is not found', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.user.findUnique.mockResolvedValue(null);
            const result = await users.updateUser(1, { name: 'New' });
            expect(result).toEqual({ error: 'User not found' });
        });

        it('rejects when admin tries to edit a different superadmin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            prismaMock.user.findUnique.mockResolvedValue({
                id: 99,
                role: 'superadmin',
                email: 's@x.com',
            } as any);

            const result = await users.updateUser(99, { name: 'XX' });
            expect(result).toEqual({
                error: 'Forbidden: You cannot modify a Superadmin account',
            });
        });

        it('rejects when admin tries to promote someone to superadmin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            prismaMock.user.findUnique.mockResolvedValue({
                id: 5,
                role: 'user',
                email: 'u@x.com',
            } as any);

            const result = await users.updateUser(5, { role: 'superadmin' });
            expect(result).toEqual({
                error: 'Forbidden: Only Superadmin can assign Superadmin role',
            });
        });

        it('hashes new password and bumps tokenVersion', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            prismaMock.user.findUnique.mockResolvedValue({
                id: 5,
                role: 'user',
                email: 'u@x.com',
            } as any);
            prismaMock.user.update.mockResolvedValue({} as any);

            await users.updateUser(5, { password: VALID_PASSWORD });

            expect(bcryptHash).toHaveBeenCalledWith(VALID_PASSWORD, 10);
            expect(prismaMock.user.update).toHaveBeenCalledWith({
                where: { id: 5 },
                data: expect.objectContaining({
                    password: 'hashed',
                    tokenVersion: { increment: 1 },
                }),
            });
        });

        it('does NOT bump tokenVersion when only name changes', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            prismaMock.user.findUnique.mockResolvedValue({
                id: 5,
                role: 'user',
                email: 'u@x.com',
            } as any);
            prismaMock.user.update.mockResolvedValue({} as any);

            await users.updateUser(5, { name: 'New Name' });

            const updateCall = prismaMock.user.update.mock.calls[0][0];
            expect(updateCall.data.tokenVersion).toBeUndefined();
        });
    });

    describe('deleteUser', () => {
        it('rejects unauthenticated', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await users.deleteUser(99);
            expect(result).toEqual({ error: 'Unauthorized - Admin only' });
        });

        it('rejects deleting yourself', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));

            const result = await users.deleteUser(4);
            expect(result).toEqual({ error: 'Cannot delete your own account' });
        });

        it('rejects deleting non-existent user', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            prismaMock.user.findUnique.mockResolvedValue(null);

            const result = await users.deleteUser(99);
            expect(result).toEqual({ error: 'User not found' });
        });

        it('rejects admin deleting a superadmin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            prismaMock.user.findUnique.mockResolvedValue({
                id: 99,
                role: 'superadmin',
            } as any);

            const result = await users.deleteUser(99);
            expect(result).toEqual({
                error: 'Forbidden: You cannot delete a Superadmin account',
            });
        });

        it('allows superadmin to delete a superadmin (other than self)', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('superadmin', { id: 3 }));
            prismaMock.user.findUnique.mockResolvedValue({
                id: 99,
                role: 'superadmin',
                email: 'other@x',
            } as any);
            prismaMock.user.delete.mockResolvedValue({} as any);

            const result = await users.deleteUser(99);
            expect(result).toEqual({ success: true });
        });

        it('deletes a regular user', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            prismaMock.user.findUnique.mockResolvedValue({
                id: 5,
                role: 'user',
                email: 'u@x',
                name: 'U',
            } as any);
            prismaMock.user.delete.mockResolvedValue({} as any);

            const result = await users.deleteUser(5);
            expect(result).toEqual({ success: true });
            expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: 5 } });
        });
    });

    describe('revokeUserSessions', () => {
        it('increments tokenVersion for the target user', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.user.update.mockResolvedValue({} as any);

            const result = await users.revokeUserSessions(5);

            expect(prismaMock.user.update).toHaveBeenCalledWith({
                where: { id: 5 },
                data: { tokenVersion: { increment: 1 } },
            });
            expect((result as any).success).toBe(true);
        });

        it('rejects unauthenticated', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await users.revokeUserSessions(5);
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('returns error on DB failure', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.user.update.mockRejectedValue(new Error('boom'));

            const result = await users.revokeUserSessions(5);
            expect(result).toEqual({ error: 'Failed to revoke sessions' });
            err.mockRestore();
        });
    });

    describe('getUsersForAssignment', () => {
        it('rejects unauthenticated', async () => {
            // This action calls auth() directly, not getCachedAuth.
            const { auth } = (await import('@/auth')) as { auth: Mock };
            auth.mockReset().mockResolvedValue(null);
            const result = await users.getUsersForAssignment();
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('returns active users only', async () => {
            const { auth } = (await import('@/auth')) as { auth: Mock };
            auth.mockReset().mockResolvedValue(sessionFor('user'));
            prismaMock.user.findMany.mockResolvedValue([{ id: 1, name: 'A' }] as any);

            const result = await users.getUsersForAssignment();
            expect((result as any).success).toBe(true);
            expect(prismaMock.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { status: 'active' } }),
            );
        });
    });
});
