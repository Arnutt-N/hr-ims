import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/auth-cache', () => ({ getCachedAuth: vi.fn() }));

describe('test-email Server Action', () => {
    let testEmail: typeof import('@/lib/actions/test-email');
    let getCachedAuth: Mock;
    let fetchSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(async () => {
        ({ getCachedAuth } = (await import('@/lib/auth-cache')) as { getCachedAuth: Mock });
        getCachedAuth.mockReset();
        fetchSpy = vi.spyOn(global, 'fetch').mockReset();
        testEmail = await import('@/lib/actions/test-email');
    });

    function jsonResponse(body: unknown, ok = true, status = 200): any {
        return { ok, status, json: () => Promise.resolve(body) };
    }

    it('rejects non-superadmin', async () => {
        getCachedAuth.mockResolvedValue(sessionFor('admin'));
        const result = await testEmail.sendTestEmail();
        expect(result).toEqual({ success: false, error: 'Unauthorized' });
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('rejects unauthenticated', async () => {
        getCachedAuth.mockResolvedValue(null);
        const result = await testEmail.sendTestEmail();
        expect(result).toEqual({ success: false, error: 'Unauthorized' });
    });

    it('forwards POST with auth headers + email body', async () => {
        getCachedAuth.mockResolvedValue(
            sessionFor('superadmin', { id: 3, email: 'sa@demo.com' }),
        );
        fetchSpy.mockResolvedValue(jsonResponse({ message: 'sent' }));

        const result = await testEmail.sendTestEmail();

        expect(result).toEqual({ success: true, message: 'sent' });
        expect(fetchSpy).toHaveBeenCalledWith(
            expect.stringContaining('/api/email/test'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ email: 'sa@demo.com' }),
                headers: expect.objectContaining({
                    'x-user-id': '3',
                    'Content-Type': 'application/json',
                }),
            }),
        );
    });

    it('returns backend error message on 4xx', async () => {
        getCachedAuth.mockResolvedValue(sessionFor('superadmin'));
        fetchSpy.mockResolvedValue(jsonResponse({ error: 'SMTP fail' }, false, 500));

        const result = await testEmail.sendTestEmail();
        expect(result).toEqual({ success: false, error: 'SMTP fail' });
    });

    it('falls back to generic message when fetch throws', async () => {
        getCachedAuth.mockResolvedValue(sessionFor('superadmin'));
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        fetchSpy.mockRejectedValue(new Error('network'));

        const result = await testEmail.sendTestEmail();
        expect(result).toEqual({ success: false, error: 'Failed to send test email' });
        errSpy.mockRestore();
    });
});
