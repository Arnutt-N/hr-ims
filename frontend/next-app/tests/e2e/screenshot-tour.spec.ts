import { test, devices, type Page } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';

/**
 * Screenshot tour — logs in as superadmin and captures full-page PNGs of
 * every primary application route at desktop and mobile viewports. Output
 * goes to examples/screenshots/auto/{desktop,mobile}/<slug>.png so it sits
 * next to the manual screenshots a human already dropped into the repo.
 *
 * Run:
 *   cd frontend/next-app
 *   npx playwright test tests/e2e/screenshot-tour.spec.ts
 *
 * Requires:
 *   - backend/prisma/dev.db created and seeded (superadmin@demo.com / demo123)
 *   - frontend/next-app/.env.local with NEXTAUTH_SECRET, AUTH_SECRET, DATABASE_URL
 *   - Playwright's webServer config auto-starts `npm run dev` on :3000
 */

const SCREENSHOT_ROOT = path.resolve(__dirname, '../../../../examples/screenshots/auto');

type RouteDef = {
    slug: string;
    url: string;
    /** Skip on mobile tour if not in the short list */
    mobileInclude?: boolean;
    /** Route is reachable without auth */
    public?: boolean;
};

const ROUTES: RouteDef[] = [
    { slug: 'login', url: '/login', public: true, mobileInclude: true },
    { slug: 'register', url: '/register', public: true },
    { slug: 'forgot-password', url: '/forgot-password', public: true },
    { slug: 'dashboard', url: '/dashboard', mobileInclude: true },
    { slug: 'inventory-all', url: '/inventory', mobileInclude: true },
    { slug: 'inventory-borrow', url: '/inventory?type=durable', mobileInclude: true },
    { slug: 'inventory-withdraw', url: '/inventory?type=consumable' },
    { slug: 'cart', url: '/cart' },
    { slug: 'requests', url: '/requests', mobileInclude: true },
    { slug: 'my-assets', url: '/my-assets' },
    { slug: 'history', url: '/history' },
    { slug: 'users', url: '/users', mobileInclude: true },
    { slug: 'maintenance', url: '/maintenance' },
    { slug: 'scanner', url: '/scanner' },
    { slug: 'reports', url: '/reports' },
    { slug: 'warehouse', url: '/warehouse' },
    { slug: 'settings', url: '/settings' },
    { slug: 'settings-system', url: '/settings/system' },
    { slug: 'settings-warehouses', url: '/settings/warehouses' },
    { slug: 'settings-departments', url: '/settings/departments' },
    { slug: 'settings-permissions', url: '/settings/permissions' },
];

async function login(page: Page): Promise<void> {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('input[name="email"]').fill('superadmin@demo.com');
    await page.locator('input[name="password"]').fill('demo123');
    await page.locator('button[type="submit"]').click();
    // Auth redirects to /dashboard on success. Allow up to 30s because the
    // first Next.js compile after `npm run dev` can be slow.
    await page.waitForURL('**/dashboard**', { timeout: 30_000 });
}

async function captureRoute(page: Page, route: RouteDef, outDir: string): Promise<{ slug: string; ok: boolean; error?: string }> {
    try {
        await page.goto(route.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => { /* tolerable */ });

        // Many pages in this project are client components that render a
        // "Loading ..." placeholder while a useEffect fetch resolves. Wait
        // for any such placeholder to disappear before screenshotting so the
        // captures show real content, not skeletons.
        await page
            .waitForFunction(
                () => {
                    const body = document.body?.innerText || '';
                    // Match English "Loading users..." etc AND Thai "กำลังโหลด..."
                    return !/Loading\s+[\w\s]*\.{3}/i.test(body) && !/กำลังโหลด\s*\.{3}/.test(body);
                },
                { timeout: 15_000 },
            )
            .catch(() => { /* some pages may legitimately keep a loading sub-region */ });

        // Let client animations settle (fade-in-up, hover states, etc.)
        await page.waitForTimeout(800);

        await page.screenshot({
            path: path.join(outDir, `${route.slug}.png`),
            fullPage: true,
        });
        return { slug: route.slug, ok: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { slug: route.slug, ok: false, error: message };
    }
}

function ensureDir(dir: string): void {
    fs.mkdirSync(dir, { recursive: true });
}

test.describe.configure({ mode: 'serial' });

test('desktop screenshot tour', async ({ page }) => {
    test.setTimeout(600_000); // 10 min — first dev-server compile is slow

    const outDir = path.join(SCREENSHOT_ROOT, 'desktop');
    ensureDir(outDir);

    await page.setViewportSize({ width: 1440, height: 900 });

    const results: Array<{ slug: string; ok: boolean; error?: string }> = [];

    // Public routes first — no auth cookie needed
    for (const route of ROUTES.filter((r) => r.public)) {
        const result = await captureRoute(page, route, outDir);
        results.push(result);
        console.log(`[desktop] ${result.ok ? 'OK' : 'FAIL'}  ${route.slug}  ${result.error ?? ''}`);
    }

    // Auth then private routes
    await login(page);
    for (const route of ROUTES.filter((r) => !r.public)) {
        const result = await captureRoute(page, route, outDir);
        results.push(result);
        console.log(`[desktop] ${result.ok ? 'OK' : 'FAIL'}  ${route.slug}  ${result.error ?? ''}`);
    }

    const failed = results.filter((r) => !r.ok);
    console.log(`\n[desktop] captured ${results.length - failed.length}/${results.length} screenshots`);
    if (failed.length > 0) {
        console.log('[desktop] failures:', failed.map((f) => `${f.slug}: ${f.error}`).join('\n'));
    }
});

test('mobile screenshot tour', async ({ browser }) => {
    test.setTimeout(600_000);

    const outDir = path.join(SCREENSHOT_ROOT, 'mobile');
    ensureDir(outDir);

    const context = await browser.newContext({ ...devices['Pixel 5'] });
    const page = await context.newPage();

    const mobileRoutes = ROUTES.filter((r) => r.mobileInclude);
    const results: Array<{ slug: string; ok: boolean; error?: string }> = [];

    for (const route of mobileRoutes.filter((r) => r.public)) {
        const result = await captureRoute(page, route, outDir);
        results.push(result);
        console.log(`[mobile] ${result.ok ? 'OK' : 'FAIL'}  ${route.slug}  ${result.error ?? ''}`);
    }

    await login(page);
    for (const route of mobileRoutes.filter((r) => !r.public)) {
        const result = await captureRoute(page, route, outDir);
        results.push(result);
        console.log(`[mobile] ${result.ok ? 'OK' : 'FAIL'}  ${route.slug}  ${result.error ?? ''}`);
    }

    console.log(`\n[mobile] captured ${results.filter((r) => r.ok).length}/${results.length} screenshots`);

    await context.close();
});
