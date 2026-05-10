/**
 * Vitest unit tests for telegramService.sendMaintenanceAlert.
 * PRP v6 Q11 — verify env-gated behavior + failure swallowing.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

describe('telegramService.sendMaintenanceAlert', () => {
    beforeEach(() => {
        vi.resetModules();
        process.env = { ...ORIGINAL_ENV };
        delete process.env.TELEGRAM_BOT_TOKEN;
        delete process.env.TELEGRAM_ADMIN_CHAT_ID;
        global.fetch = vi.fn();
    });

    afterEach(() => {
        process.env = ORIGINAL_ENV;
        vi.restoreAllMocks();
    });

    const validPayload = {
        requestId: 1,
        title: 'Test',
        description: 'desc',
        severity: 'critical' as const,
        reporterName: 'Alice',
        itemNames: ['Item 1'],
    };

    it('no-ops + returns false when TOKEN unset', async () => {
        process.env.TELEGRAM_ADMIN_CHAT_ID = '12345';
        const { sendMaintenanceAlert } = await import('@/lib/maintenance/telegram-service');
        const result = await sendMaintenanceAlert(validPayload);
        expect(result).toBe(false);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('no-ops + returns false when CHAT_ID unset', async () => {
        process.env.TELEGRAM_BOT_TOKEN = 'tok';
        const { sendMaintenanceAlert } = await import('@/lib/maintenance/telegram-service');
        const result = await sendMaintenanceAlert(validPayload);
        expect(result).toBe(false);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('POSTs to Telegram API when both env vars set', async () => {
        process.env.TELEGRAM_BOT_TOKEN = 'tok';
        process.env.TELEGRAM_ADMIN_CHAT_ID = '12345';
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true } as Response);

        const { sendMaintenanceAlert } = await import('@/lib/maintenance/telegram-service');
        const result = await sendMaintenanceAlert(validPayload);

        expect(result).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.telegram.org/bottok/sendMessage',
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('"chat_id":"12345"'),
            }),
        );
    });

    it('returns false on HTTP error (does NOT throw)', async () => {
        process.env.TELEGRAM_BOT_TOKEN = 'tok';
        process.env.TELEGRAM_ADMIN_CHAT_ID = '12345';
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: false,
            status: 400,
            statusText: 'Bad Request',
        } as Response);
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const { sendMaintenanceAlert } = await import('@/lib/maintenance/telegram-service');
        const result = await sendMaintenanceAlert(validPayload);

        expect(result).toBe(false);
        expect(errSpy).toHaveBeenCalled();
        errSpy.mockRestore();
    });

    it('returns false on fetch throw (does NOT propagate)', async () => {
        process.env.TELEGRAM_BOT_TOKEN = 'tok';
        process.env.TELEGRAM_ADMIN_CHAT_ID = '12345';
        (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network down'));
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const { sendMaintenanceAlert } = await import('@/lib/maintenance/telegram-service');
        const result = await sendMaintenanceAlert(validPayload);

        expect(result).toBe(false);
        expect(errSpy).toHaveBeenCalledWith(
            expect.stringContaining('threw'),
            expect.any(Error),
        );
        errSpy.mockRestore();
    });

    it('uses critical severity emoji + uppercases label', async () => {
        process.env.TELEGRAM_BOT_TOKEN = 'tok';
        process.env.TELEGRAM_ADMIN_CHAT_ID = '12345';
        let bodySent = '';
        (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (_url, init) => {
            bodySent = (init as { body: string }).body;
            return { ok: true } as Response;
        });

        const { sendMaintenanceAlert } = await import('@/lib/maintenance/telegram-service');
        await sendMaintenanceAlert({ ...validPayload, severity: 'critical' });

        expect(bodySent).toContain('🚨');
        expect(bodySent).toContain('CRITICAL');
    });
});
