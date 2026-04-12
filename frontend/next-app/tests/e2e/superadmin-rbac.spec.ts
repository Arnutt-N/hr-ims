import { test, expect } from '@playwright/test';

const SUPERADMIN_EMAIL = 'superadmin@demo.com';
const SUPERADMIN_PASSWORD = 'demo123';

// Pages that were previously blocked for superadmin (access_denied)
const PROTECTED_PAGES = [
    '/requests',
    '/maintenance',
    '/history',
    '/reports',
    '/scanner',
    '/tags',
    '/users',
    '/logs',
    '/settings',
    '/inventory',
    '/dashboard',
];

// Run serially — dev server compiles each route on first hit
test.describe.configure({ mode: 'serial' });

test.describe('Superadmin RBAC — full menu access', () => {
    // Increase timeout — first page hit triggers webpack compilation
    test.setTimeout(120_000);

    test('login as superadmin', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        await page.fill('input[name="email"], input[type="email"]', SUPERADMIN_EMAIL);
        await page.fill('input[name="password"], input[type="password"]', SUPERADMIN_PASSWORD);
        await page.click('button[type="submit"]');

        // Wait for redirect to dashboard — long timeout for first compile
        await page.waitForURL('**/dashboard**', { timeout: 60_000 });
        expect(page.url()).toContain('/dashboard');
        expect(page.url()).not.toContain('error=access_denied');

        // Save auth state for subsequent tests
        await page.context().storageState({ path: 'tests/e2e/.auth-superadmin.json' });
    });

    for (const path of PROTECTED_PAGES) {
        test(`can access ${path} without access_denied`, async ({ browser }) => {
            // Reuse login state
            const context = await browser.newContext({
                storageState: 'tests/e2e/.auth-superadmin.json',
            });
            const page = await context.newPage();

            await page.goto(path, { timeout: 60_000 });
            await page.waitForLoadState('domcontentloaded');

            // Must NOT be redirected to dashboard with access_denied
            const url = page.url();
            expect(url).not.toContain('error=access_denied');

            await context.close();
        });
    }
});
