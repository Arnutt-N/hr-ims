import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/lib/auth-cache', () => ({ getCachedAuth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/actions/notifications', () => ({
    checkLowStockInternal: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/mail', () => ({
    sendOverdueEmail: vi.fn().mockResolvedValue(undefined),
    sendStatusUpdateEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('requests Server Actions', () => {
    let requests: typeof import('@/lib/actions/requests');
    let getCachedAuth: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        ({ getCachedAuth } = (await import('@/lib/auth-cache')) as { getCachedAuth: Mock });
        getCachedAuth.mockReset();
        requests = await import('@/lib/actions/requests');
    });

    describe('getRequests', () => {
        it('rejects unauthenticated', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await requests.getRequests();
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('admin sees ALL requests when no status filter', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.request.findMany.mockResolvedValue([] as any);

            await requests.getRequests();

            const call = prismaMock.request.findMany.mock.calls[0][0];
            // No userId scoping for admin
            expect(call.where.userId).toBeUndefined();
        });

        it('regular user sees only their own', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('user', { id: 8 }));
            prismaMock.request.findMany.mockResolvedValue([] as any);

            await requests.getRequests();

            const call = prismaMock.request.findMany.mock.calls[0][0];
            expect(call.where.userId).toBe(8);
        });

        it('filters by status when provided', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.request.findMany.mockResolvedValue([] as any);

            await requests.getRequests('pending');

            const call = prismaMock.request.findMany.mock.calls[0][0];
            expect(call.where.status).toBe('pending');
        });
    });

    describe('updateRequestStatus — approve borrow/withdraw', () => {
        const baseRequest = {
            id: 11,
            userId: 8,
            type: 'borrow',
            warehouseId: 7,
            requestItems: [
                {
                    itemId: 100,
                    quantity: 2,
                    item: { id: 100, name: 'Stapler' },
                },
            ],
        };

        it('rejects unauthenticated', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await requests.updateRequestStatus(11, 'approved');
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('rejects non-approver role', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('user'));
            const result = await requests.updateRequestStatus(11, 'approved');
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('returns "Request not found" when request id missing', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.request.findUnique.mockResolvedValue(null);

            const result = await requests.updateRequestStatus(11, 'approved');
            expect(result).toEqual({ error: 'Request not found' });
        });

        it('decrements stock + reservation atomically and writes history', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            prismaMock.request.findUnique.mockResolvedValue(baseRequest as any);
            prismaMock.stockLevel.findFirst.mockResolvedValue({
                id: 555,
                quantity: 5,
                reserved: 2,
                minStock: 0,
            } as any);
            prismaMock.stockLevel.update.mockResolvedValue({} as any);
            prismaMock.inventoryItem.update.mockResolvedValue({} as any);
            prismaMock.history.create.mockResolvedValue({} as any);
            prismaMock.request.update.mockResolvedValue({} as any);
            prismaMock.user.findUnique.mockResolvedValue({
                email: 'u@x.com',
                name: 'U',
            } as any);

            const result = await requests.updateRequestStatus(11, 'approved');

            expect(result).toEqual({ success: true });
            expect(prismaMock.stockLevel.update).toHaveBeenCalledWith({
                where: { id: 555 },
                data: {
                    quantity: { decrement: 2 },
                    reserved: { decrement: 2 },
                },
            });
            expect(prismaMock.inventoryItem.update).toHaveBeenCalledWith({
                where: { id: 100 },
                data: { stock: { decrement: 2 } },
            });
            expect(prismaMock.history.create).toHaveBeenCalledWith({
                data: expect.objectContaining({ action: 'borrow', status: 'approved' }),
            });
            expect(prismaMock.request.update).toHaveBeenCalledWith({
                where: { id: 11 },
                data: { status: 'approved', dueDate: undefined },
            });
        });

        it('triggers low-stock notification when newQty <= minStock', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            prismaMock.request.findUnique.mockResolvedValue(baseRequest as any);
            prismaMock.stockLevel.findFirst.mockResolvedValue({
                id: 555,
                quantity: 3, // 3-2 = 1 → ≤ minStock(1)
                reserved: 2,
                minStock: 1,
            } as any);
            prismaMock.stockLevel.update.mockResolvedValue({} as any);
            prismaMock.inventoryItem.update.mockResolvedValue({} as any);
            prismaMock.history.create.mockResolvedValue({} as any);
            prismaMock.notification.create.mockResolvedValue({} as any);
            prismaMock.request.update.mockResolvedValue({} as any);
            prismaMock.user.findUnique.mockResolvedValue({ email: 'u@x' } as any);

            await requests.updateRequestStatus(11, 'approved');

            expect(prismaMock.notification.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    userId: 4,
                    text: expect.stringContaining('Low Stock Alert'),
                    read: false,
                }),
            });
        });

        it('rolls back when stock-level row is missing', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            prismaMock.request.findUnique.mockResolvedValue(baseRequest as any);
            prismaMock.stockLevel.findFirst.mockResolvedValue(null);
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});

            const result = await requests.updateRequestStatus(11, 'approved');

            expect(result).toEqual({ error: 'Failed to update request' });
            expect(prismaMock.request.update).not.toHaveBeenCalled();
            err.mockRestore();
        });

        it('rolls back when reserved < requested quantity', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            prismaMock.request.findUnique.mockResolvedValue(baseRequest as any);
            prismaMock.stockLevel.findFirst.mockResolvedValue({
                id: 555,
                quantity: 10,
                reserved: 0, // mismatch
                minStock: 0,
            } as any);
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});

            const result = await requests.updateRequestStatus(11, 'approved');

            expect(result).toEqual({ error: 'Failed to update request' });
            expect(prismaMock.request.update).not.toHaveBeenCalled();
            err.mockRestore();
        });

        it('rolls back when actual stock < requested quantity', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            prismaMock.request.findUnique.mockResolvedValue(baseRequest as any);
            prismaMock.stockLevel.findFirst.mockResolvedValue({
                id: 555,
                quantity: 1, // not enough
                reserved: 2,
                minStock: 0,
            } as any);
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});

            const result = await requests.updateRequestStatus(11, 'approved');

            expect(result).toEqual({ error: 'Failed to update request' });
            err.mockRestore();
        });

        it('rolls back when warehouseId is missing on a borrow request', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            prismaMock.request.findUnique.mockResolvedValue({
                ...baseRequest,
                warehouseId: null,
            } as any);
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});

            const result = await requests.updateRequestStatus(11, 'approved');

            expect(result).toEqual({ error: 'Failed to update request' });
            err.mockRestore();
        });
    });

    describe('updateRequestStatus — return type', () => {
        it('increments stock and writes history', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.request.findUnique.mockResolvedValue({
                id: 11,
                userId: 8,
                type: 'return',
                warehouseId: 7,
                requestItems: [
                    {
                        itemId: 100,
                        quantity: 1,
                        item: { id: 100, name: 'Stapler' },
                    },
                ],
            } as any);
            prismaMock.stockLevel.findFirst.mockResolvedValue({ id: 555 } as any);
            prismaMock.stockLevel.update.mockResolvedValue({} as any);
            prismaMock.inventoryItem.update.mockResolvedValue({} as any);
            prismaMock.history.create.mockResolvedValue({} as any);
            prismaMock.request.update.mockResolvedValue({} as any);
            prismaMock.user.findUnique.mockResolvedValue({ email: 'u@x' } as any);

            const result = await requests.updateRequestStatus(11, 'approved');

            expect(result).toEqual({ success: true });
            expect(prismaMock.stockLevel.update).toHaveBeenCalledWith({
                where: { id: 555 },
                data: { quantity: { increment: 1 } },
            });
            expect(prismaMock.inventoryItem.update).toHaveBeenCalledWith({
                where: { id: 100 },
                data: { stock: { increment: 1 } },
            });
        });
    });

    describe('updateRequestStatus — reject/cancel releases reservation', () => {
        const pendingBorrow = {
            id: 11,
            userId: 8,
            type: 'borrow',
            warehouseId: 7,
            requestItems: [
                {
                    itemId: 100,
                    quantity: 2,
                    item: { id: 100, name: 'Stapler' },
                },
            ],
        };

        it('decrements reserved on reject', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.request.findUnique.mockResolvedValue(pendingBorrow as any);
            prismaMock.stockLevel.findFirst.mockResolvedValue({
                id: 555,
                reserved: 2,
            } as any);
            prismaMock.stockLevel.update.mockResolvedValue({} as any);
            prismaMock.request.update.mockResolvedValue({} as any);
            prismaMock.user.findUnique.mockResolvedValue({ email: 'u@x' } as any);

            const result = await requests.updateRequestStatus(11, 'rejected');

            expect(result).toEqual({ success: true });
            expect(prismaMock.stockLevel.update).toHaveBeenCalledWith({
                where: { id: 555 },
                data: { reserved: { decrement: 2 } },
            });
            // Stock quantity must NOT be decremented on reject
            const updateCalls = prismaMock.stockLevel.update.mock.calls;
            for (const c of updateCalls) {
                expect(c[0].data.quantity).toBeUndefined();
            }
        });

        it('does NOT decrement reserved when reservation is short', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            prismaMock.request.findUnique.mockResolvedValue(pendingBorrow as any);
            prismaMock.stockLevel.findFirst.mockResolvedValue({
                id: 555,
                reserved: 1, // less than requested 2
            } as any);
            prismaMock.request.update.mockResolvedValue({} as any);
            prismaMock.user.findUnique.mockResolvedValue({ email: 'u@x' } as any);

            await requests.updateRequestStatus(11, 'cancelled');

            expect(prismaMock.stockLevel.update).not.toHaveBeenCalled();
        });
    });
});
