import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('sessions Server Actions', () => {
    let sessions: typeof import('@/lib/actions/sessions');
    let authMock: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        ({ auth: authMock } = (await import('@/auth')) as { auth: Mock });
        authMock.mockReset();
        sessions = await import('@/lib/actions/sessions');
    });

    describe('getActiveSessions', () => {
        it('returns a synthetic current-session entry for an authenticated user', async () => {
            authMock.mockResolvedValue(sessionFor('admin', { id: 4 }));

            const result = await sessions.getActiveSessions();

            expect((result as any).success).toBe(true);
            expect((result as any).sessions).toHaveLength(1);
            expect((result as any).sessions[0].userId).toBe(4);
        });

        it('rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const result = await sessions.getActiveSessions();
            expect(result).toEqual({ error: 'Unauthorized' });
        });
    });

    describe('revokeSession', () => {
        it('rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const result = await sessions.revokeSession('any-id');
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('increments tokenVersion of the current user (JWT-based revocation)', async () => {
            authMock.mockResolvedValue(sessionFor('admin', { id: 4 }));
            prismaMock.user.update.mockResolvedValue({} as any);

            const result = await sessions.revokeSession('current');

            expect((result as any).success).toBe(true);
            expect(prismaMock.user.update).toHaveBeenCalledWith({
                where: { id: 4 },
                data: { tokenVersion: { increment: 1 } },
            });
        });

        it('returns error on DB failure', async () => {
            authMock.mockResolvedValue(sessionFor('admin'));
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.user.update.mockRejectedValue(new Error('boom'));

            const result = await sessions.revokeSession('current');
            expect(result).toEqual({ error: 'Failed to revoke sessions' });
            err.mockRestore();
        });
    });

    describe('revokeAllOtherSessions', () => {
        it('also bumps tokenVersion (same primitive as revokeSession in JWT mode)', async () => {
            authMock.mockResolvedValue(sessionFor('admin', { id: 4 }));
            prismaMock.user.update.mockResolvedValue({} as any);

            const result = await sessions.revokeAllOtherSessions();
            expect((result as any).success).toBe(true);
            expect(prismaMock.user.update).toHaveBeenCalledWith({
                where: { id: 4 },
                data: { tokenVersion: { increment: 1 } },
            });
        });
    });
});
