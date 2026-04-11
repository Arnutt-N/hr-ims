import { test, devices, type Page } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';

/**
 * Responsive visual tour — captures the dashboard + inventory + login
 * at three canonical viewport sizes so we can eyeball layout breaks
 * across mobile, tablet, and a 14-inch laptop.
 *
 * Mobile   — Pixel 5 emulation (393x851)
 * Tablet   — iPad (810x1080)
 * Laptop14 — 14" laptop-ish (1440x900)
 * Desktop  — 1920x1080
 *
 * Output: examples/screenshots/auto/responsive/<viewport>/<slug>.png
 */

const OUT_ROOT = path.resolve(__dirname, '../../../../examples/screenshots/auto/responsive');

type RouteDef = { slug: string; url: string; public?: boolean };

const ROUTES: ReadonlyArray<RouteDef> = [
    { slug: 'login', url: '/login', public: true },
    { slug: 'dashboard', url: '/dashboard' },
    { slug: 'inventory', url: '/inventory' },
    { slug: 'users', url: '/users' },
    { slug: 'settings', url: '/settings/system' },
];

async function login(page: Page): Promise<void> {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('input[name="email"]').fill('superadmin@demo.com');
    await page.locator('input[name="password"]').fill('demo123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard**', { timeout: 30_000 });
}

async function waitForReady(page: Page): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => { });
    await page
        .waitForFunction(
            () => {
                const body = document.body?.innerText || '';
                // Match English "Loading ..." and Thai "กำลังโหลด..."
                return !/Loading\s+[\w\s]*\.{3}/i.test(body) && !/กำลังโหลด\s*\.{3}/.test(body);
            },
            { timeout: 15_000 },
        )
        .catch(() => { });
    await page.waitForTimeout(600);
}

async function runViewport(
    browser: import('@playwright/test').Browser,
    label: string,
    contextOptions: Parameters<typeof browser.newContext>[0],
) {
    const outDir = path.join(OUT_ROOT, label);
    fs.mkdirSync(outDir, { recursive: true });

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    // Public routes first
    for (const route of ROUTES.filter((r) => r.public)) {
        await page.goto(route.url, { waitUntil: 'domcontentloaded' });
        await waitForReady(page);
        await page.screenshot({ path: path.join(outDir, `${route.slug}.png`), fullPage: true });
        console.log(`[${label}] captured ${route.slug}.png`);
    }

    await login(page);

    for (const route of ROUTES.filter((r) => !r.public)) {
        try {
            await page.goto(route.url, { waitUntil: 'domcontentloaded' });
            await waitForReady(page);
            await page.screenshot({ path: path.join(outDir, `${route.slug}.png`), fullPage: true });
            console.log(`[${label}] captured ${route.slug}.png`);
        } catch (err) {
            console.error(`[${label}] FAIL ${route.slug}: ${(err as Error).message}`);
        }
    }

    await context.close();
}

test('responsive visual tour — mobile + tablet + laptop14 + desktop', async ({ browser }) => {
    test.setTimeout(900_000);

    await runViewport(browser, 'mobile', { ...devices['Pixel 5'] });
    await runViewport(browser, 'tablet', { viewport: { width: 810, height: 1080 } });
    await runViewport(browser, 'laptop14', { viewport: { width: 1440, height: 900 } });
    await runViewport(browser, 'desktop', { viewport: { width: 1920, height: 1080 } });
});
