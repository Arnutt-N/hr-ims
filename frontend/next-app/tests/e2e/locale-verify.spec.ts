import { test, type Page } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';

/**
 * Locale toggle smoke test — logs in, screenshots the dashboard in the
 * default locale (TH), clicks the language toggle, and screenshots it in
 * EN. The two PNGs go side-by-side to examples/screenshots/auto/locale/
 * so you can diff them visually.
 */

const OUT_DIR = path.resolve(__dirname, '../../../../examples/screenshots/auto/locale');

async function login(page: Page): Promise<void> {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('input[name="email"]').fill('superadmin@demo.com');
    await page.locator('input[name="password"]').fill('demo123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard**', { timeout: 30_000 });
}

async function waitForLoadingGone(page: Page): Promise<void> {
    await page
        .waitForFunction(
            () => {
                const body = document.body?.innerText || '';
                return !/Loading\s+[\w\s]*\.{3}/i.test(body);
            },
            { timeout: 15_000 },
        )
        .catch(() => { /* tolerate partial loading */ });
}

test('locale toggle TH <-> EN', async ({ page }) => {
    test.setTimeout(300_000);

    fs.mkdirSync(OUT_DIR, { recursive: true });

    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);

    // --- Default (Thai) snapshot ---
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await waitForLoadingGone(page);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, 'dashboard-th.png'), fullPage: true });
    console.log('[locale] captured dashboard-th.png');

    // --- Click the TH/EN toggle ---
    // Toggle button has aria-label "Switch to Thai" (when in TH) or
    // "Switch to English" (when in EN). On first load we're in TH, so
    // clicking should flip to EN.
    const toggle = page.locator('button[aria-label*="Switch"], button:has-text("ไทย"), button:has-text("EN")').first();
    await toggle.click();

    // LocaleToggle triggers window.location.reload() after writing the
    // cookie, so wait for the reload to complete + network to settle.
    await page.waitForLoadState('load', { timeout: 15_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => { /* tolerate */ });
    await waitForLoadingGone(page);
    await page.waitForTimeout(800);

    // --- English snapshot of the same page ---
    await page.screenshot({ path: path.join(OUT_DIR, 'dashboard-en.png'), fullPage: true });
    console.log('[locale] captured dashboard-en.png');

    // --- English inventory page (to also capture sidebar in EN) ---
    await page.goto('/inventory?type=durable', { waitUntil: 'domcontentloaded' });
    await waitForLoadingGone(page);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, 'inventory-borrow-en.png'), fullPage: true });
    console.log('[locale] captured inventory-borrow-en.png');

    // --- Toggle back to Thai ---
    const toggleBack = page.locator('button[aria-label*="Switch"], button:has-text("ไทย"), button:has-text("EN")').first();
    await toggleBack.click();
    await page.waitForLoadState('load', { timeout: 15_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => { /* tolerate */ });
    await waitForLoadingGone(page);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, 'inventory-borrow-th.png'), fullPage: true });
    console.log('[locale] captured inventory-borrow-th.png');
});
