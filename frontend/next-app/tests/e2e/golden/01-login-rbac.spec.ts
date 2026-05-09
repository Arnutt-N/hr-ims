import { expect, test } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import { DEMO_USERS, type RoleSlug } from '../fixtures/users';

// First page hit triggers webpack compile — be generous.
test.describe.configure({ mode: 'serial' });

const ROLES: RoleSlug[] = ['superadmin', 'admin', 'approver', 'auditor', 'technician', 'user'];

test.describe('Golden 01 — Login + role-based redirect', () => {
    test.setTimeout(180_000);
    test('login form rejects bad credentials', async ({ page }) => {
        await page.goto('/login', { waitUntil: 'domcontentloaded' });
        await page.locator('input[name="email"]').fill('superadmin@demo.com');
        await page.locator('input[name="password"]').fill('wrong-password');
        await page.locator('button[type="submit"]').click();

        // We must NOT navigate to /dashboard on bad creds.
        await page
            .waitForURL((url) => url.pathname.startsWith('/dashboard'), { timeout: 5_000 })
            .catch(() => undefined);
        expect(page.url()).not.toContain('/dashboard');
    });

    for (const role of ROLES) {
        test(`${role} can log in and lands on /dashboard`, async ({ page }) => {
            await loginAs(page, role);
            expect(page.url()).toContain('/dashboard');
            // Sidebar must mount — proves auth context wired correctly.
            await expect(page.locator('nav, [role="navigation"]').first()).toBeVisible({ timeout: 30_000 });
        });
    }

    test('superadmin reaches every gated route without access_denied', async ({ page }) => {
        await loginAs(page, 'superadmin');

        const gated = [
            '/inventory',
            '/cart',
            '/my-assets',
            '/requests',
            '/maintenance',
            '/history',
            '/reports',
            '/scanner',
            '/tags',
            '/users',
            '/logs',
            '/settings',
        ];

        for (const path of gated) {
            await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 90_000 });
            expect(page.url(), `superadmin denied at ${path}`).not.toContain('error=access_denied');
        }
    });

    test('regular user can NOT reach /users (admin-only)', async ({ page }) => {
        await loginAs(page, 'user');
        await page.goto('/users', { waitUntil: 'domcontentloaded', timeout: 90_000 });
        // Either redirected to dashboard with error, or the page shows an
        // unauthorized banner. We accept either.
        const url = page.url();
        const denied = url.includes('error=access_denied') || url.includes('/dashboard');
        expect(denied, `user wasn't denied at /users — landed on ${url}`).toBe(true);
    });

    test('regular user can NOT reach /settings (admin-only)', async ({ page }) => {
        await loginAs(page, 'user');
        await page.goto('/settings', { waitUntil: 'domcontentloaded', timeout: 90_000 });
        const url = page.url();
        const denied = url.includes('error=access_denied') || url.includes('/dashboard');
        expect(denied).toBe(true);
    });

    test('seed users come from fixtures (sanity check)', async () => {
        // Pure assertion — proves the spec wires up the fixture file.
        expect(DEMO_USERS.superadmin.email).toBe('superadmin@demo.com');
        expect(Object.keys(DEMO_USERS)).toHaveLength(6);
    });
});
