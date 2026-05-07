import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import * as actions from '@/lib/actions/password-reset';

// password-reset is currently a stub. These tests pin the contract so a real
// implementation later (Phase E) doesn't accidentally regress the public shape.

describe('password-reset (stub) Server Actions', () => {
    beforeAll(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    it('requestPasswordReset returns success with a generic message (no email enumeration)', async () => {
        const promise = actions.requestPasswordReset('any@x.com');
        await vi.advanceTimersByTimeAsync(1100);
        const result = await promise;

        expect(result.success).toBe(true);
        expect(result.message).toMatch(/If an account exists/i);
    });

    it('resetPassword returns success regardless of token (stub)', async () => {
        const promise = actions.resetPassword('fake-token', 'NewPass123!');
        await vi.advanceTimersByTimeAsync(1100);
        const result = await promise;

        expect(result.success).toBe(true);
        expect(result.message).toMatch(/reset successfully/i);
    });
});
