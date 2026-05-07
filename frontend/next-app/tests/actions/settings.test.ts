import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/auth-cache', () => ({ getCachedAuth: vi.fn() }));
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
    updateTag: vi.fn(),
}));
vi.mock('@/lib/settings-cache', () => ({ SETTINGS_CACHE_TAG: 'settings' }));

describe('settings Server Actions', () => {
    let settings: typeof import('@/lib/actions/settings');
    let getCachedAuth: Mock;
    let fetchSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(async () => {
        ({ getCachedAuth } = (await import('@/lib/auth-cache')) as { getCachedAuth: Mock });
        getCachedAuth.mockReset();
        fetchSpy = vi.spyOn(global, 'fetch').mockReset();
        settings = await import('@/lib/actions/settings');
    });

    function jsonResponse(body: unknown, ok = true, status = 200): any {
        return { ok, status, json: () => Promise.resolve(body) };
    }

    const validInput = {
        orgName: 'HR-IMS',
        borrowLimit: 7,
        checkInterval: 30,
        maintenanceAlert: true,
        allowRegistration: false,
        footerText: 'Footer',
    };

    describe('getSettings', () => {
        it('rejects non-superadmin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            const result = await settings.getSettings();
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('rejects unauthenticated', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await settings.getSettings();
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('forwards GET with auth headers', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('superadmin', { id: 3 }));
            fetchSpy.mockResolvedValue(jsonResponse({ orgName: 'HR-IMS' }));

            const result = (await settings.getSettings()) as any;

            expect(result.success).toBe(true);
            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining('/api/settings'),
                expect.objectContaining({
                    method: 'GET',
                    cache: 'no-store',
                    headers: expect.objectContaining({ 'x-user-id': '3' }),
                }),
            );
        });

        it('returns backend error message on 4xx', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('superadmin'));
            fetchSpy.mockResolvedValue(jsonResponse({ error: 'gone' }, false, 410));

            const result = await settings.getSettings();
            expect(result).toEqual({ error: 'gone' });
        });

        it('returns generic error on fetch throw', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('superadmin'));
            const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            fetchSpy.mockRejectedValue(new Error('network'));

            const result = await settings.getSettings();
            expect(result).toEqual({ error: 'Failed to fetch settings' });
            errSpy.mockRestore();
        });
    });

    describe('updateSettings', () => {
        it('rejects non-superadmin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            const result = await settings.updateSettings(1, validInput);
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('PUTs validated payload + revalidates cache', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('superadmin', { id: 3 }));
            fetchSpy.mockResolvedValue(jsonResponse({ settings: validInput }));

            const result = (await settings.updateSettings(1, validInput)) as any;
            expect(result.success).toBe(true);

            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining('/api/settings'),
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify(validInput),
                }),
            );
        });

        it('returns Zod issue on bad input', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('superadmin'));
            const result = await settings.updateSettings(1, { ...validInput, orgName: 'a' });
            expect((result as any).error).toBeTruthy();
            expect(fetchSpy).not.toHaveBeenCalled();
        });

        it('returns backend error message on 4xx', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('superadmin'));
            fetchSpy.mockResolvedValue(jsonResponse({ error: 'bad' }, false, 400));

            const result = await settings.updateSettings(1, validInput);
            expect(result).toEqual({ error: 'bad' });
        });

        it('returns generic error on fetch throw', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('superadmin'));
            const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            fetchSpy.mockRejectedValue(new Error('network'));

            const result = await settings.updateSettings(1, validInput);
            expect(result).toEqual({ error: 'Failed to update settings' });
            errSpy.mockRestore();
        });
    });
});
