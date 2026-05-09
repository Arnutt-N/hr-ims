import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/auth-cache', () => ({ getCachedAuth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('notifications Server Actions', () => {
    let notifications: typeof import('@/lib/actions/notifications');
    let authMock: Mock;
    let getCachedAuth: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        ({ auth: authMock } = (await import('@/auth')) as { auth: Mock });
        ({ getCachedAuth } = (await import('@/lib/auth-cache')) as { getCachedAuth: Mock });
        authMock.mockReset();
        getCachedAuth.mockReset();
        // $queryRaw is used by runLowStockCheck — wire a default.
        (prismaMock as any).$queryRaw = vi.fn();
        notifications = await import('@/lib/actions/notifications');
    });

    describe('checkLowStock (public)', () => {
        it('rejects non-approver', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('user'));
            const result = await notifications.checkLowStock();
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('runs low-stock check for approver', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('approver'));
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            (prismaMock as any).$queryRaw.mockResolvedValue([]);

            const result = await notifications.checkLowStock();
            expect(result).toEqual({ success: true, count: 0 });
            logSpy.mockRestore();
        });
    });

    describe('checkLowStockInternal (system)', () => {
        it('returns count=0 when nothing is low', async () => {
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            (prismaMock as any).$queryRaw.mockResolvedValue([]);

            const result = await notifications.checkLowStockInternal();
            expect(result).toEqual({ success: true, count: 0 });
            logSpy.mockRestore();
        });

        it('creates notifications for each warehouse manager when stock is low', async () => {
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            (prismaMock as any).$queryRaw.mockResolvedValue([{ id: 1 }]);
            prismaMock.stockLevel.findMany.mockResolvedValue([
                {
                    id: 1,
                    quantity: 2,
                    minStock: 5,
                    item: { name: 'Pen' },
                    warehouse: {
                        name: 'Central',
                        managers: [{ id: 4 }, { id: 5 }],
                    },
                },
            ] as any);
            prismaMock.notification.findFirst.mockResolvedValue(null); // no dup
            prismaMock.notification.create.mockResolvedValue({} as any);

            const result = await notifications.checkLowStockInternal();

            expect((result as any).count).toBe(2);
            expect(prismaMock.notification.create).toHaveBeenCalledTimes(2);
            logSpy.mockRestore();
        });

        it('skips duplicate unread notifications', async () => {
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            (prismaMock as any).$queryRaw.mockResolvedValue([{ id: 1 }]);
            prismaMock.stockLevel.findMany.mockResolvedValue([
                {
                    id: 1,
                    quantity: 2,
                    minStock: 5,
                    item: { name: 'Pen' },
                    warehouse: { name: 'Central', managers: [{ id: 4 }] },
                },
            ] as any);
            prismaMock.notification.findFirst.mockResolvedValue({ id: 99 } as any);

            const result = await notifications.checkLowStockInternal();

            expect((result as any).count).toBe(0);
            expect(prismaMock.notification.create).not.toHaveBeenCalled();
            logSpy.mockRestore();
        });

        it('returns generic error on DB failure', async () => {
            const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            (prismaMock as any).$queryRaw.mockRejectedValue(new Error('boom'));
            const result = await notifications.checkLowStockInternal();
            expect(result).toEqual({ error: 'Failed to generate notifications' });
            errSpy.mockRestore();
        });
    });

    describe('getNotifications', () => {
        it('returns empty list when unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const result = await notifications.getNotifications();
            expect(result).toEqual({ notifications: [] });
        });

        it('returns unread notifications + count for current user', async () => {
            authMock.mockResolvedValue(sessionFor('user', { id: 8 }));
            prismaMock.notification.findMany.mockResolvedValue([{ id: 1 }] as any);
            prismaMock.notification.count.mockResolvedValue(3 as any);

            const result = (await notifications.getNotifications(5)) as any;
            expect(result.notifications).toHaveLength(1);
            expect(result.unreadCount).toBe(3);
            expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { userId: 8, read: false }, take: 5 }),
            );
        });

        it('falls back to empty when DB fails', async () => {
            authMock.mockResolvedValue(sessionFor('user', { id: 8 }));
            const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.notification.findMany.mockRejectedValue(new Error('boom'));

            const result = await notifications.getNotifications();
            expect(result).toEqual({ notifications: [], unreadCount: 0 });
            errSpy.mockRestore();
        });
    });

    describe('markAsRead / markAllAsRead', () => {
        it('markAsRead rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const result = await notifications.markAsRead(1);
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('markAsRead updates the row scoped to current user', async () => {
            authMock.mockResolvedValue(sessionFor('user', { id: 8 }));
            prismaMock.notification.update.mockResolvedValue({} as any);

            const result = await notifications.markAsRead(99);
            expect(result).toEqual({ success: true });
            expect(prismaMock.notification.update).toHaveBeenCalledWith({
                where: { id: 99, userId: 8 },
                data: { read: true },
            });
        });

        it('markAllAsRead updates all unread for current user', async () => {
            authMock.mockResolvedValue(sessionFor('user', { id: 8 }));
            prismaMock.notification.updateMany.mockResolvedValue({ count: 5 } as any);

            const result = await notifications.markAllAsRead();
            expect(result).toEqual({ success: true });
            expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
                where: { userId: 8, read: false },
                data: { read: true },
            });
        });

        it('markAllAsRead rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const result = await notifications.markAllAsRead();
            expect(result).toEqual({ error: 'Unauthorized' });
        });
    });
});
