import { test } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import { runAxeScan } from '../fixtures/a11y';

test.describe.configure({ mode: 'serial' });

/**
 * Golden 09 — Accessibility budget
 *
 * Walks the four priority dashboard routes with axe-core. Budget per
 * Phase F of the audit PRP:
 *   • 0 serious / critical violations
 *   • Lighthouse a11y ≥ 95 (separate job — see .lighthouserc.cjs)
 *
 * Non-blocking (minor/moderate) violations are logged but don't fail —
 * tracked as a backlog so we can ratchet the budget down over time.
 */

const ROUTES_TO_SCAN = ['/dashboard', '/inventory', '/requests'] as const;

test.describe('Golden 09 — Accessibility (axe-core)', () => {
    test.setTimeout(180_000);

    test('login page passes a11y budget', async ({ page }) => {
        await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 90_000 });
        await runAxeScan(page, { route: '/login' });
    });

    for (const route of ROUTES_TO_SCAN) {
        test(`${route} passes a11y budget (admin session)`, async ({ page }) => {
            await loginAs(page, 'admin');
            await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 90_000 });
            await runAxeScan(page, { route });
        });
    }
});
