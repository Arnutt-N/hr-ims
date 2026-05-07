import type { Page } from '@playwright/test';
import { DEMO_USERS, type DemoUser, type RoleSlug } from './users';

type LoginOptions = {
    /**
     * Override `waitForURL` timeout. Defaults to 90s, which covers a cold
     * Webpack compile of `/dashboard` plus the post-auth redirect. Pass a
     * larger value when the test runs late in the suite (server is loaded
     * and `Error: aborted` redirects can stall the redirect once or twice).
     */
    waitForUrlTimeoutMs?: number;
};

/**
 * Drive the login form and wait for the dashboard URL.
 *
 * The first paint of any dashboard route triggers a Webpack compile (Next.js 16
 * dev mode), so we use generous waits; CI sets `retries: 2` in the config to
 * absorb the rare flake.
 */
export async function loginAs(
    page: Page,
    role: RoleSlug,
    options: LoginOptions = {},
): Promise<DemoUser> {
    const user = DEMO_USERS[role];
    const waitForUrlTimeoutMs = options.waitForUrlTimeoutMs ?? 90_000;

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('input[name="email"]').fill(user.email);
    await page.locator('input[name="password"]').fill(user.password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
        timeout: waitForUrlTimeoutMs,
    });
    return user;
}

export function authStatePathFor(role: RoleSlug): string {
    return `tests/e2e/.auth-${role}.json`;
}
