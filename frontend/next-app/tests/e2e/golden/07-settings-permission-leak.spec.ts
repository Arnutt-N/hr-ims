import { expect, test } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import type { RoleSlug } from '../fixtures/users';

test.describe.configure({ mode: 'serial' });

/**
 * Golden 07 — Settings sub-route permission audit
 *
 * /settings has 11 sub-routes. We assert that for each sub-route, the role
 * matrix matches the expectation from `backend/prisma/seed.ts ROLE_PERMISSIONS`.
 *
 * Key invariants from Phase B's RBAC matrix:
 *  - Default RBAC_LEGACY_FALLBACK=false → only the matrix grants access
 *  - Superadmin reaches everything
 *  - Admin reaches most settings except /settings/{logging, backup, email}
 *    (those are superadmin-only per the seed)
 *  - Non-admin roles must be denied across the board
 */

const SETTINGS_ROUTES = [
    '/settings/categories',
    '/settings/warehouses',
    '/settings/departments',
    '/settings/system',
    '/settings/permissions',
    '/settings/sessions',
    '/settings/logging',
    '/settings/backup',
    '/settings/email',
    '/settings/health',
] as const;

// From seed ROLE_PERMISSIONS: routes that admin should ALSO see (subset of superadmin's).
const ADMIN_ALLOWED = new Set<string>([
    '/settings/categories',
    '/settings/warehouses',
    '/settings/departments',
    '/settings/permissions',
    '/settings/sessions',
    '/settings/health',
]);

const NON_ADMIN_ROLES: RoleSlug[] = ['approver', 'auditor', 'technician', 'user'];

function isDeniedUrl(url: string): boolean {
    return url.includes('error=access_denied') || url.includes('/dashboard');
}

test.describe('Golden 07 — /settings/* permission leak audit', () => {
    test.setTimeout(180_000);
    test('superadmin reaches every settings sub-route', async ({ page }) => {
        await loginAs(page, 'superadmin');
        for (const route of SETTINGS_ROUTES) {
            await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 90_000 });
            expect(page.url(), `superadmin denied at ${route}`).not.toContain('error=access_denied');
        }
    });

    test('admin reaches the admin-allowed subset and is denied the rest', async ({ page }) => {
        await loginAs(page, 'admin');
        for (const route of SETTINGS_ROUTES) {
            await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 90_000 });
            const allowed = ADMIN_ALLOWED.has(route);
            const denied = isDeniedUrl(page.url());

            if (allowed) {
                expect(denied, `admin SHOULD reach ${route} but was denied`).toBe(false);
            } else {
                expect(denied, `admin should NOT reach ${route} but landed on ${page.url()}`).toBe(true);
            }
        }
    });

    for (const role of NON_ADMIN_ROLES) {
        test(`${role} is denied from every settings sub-route`, async ({ page }) => {
            await loginAs(page, role);
            for (const route of SETTINGS_ROUTES) {
                await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 90_000 });
                expect(isDeniedUrl(page.url()), `${role} reached ${route}`).toBe(true);
            }
        });
    }
});
