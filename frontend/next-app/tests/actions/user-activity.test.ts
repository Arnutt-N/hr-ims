/**
 * Vitest unit tests for user-activity Server Action (PRP v6 Phase 6 — Q21).
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/auth-guards', () => ({
    requireRole: vi.fn(),
    ADMIN_ROLES: ['admin', 'superadmin'] as const,
}));

describe('getUserActivity Server Action', () => {
    let actions: typeof import('@/lib/actions/user-activity');
    let authMock: Mock;
    let requireRoleMock: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        ({ auth: authMock } = (await import('@/auth')) as { auth: Mock });
        ({ requireRole: requireRoleMock } = (await import('@/lib/auth-guards')) as {
            requireRole: Mock;
        });
        authMock.mockReset();
        requireRoleMock.mockReset();
        actions = await import('@/lib/actions/user-activity');
    });

    it('rejects unauthenticated', async () => {
        authMock.mockResolvedValue(null);
        const r = await actions.getUserActivity(8);
        expect(r).toEqual({ error: 'Unauthorized' });
    });

    it('rejects invalid userId', async () => {
        authMock.mockResolvedValue(sessionFor('user'));
        const r = await actions.getUserActivity(-1);
        expect(r).toEqual({ error: 'Invalid userId' });
    });

    it('allows own profile without admin role', async () => {
        // sessionFor('user') has id '8'; query own activity
        authMock.mockResolvedValue(sessionFor('user'));
        prismaMock.maintenanceLog.findMany.mockResolvedValue([]);
        const r = await actions.getUserActivity(8);
        expect(r).toMatchObject({ success: true, logs: [] });
        // requireRole NOT consulted on own-profile path
        expect(requireRoleMock).not.toHaveBeenCalled();
    });

    it('rejects non-admin viewing other user activity', async () => {
        authMock.mockResolvedValue(sessionFor('user')); // id 8
        requireRoleMock.mockResolvedValue(false);
        const r = await actions.getUserActivity(99);
        expect(r).toMatchObject({ error: expect.stringContaining('Forbidden') });
    });

    it('allows admin viewing other user activity', async () => {
        authMock.mockResolvedValue(sessionFor('admin'));
        requireRoleMock.mockResolvedValue(true);
        prismaMock.maintenanceLog.findMany.mockResolvedValue([]);
        const r = await actions.getUserActivity(8);
        expect(r).toMatchObject({ success: true });
    });

    it('rejects invalid filter shape', async () => {
        authMock.mockResolvedValue(sessionFor('user'));
        const r = await actions.getUserActivity(8, { limit: 9999 }); // exceeds max 200
        expect(r).toMatchObject({ error: 'Invalid filters' });
    });

    it('passes actionType + date range to where clause', async () => {
        authMock.mockResolvedValue(sessionFor('user'));
        prismaMock.maintenanceLog.findMany.mockResolvedValue([]);
        await actions.getUserActivity(8, {
            actionType: 'item_status_changed',
            dateFrom: '2026-01-01',
            dateTo: '2026-12-31',
        });
        const call = prismaMock.maintenanceLog.findMany.mock.calls[0][0];
        expect(call.where).toMatchObject({
            userId: 8,
            action: 'item_status_changed',
        });
        expect(call.where.createdAt).toMatchObject({
            gte: expect.any(Date),
            lte: expect.any(Date),
        });
    });

    it('enriches logs with item names (batch lookup, no N+1)', async () => {
        authMock.mockResolvedValue(sessionFor('user'));
        prismaMock.maintenanceLog.findMany.mockResolvedValue([
            { id: 1, itemId: 100, action: 'X', request: { id: 1, title: 'R1', status: 'open' } },
            { id: 2, itemId: 100, action: 'Y', request: { id: 1, title: 'R1', status: 'open' } },
            { id: 3, itemId: 200, action: 'Z', request: { id: 2, title: 'R2', status: 'open' } },
            { id: 4, itemId: null, action: 'W', request: { id: 3, title: 'R3', status: 'open' } },
        ] as never);
        prismaMock.inventoryItem.findMany.mockResolvedValue([
            { id: 100, name: 'Printer' },
            { id: 200, name: 'Monitor' },
        ] as never);

        const r = await actions.getUserActivity(8);
        expect(r).toMatchObject({ success: true });

        // Single batch call, deduped itemIds
        expect(prismaMock.inventoryItem.findMany).toHaveBeenCalledTimes(1);
        const itemCall = prismaMock.inventoryItem.findMany.mock.calls[0][0];
        expect(itemCall.where.id.in).toHaveLength(2); // deduped 100 + 200
        expect(itemCall.where.id.in).toEqual(expect.arrayContaining([100, 200]));

        const logs = (r as { logs: { id: number; item: { name: string } | null }[] }).logs;
        expect(logs[0].item).toEqual({ id: 100, name: 'Printer' });
        expect(logs[1].item).toEqual({ id: 100, name: 'Printer' });
        expect(logs[2].item).toEqual({ id: 200, name: 'Monitor' });
        expect(logs[3].item).toBeNull();
    });

    it('skips inventoryItem query when no logs reference items', async () => {
        authMock.mockResolvedValue(sessionFor('user'));
        prismaMock.maintenanceLog.findMany.mockResolvedValue([
            { id: 1, itemId: null, action: 'note_added', request: { id: 1, title: 'R1', status: 'open' } },
        ] as never);

        await actions.getUserActivity(8);
        expect(prismaMock.inventoryItem.findMany).not.toHaveBeenCalled();
    });

    it('honors pagination (limit + offset)', async () => {
        authMock.mockResolvedValue(sessionFor('user'));
        prismaMock.maintenanceLog.findMany.mockResolvedValue([]);
        await actions.getUserActivity(8, { limit: 25, offset: 50 });
        const call = prismaMock.maintenanceLog.findMany.mock.calls[0][0];
        expect(call.take).toBe(25);
        expect(call.skip).toBe(50);
    });
});
