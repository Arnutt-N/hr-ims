import type { Page } from '@playwright/test';
import { DEMO_USERS, type DemoUser, type RoleSlug } from './users';

/**
 * Drive the login form and wait for the dashboard URL.
 *
 * The first paint of any dashboard route triggers a Webpack compile (Next.js 16
 * dev mode), so we use generous waits; CI sets `retries: 2` in the config to
 * absorb the rare flake.
 */
export async function loginAs(page: Page, role: RoleSlug): Promise<DemoUser> {
    const user = DEMO_USERS[role];

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('input[name="email"]').fill(user.email);
    await page.locator('input[name="password"]').fill(user.password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 90_000 });
    return user;
}

export function authStatePathFor(role: RoleSlug): string {
    return `tests/e2e/.auth-${role}.json`;
}
