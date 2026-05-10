/**
 * Vitest unit tests for maintenance-watchers Server Actions
 * (PRP v6 Phase 6 — Q20).
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('maintenance-watchers Server Actions', () => {
    let actions: typeof import('@/lib/actions/maintenance-watchers');
    let authMock: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        ({ auth: authMock } = (await import('@/auth')) as { auth: Mock });
        authMock.mockReset();
        actions = await import('@/lib/actions/maintenance-watchers');
    });

    describe('watchRequest', () => {
        it('rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const r = await actions.watchRequest({ requestId: 1 });
            expect(r).toEqual({ error: 'Unauthorized' });
        });

        it('rejects invalid input', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            const r = await actions.watchRequest({ requestId: 'not a number' });
            expect(r).toEqual({ error: 'Invalid input' });
        });

        it('rejects when request not found', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.maintenanceRequest.findUnique.mockResolvedValue(null);
            const r = await actions.watchRequest({ requestId: 99 });
            expect(r).toEqual({ error: 'Request not found' });
        });

        it('upserts (idempotent — already-watching returns success)', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.maintenanceRequest.findUnique.mockResolvedValue({ id: 1 } as never);
            (prismaMock as any).maintenanceRequestWatcher.upsert.mockResolvedValue({});
            const r = await actions.watchRequest({ requestId: 1 });
            expect(r).toMatchObject({ success: true });
            expect((prismaMock as any).maintenanceRequestWatcher.upsert).toHaveBeenCalledWith({
                where: { userId_requestId: { userId: 8, requestId: 1 } },
                update: {},
                create: { userId: 8, requestId: 1 },
            });
        });
    });

    describe('unwatchRequest', () => {
        it('rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const r = await actions.unwatchRequest({ requestId: 1 });
            expect(r).toEqual({ error: 'Unauthorized' });
        });

        it('idempotent — succeeds even if not currently watching', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            (prismaMock as any).maintenanceRequestWatcher.deleteMany.mockResolvedValue({
                count: 0,
            });
            const r = await actions.unwatchRequest({ requestId: 1 });
            expect(r).toMatchObject({ success: true });
        });
    });

    describe('getMyWatchedRequests', () => {
        it('rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const r = await actions.getMyWatchedRequests();
            expect(r).toEqual({ error: 'Unauthorized' });
        });

        it('returns active requests + filters out null requests (soft-deleted)', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            (prismaMock as any).maintenanceRequestWatcher.findMany.mockResolvedValue([
                {
                    id: 1,
                    request: { id: 10, title: 'Active', items: [] },
                },
                {
                    id: 2,
                    request: null, // soft-deleted (Prisma middleware hid it)
                },
            ]);
            const r = await actions.getMyWatchedRequests();
            expect(r).toMatchObject({ success: true });
            const requests = (r as { requests: { id: number }[] }).requests;
            expect(requests).toHaveLength(1);
            expect(requests[0].id).toBe(10);
        });
    });

    describe('isWatching', () => {
        it('returns false when unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const r = await actions.isWatching(1);
            expect(r).toBe(false);
        });

        it('returns false for invalid requestId', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            const r = await actions.isWatching(-1);
            expect(r).toBe(false);
        });

        it('returns true when watcher row exists', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            (prismaMock as any).maintenanceRequestWatcher.findUnique.mockResolvedValue({
                id: 1,
            });
            const r = await actions.isWatching(1);
            expect(r).toBe(true);
        });

        it('returns false when no watcher row', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            (prismaMock as any).maintenanceRequestWatcher.findUnique.mockResolvedValue(null);
            const r = await actions.isWatching(1);
            expect(r).toBe(false);
        });
    });
});
