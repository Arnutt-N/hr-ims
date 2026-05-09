import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/auth', () => ({ auth: vi.fn() }));

describe('scanner Server Actions', () => {
    let scanner: typeof import('@/lib/actions/scanner');
    let authMock: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        ({ auth: authMock } = (await import('@/auth')) as { auth: Mock });
        authMock.mockReset();
        scanner = await import('@/lib/actions/scanner');
    });

    describe('getItemBySN', () => {
        it('rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const result = await scanner.getItemBySN('SN-123');
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('returns notFound when serial unknown', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.inventoryItem.findUnique.mockResolvedValue(null);

            const result = await scanner.getItemBySN('SN-X');
            expect(result).toEqual({ error: 'Item not found', notFound: true });
            expect(prismaMock.history.create).not.toHaveBeenCalled();
        });

        it('returns item + writes a scan history entry', async () => {
            authMock.mockResolvedValue(sessionFor('user', { id: 8 }));
            prismaMock.inventoryItem.findUnique.mockResolvedValue({
                id: 1,
                name: 'Stapler',
                currentHolder: null,
            } as any);
            prismaMock.history.create.mockResolvedValue({} as any);

            const result = await scanner.getItemBySN('SN-1');

            expect((result as any).success).toBe(true);
            expect(prismaMock.history.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    userId: 8,
                    action: 'scan',
                    item: 'Stapler',
                    status: 'scanned',
                }),
            });
        });

        it('returns generic error on DB failure', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.inventoryItem.findUnique.mockRejectedValue(new Error('boom'));

            const result = await scanner.getItemBySN('SN-X');
            expect(result).toEqual({ error: 'Failed to fetch item' });
            errSpy.mockRestore();
        });
    });

    describe('getRecentScans', () => {
        it('rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const result = await scanner.getRecentScans();
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('returns the last 5 scans for the current user', async () => {
            authMock.mockResolvedValue(sessionFor('user', { id: 8 }));
            prismaMock.history.findMany.mockResolvedValue([{ id: 1 }] as any);

            const result = await scanner.getRecentScans();

            expect((result as any).success).toBe(true);
            expect(prismaMock.history.findMany).toHaveBeenCalledWith({
                where: { userId: 8, action: 'scan' },
                orderBy: { date: 'desc' },
                take: 5,
            });
        });

        it('returns error when DB fails (no console.error in this branch)', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.history.findMany.mockRejectedValue(new Error('boom'));

            const result = await scanner.getRecentScans();
            expect(result).toEqual({ error: 'Failed to fetch recent scans' });
        });
    });
});
