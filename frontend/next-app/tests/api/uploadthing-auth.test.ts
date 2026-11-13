import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadThingError } from 'uploadthing/server';

const authMock = vi.fn();

vi.mock('@/auth', () => ({
    auth: () => authMock(),
}));

describe('UploadThing middleware auth (F-001)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('throws UploadThingError Unauthorized when session is missing', async () => {
        authMock.mockResolvedValue(null);
        const { requireUploadAuth } = await import('@/app/api/uploadthing/core');

        await expect(requireUploadAuth()).rejects.toBeInstanceOf(UploadThingError);
        await expect(requireUploadAuth()).rejects.toThrow('Unauthorized');
    });

    it('returns userId when session is present', async () => {
        authMock.mockResolvedValue({ user: { id: '42', role: 'user' } });
        const { requireUploadAuth } = await import('@/app/api/uploadthing/core');

        await expect(requireUploadAuth()).resolves.toEqual({ userId: '42' });
    });
});
