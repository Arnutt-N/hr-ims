import { expect, test } from '@playwright/test';
import { loginAs } from '../fixtures/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Golden 06 — Reports + export', () => {
    test.setTimeout(180_000);
    test('auditor can open /reports', async ({ page }) => {
        await loginAs(page, 'auditor');
        await page.goto('/reports', { waitUntil: 'domcontentloaded', timeout: 90_000 });

        expect(page.url()).not.toContain('error=access_denied');
        // At least one chart container or stat card must mount.
        const anyCard = page.locator('[role="region"], canvas, svg').first();
        await expect(anyCard).toBeVisible({ timeout: 30_000 });
    });

    test('print button is reachable', async ({ page }) => {
        await loginAs(page, 'admin');
        await page.goto('/reports', { waitUntil: 'domcontentloaded' });

        const printBtn = page.getByRole('button', { name: /print|พิมพ์|export/i }).first();
        // Best-effort: at least one such control should exist.
        await expect(printBtn).toBeVisible({ timeout: 15_000 });
    });

    test('user role is denied from /reports', async ({ page }) => {
        await loginAs(page, 'user');
        await page.goto('/reports', { waitUntil: 'domcontentloaded', timeout: 90_000 });

        const url = page.url();
        const denied = url.includes('error=access_denied') || url.includes('/dashboard');
        expect(denied).toBe(true);
    });
});
