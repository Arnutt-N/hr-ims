/**
 * Vitest unit tests for the PRP v6 maintenance Server Actions.
 *
 * Naming: this file is `maintenance-v6.test.ts` to live alongside the
 * legacy `maintenance.test.ts` (which covers the pre-v6 actions
 * getMaintenanceItems / updateMaintenanceStatus). When the legacy actions
 * are removed in a future cleanup commit, both files can be merged.
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/auth-cache', () => ({ getCachedAuth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/maintenance/telegram-service', () => ({
    sendMaintenanceAlert: vi.fn().mockResolvedValue(false),
}));

describe('maintenance v6 Server Actions', () => {
    let m: typeof import('@/lib/actions/maintenance');
    let authMock: Mock;
    let cachedAuthMock: Mock;
    let telegramMock: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        ({ auth: authMock } = (await import('@/auth')) as { auth: Mock });
        ({ getCachedAuth: cachedAuthMock } = (await import('@/lib/auth-cache')) as {
            getCachedAuth: Mock;
        });
        ({ sendMaintenanceAlert: telegramMock } = (await import(
            '@/lib/maintenance/telegram-service'
        )) as { sendMaintenanceAlert: Mock });

        authMock.mockReset();
        cachedAuthMock.mockReset();
        telegramMock.mockReset();
        telegramMock.mockResolvedValue(false);

        m = await import('@/lib/actions/maintenance');
    });

    // -----------------------------------------------------------------
    // createMaintenanceRequest
    // -----------------------------------------------------------------
    describe('createMaintenanceRequest', () => {
        const validInput = {
            itemIds: [10],
            title: 'Broken display',
            description: 'Screen flickers',
            severity: 'medium' as const,
            priority: 'normal' as const,
            category: 'electrical' as const,
        };

        it('rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const r = await m.createMaintenanceRequest(validInput);
            expect(r).toEqual({ error: 'Unauthorized' });
        });

        it('rejects empty itemIds', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            const r = await m.createMaintenanceRequest({ ...validInput, itemIds: [] });
            expect(r).toMatchObject({ error: 'Invalid input' });
        });

        it('rejects >20 itemIds (DoS guard)', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            const r = await m.createMaintenanceRequest({
                ...validInput,
                itemIds: Array.from({ length: 21 }, (_, i) => i + 1),
            });
            expect(r).toMatchObject({ error: 'Invalid input' });
        });

        it('rejects invalid severity', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            const r = await m.createMaintenanceRequest({
                ...validInput,
                severity: 'CATASTROPHIC' as never,
            });
            expect(r).toMatchObject({ error: 'Invalid input' });
        });

        it('happy path: creates request + items + log + syncs inventory status', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.inventoryItem.findMany.mockResolvedValue([
                { id: 10, name: 'Item A' },
            ] as never);
            prismaMock.maintenanceRequest.create.mockResolvedValue({
                id: 99,
                title: 'Broken display',
                description: 'Screen flickers',
                items: [{ item: { id: 10, name: 'Item A' } }],
                reportedBy: { id: 8, name: 'Demo User' },
            } as never);
            prismaMock.inventoryItem.updateMany.mockResolvedValue({ count: 1 } as never);

            const r = await m.createMaintenanceRequest(validInput);

            expect(r).toMatchObject({ success: true });
            expect(prismaMock.maintenanceRequest.create).toHaveBeenCalled();
            expect(prismaMock.inventoryItem.updateMany).toHaveBeenCalledWith({
                where: { id: { in: [10] } },
                data: { status: 'issue_reported' },
            });
        });

        it('fires Telegram alert on critical severity', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.inventoryItem.findMany.mockResolvedValue([
                { id: 10, name: 'Item A' },
            ] as never);
            prismaMock.maintenanceRequest.create.mockResolvedValue({
                id: 99,
                title: 'CRITICAL',
                description: 'down',
                items: [{ item: { id: 10, name: 'Item A' } }],
                reportedBy: { id: 8, name: 'Demo User' },
            } as never);

            await m.createMaintenanceRequest({ ...validInput, severity: 'critical' });

            expect(telegramMock).toHaveBeenCalled();
        });

        it('does NOT fire Telegram on medium severity', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.inventoryItem.findMany.mockResolvedValue([
                { id: 10, name: 'Item A' },
            ] as never);
            prismaMock.maintenanceRequest.create.mockResolvedValue({
                id: 99,
                title: 't',
                description: 'd',
                items: [{ item: { id: 10, name: 'Item A' } }],
                reportedBy: { id: 8, name: 'Demo User' },
            } as never);

            await m.createMaintenanceRequest(validInput);

            expect(telegramMock).not.toHaveBeenCalled();
        });

        it('rejects invalid tag format', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            const r = await m.createMaintenanceRequest({
                ...validInput,
                tags: ['has space'],
            });
            expect(r).toMatchObject({ error: 'Invalid input' });
        });
    });

    // -----------------------------------------------------------------
    // assignMaintenanceRequest
    // -----------------------------------------------------------------
    describe('assignMaintenanceRequest', () => {
        it('rejects non-admin', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('user'));
            const r = await m.assignMaintenanceRequest({ requestId: 1, assigneeUserId: 5 });
            expect(r).toEqual({ error: 'Unauthorized - Admin only' });
        });

        it('rejects assignee without technician/admin role', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('admin'));
            prismaMock.maintenanceRequest.findUnique.mockResolvedValue({
                id: 1,
                status: 'open',
                items: [{ status: 'open' }],
                assignedAt: null,
            } as never);
            prismaMock.user.findUnique.mockResolvedValue({
                id: 5,
                userRoles: [{ role: { slug: 'user' } }],
            } as never);

            const r = await m.assignMaintenanceRequest({ requestId: 1, assigneeUserId: 5 });
            expect(r).toMatchObject({
                error: expect.stringContaining('Assignee must have'),
            });
        });

        it('rejects when request is in terminal state', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('admin'));
            prismaMock.maintenanceRequest.findUnique.mockResolvedValue({
                id: 1,
                status: 'closed',
                items: [],
                assignedAt: null,
            } as never);

            const r = await m.assignMaintenanceRequest({ requestId: 1, assigneeUserId: 5 });
            expect(r).toMatchObject({ error: expect.stringContaining('terminal state') });
        });
    });

    // -----------------------------------------------------------------
    // updateMaintenanceItemStatus
    // -----------------------------------------------------------------
    describe('updateMaintenanceItemStatus', () => {
        const validInput = {
            requestId: 1,
            itemId: 10,
            expectedVersion: 0,
            newStatus: 'in_progress' as const,
        };

        it('rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const r = await m.updateMaintenanceItemStatus(validInput);
            expect(r).toEqual({ error: 'Unauthorized' });
        });

        it('requires resolution when newStatus=resolved', async () => {
            authMock.mockResolvedValue(sessionFor('admin'));
            const r = await m.updateMaintenanceItemStatus({
                ...validInput,
                newStatus: 'resolved',
            });
            expect(r).toMatchObject({ error: expect.stringContaining('Resolution text required') });
        });

        it('throws OptimisticLockError on version mismatch (returns code)', async () => {
            authMock.mockResolvedValue(sessionFor('admin'));
            cachedAuthMock.mockResolvedValue(sessionFor('admin'));
            prismaMock.maintenanceRequestItem.findUnique
                .mockResolvedValueOnce({
                    id: 10,
                    requestId: 1,
                    status: 'open',
                    request: { id: 1, status: 'open', assignedToId: 4 },
                    item: { id: 100 },
                } as never)
                .mockResolvedValueOnce({ version: 99 } as never); // assertItemVersion sees v99, expected v0

            const r = await m.updateMaintenanceItemStatus(validInput);
            expect(r).toMatchObject({ code: 'OPTIMISTIC_LOCK' });
        });
    });

    // -----------------------------------------------------------------
    // approveItemResolution + rejectItemResolution
    // -----------------------------------------------------------------
    describe('approveItemResolution', () => {
        it('rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const r = await m.approveItemResolution({ requestId: 1, itemId: 10, expectedVersion: 0 });
            expect(r).toEqual({ error: 'Unauthorized' });
        });

        it('rejects when item.status !== resolved', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.maintenanceRequestItem.findUnique.mockResolvedValue({
                id: 10,
                requestId: 1,
                status: 'in_progress',
                request: { id: 1, reportedById: 8 },
                item: { id: 100 },
            } as never);

            const r = await m.approveItemResolution({ requestId: 1, itemId: 10, expectedVersion: 0 });
            expect(r).toMatchObject({ error: expect.stringContaining('Cannot approve') });
        });
    });

    describe('rejectItemResolution', () => {
        it('rejects empty reason via Zod', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            const r = await m.rejectItemResolution({
                requestId: 1,
                itemId: 10,
                expectedVersion: 0,
                reason: '',
            });
            expect(r).toMatchObject({ error: 'Invalid input' });
        });
    });

    // -----------------------------------------------------------------
    // cancelMaintenanceRequest
    // -----------------------------------------------------------------
    describe('cancelMaintenanceRequest', () => {
        it('rejects empty reason', async () => {
            authMock.mockResolvedValue(sessionFor('admin'));
            const r = await m.cancelMaintenanceRequest({ requestId: 1, reason: '' });
            expect(r).toMatchObject({ error: 'Invalid input' });
        });

        it('rejects reporter past 1-hour window when not admin', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            cachedAuthMock.mockResolvedValue(sessionFor('user')); // requireRole admin → null
            const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
            prismaMock.maintenanceRequest.findUnique.mockResolvedValue({
                id: 1,
                reportedById: 8,
                status: 'open',
                createdAt: oldDate,
                items: [],
            } as never);

            const r = await m.cancelMaintenanceRequest({ requestId: 1, reason: 'no longer needed' });
            expect(r).toMatchObject({ error: expect.stringContaining('cancel window expired') });
        });

        it('rejects when status is closed/cancelled', async () => {
            authMock.mockResolvedValue(sessionFor('admin'));
            cachedAuthMock.mockResolvedValue(sessionFor('admin'));
            prismaMock.maintenanceRequest.findUnique.mockResolvedValue({
                id: 1,
                reportedById: 8,
                status: 'closed',
                createdAt: new Date(),
                items: [],
            } as never);

            const r = await m.cancelMaintenanceRequest({ requestId: 1, reason: 'oops' });
            expect(r).toMatchObject({ error: expect.stringContaining('Cannot cancel') });
        });
    });

    // -----------------------------------------------------------------
    // reopenMaintenanceRequest
    // -----------------------------------------------------------------
    describe('reopenMaintenanceRequest', () => {
        it('rejects non-admin', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('user'));
            const r = await m.reopenMaintenanceRequest({ requestId: 1, reason: 'reopen' });
            expect(r).toEqual({ error: 'Unauthorized - Admin only' });
        });

        it('rejects when request is not in terminal state', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('admin'));
            prismaMock.maintenanceRequest.findUnique.mockResolvedValue({
                id: 1,
                status: 'open',
                items: [],
            } as never);
            const r = await m.reopenMaintenanceRequest({ requestId: 1, reason: 'oops' });
            expect(r).toMatchObject({ error: expect.stringContaining('Cannot reopen') });
        });
    });

    // -----------------------------------------------------------------
    // delete + restore
    // -----------------------------------------------------------------
    describe('deleteMaintenanceRequest', () => {
        it('rejects non-admin', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('user'));
            const r = await m.deleteMaintenanceRequest({ requestId: 1, reason: 'spam' });
            expect(r).toEqual({ error: 'Unauthorized - Admin only' });
        });
    });

    describe('restoreMaintenanceRequest', () => {
        it('rejects non-admin', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('user'));
            const r = await m.restoreMaintenanceRequest(1);
            expect(r).toEqual({ error: 'Unauthorized - Admin only' });
        });

        it('rejects invalid id', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('admin'));
            const r = await m.restoreMaintenanceRequest(-1);
            expect(r).toEqual({ error: 'Invalid requestId' });
        });
    });

    // -----------------------------------------------------------------
    // Read-side queries
    // -----------------------------------------------------------------
    describe('getMyMaintenanceRequests', () => {
        it('rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const r = await m.getMyMaintenanceRequests();
            expect(r).toEqual({ error: 'Unauthorized' });
        });

        it('returns reporter-scoped requests', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.maintenanceRequest.findMany.mockResolvedValue([
                { id: 1, items: [], assignedTo: null, location: null },
            ] as never);
            const r = await m.getMyMaintenanceRequests();
            expect(r).toMatchObject({ success: true });
            expect(prismaMock.maintenanceRequest.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ reportedById: 8 }),
                }),
            );
        });
    });

    describe('getMaintenanceRequests', () => {
        it('blocks view=deleted for non-admin', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('technician'));
            const r = await m.getMaintenanceRequests({ view: 'deleted' });
            expect(r).toMatchObject({ error: expect.stringContaining('admin only') });
        });
    });

    describe('getMaintenanceTags', () => {
        it('returns deduplicated sorted tag list', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.maintenanceRequest.findMany.mockResolvedValue([
                { tags: JSON.stringify(['warranty', 'vip']) },
                { tags: JSON.stringify(['warranty', 'urgent']) },
            ] as never);
            const r = await m.getMaintenanceTags();
            expect(r).toMatchObject({ success: true, tags: ['urgent', 'vip', 'warranty'] });
        });

        it('handles malformed JSON gracefully', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.maintenanceRequest.findMany.mockResolvedValue([
                { tags: 'not json' },
            ] as never);
            const r = await m.getMaintenanceTags();
            expect(r).toMatchObject({ success: true, tags: [] });
        });
    });

    // -----------------------------------------------------------------
    // addMaintenanceNote
    // -----------------------------------------------------------------
    describe('addMaintenanceNote', () => {
        it('rejects when caller is neither assignee nor admin', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            cachedAuthMock.mockResolvedValue(sessionFor('user'));
            prismaMock.maintenanceRequest.findUnique.mockResolvedValue({
                assignedToId: 99, // not the actor
            } as never);
            const r = await m.addMaintenanceNote({ requestId: 1, notes: 'note' });
            expect(r).toMatchObject({ error: expect.stringContaining('Forbidden') });
        });
    });

    // -----------------------------------------------------------------
    // Stats
    // -----------------------------------------------------------------
    describe('getMaintenanceStats', () => {
        it('rejects non-privileged user', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('user'));
            const r = await m.getMaintenanceStats();
            expect(r).toEqual({ error: 'Unauthorized' });
        });

        it('returns aggregated stats for empty data', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('admin'));
            prismaMock.maintenanceRequest.findMany.mockResolvedValue([] as never);
            const r = await m.getMaintenanceStats();
            expect(r).toMatchObject({
                success: true,
                stats: {
                    totalRequests: 0,
                    averageResolveTimeHours: null,
                    averageCloseTimeHours: null,
                },
            });
        });
    });
});
