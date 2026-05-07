import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('assets Server Actions', () => {
    let assets: typeof import('@/lib/actions/assets');
    let authMock: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        ({ auth: authMock } = (await import('@/auth')) as { auth: Mock });
        authMock.mockReset();
        assets = await import('@/lib/actions/assets');
    });

    describe('getMyAssets', () => {
        it('rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const result = await assets.getMyAssets();
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('returns "User not found" if email has no user row', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.user.findUnique.mockResolvedValue(null);
            const result = await assets.getMyAssets();
            expect(result).toEqual({ error: 'User not found' });
        });

        it('enriches each held item with borrow + return + lastCheck info', async () => {
            authMock.mockResolvedValue(sessionFor('user', { id: 8 }));
            prismaMock.user.findUnique.mockResolvedValue({
                id: 8,
                email: 'u@x',
                heldItems: [{ id: 10, name: 'Stapler', updatedAt: new Date() }],
            } as any);
            prismaMock.request.findFirst
                .mockResolvedValueOnce({
                    id: 1,
                    date: new Date('2026-04-01'),
                    dueDate: new Date('2026-05-01'),
                    isOverdue: false,
                } as any) // active borrow
                .mockResolvedValueOnce(null); // active return
            prismaMock.history.findFirst.mockResolvedValue({
                date: new Date('2026-04-15'),
            } as any);

            const result = (await assets.getMyAssets()) as any;

            expect(result.success).toBe(true);
            expect(result.assets[0].dueDate).toEqual(new Date('2026-05-01'));
            expect(result.assets[0].isReturning).toBe(false);
        });
    });

    describe('checkInAsset', () => {
        it('rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const result = await assets.checkInAsset(10);
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('returns "Item not found" when item missing', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.inventoryItem.findUnique.mockResolvedValue(null);
            const result = await assets.checkInAsset(10);
            expect(result).toEqual({ error: 'Item not found' });
        });

        it('writes a "check" history entry', async () => {
            authMock.mockResolvedValue(sessionFor('user', { id: 8 }));
            prismaMock.inventoryItem.findUnique.mockResolvedValue({ id: 10, name: 'Stapler' } as any);
            prismaMock.history.create.mockResolvedValue({} as any);

            const result = await assets.checkInAsset(10);
            expect(result).toEqual({ success: true });
            expect(prismaMock.history.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    userId: 8,
                    action: 'check',
                    item: 'Stapler',
                    status: 'verified',
                }),
            });
        });
    });

    describe('requestReturn', () => {
        it('rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const result = await assets.requestReturn(10);
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('creates a pending return request', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.user.findUnique.mockResolvedValue({ id: 8 } as any);
            prismaMock.request.create.mockResolvedValue({} as any);

            const result = await assets.requestReturn(10);
            expect(result).toEqual({ success: true });
            const data = prismaMock.request.create.mock.calls[0][0].data;
            expect(data.type).toBe('return');
            expect(data.status).toBe('pending');
            expect(data.requestItems.create.itemId).toBe(10);
        });
    });

    describe('reportIssue', () => {
        it('rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const result = await assets.reportIssue(10, 'broken');
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('returns "Item not found" when item missing', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.inventoryItem.findUnique.mockResolvedValue(null);
            const result = await assets.reportIssue(10, 'broken');
            expect(result).toEqual({ error: 'Item not found' });
        });

        it('logs issue + flips item status to issue_reported', async () => {
            authMock.mockResolvedValue(sessionFor('user', { id: 8 }));
            prismaMock.inventoryItem.findUnique.mockResolvedValue({ id: 10, name: 'Stapler' } as any);
            prismaMock.history.create.mockResolvedValue({} as any);
            prismaMock.inventoryItem.update.mockResolvedValue({} as any);

            const result = await assets.reportIssue(10, 'broken');
            expect(result).toEqual({ success: true });
            expect(prismaMock.inventoryItem.update).toHaveBeenCalledWith({
                where: { id: 10 },
                data: { status: 'issue_reported' },
            });
            expect(prismaMock.history.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    action: 'report',
                    item: 'Stapler (broken)',
                    status: 'issue_reported',
                }),
            });
        });
    });
});
