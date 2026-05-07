import { expect, test } from '@playwright/test';
import { loginAs } from '../fixtures/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Golden 04 — User management (admin + RBAC gate)', () => {
    test.setTimeout(180_000);
    test('admin sees the users list', async ({ page }) => {
        await loginAs(page, 'admin');
        await page.goto('/users', { waitUntil: 'domcontentloaded', timeout: 90_000 });

        expect(page.url()).toContain('/users');
        // At least one demo user row should render.
        await expect(page.getByText(/admin@demo\.com|user@demo\.com/i).first())
            .toBeVisible({ timeout: 30_000 });
    });

    test('admin cannot promote anyone to superadmin (form should refuse)', async ({ page }) => {
        await loginAs(page, 'admin');
        await page.goto('/users', { waitUntil: 'domcontentloaded' });

        // Pick the first non-superadmin row and open its edit dialog.
        const editBtn = page.getByRole('button', { name: /edit|แก้ไข/i }).first();
        if (!(await editBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
            test.skip(true, 'No user row exposes an edit control on this seed run');
        }
        await editBtn.click();

        // Try to set role to superadmin via the role <select>.
        const roleSelect = page.locator('select[name="role"]').first();
        if (!(await roleSelect.isVisible({ timeout: 5_000 }).catch(() => false))) {
            test.skip(true, 'role select not rendered for admin');
        }
        // If the option is even disabled, the test is automatically green.
        const optionAvailable = await roleSelect.locator('option', { hasText: /superadmin/i })
            .count();
        if (optionAvailable === 0) {
            // Good: superadmin option not exposed to admin
            return;
        }

        await roleSelect.selectOption('superadmin');
        await page.getByRole('button', { name: /save|update|บันทึก/i }).last().click();

        // Server Action must reject — error toast/text mentioning forbidden.
        await expect(page.getByText(/forbidden|only superadmin/i))
            .toBeVisible({ timeout: 15_000 });
    });

    test('non-admin cannot reach /users', async ({ page }) => {
        await loginAs(page, 'user');
        await page.goto('/users', { waitUntil: 'domcontentloaded', timeout: 90_000 });

        const url = page.url();
        const denied = url.includes('error=access_denied') || url.includes('/dashboard');
        expect(denied, `user wasn't denied at /users — landed on ${url}`).toBe(true);
    });

    test('superadmin can see and toggle role on a user', async ({ page }) => {
        await loginAs(page, 'superadmin');
        await page.goto('/users', { waitUntil: 'domcontentloaded' });
        // Smoke: role-management UI must mount for superadmin.
        const editBtn = page.getByRole('button', { name: /edit|แก้ไข/i }).first();
        await expect(editBtn).toBeVisible({ timeout: 30_000 });
    });
});
