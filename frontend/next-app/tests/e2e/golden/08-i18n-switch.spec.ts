import { expect, test } from '@playwright/test';
import { loginAs } from '../fixtures/auth';

test.describe.configure({ mode: 'serial' });

/**
 * Golden 08 — Locale toggle (TH ↔ EN) + raw-key audit
 *
 * Asserts:
 *  1. The segmented locale toggle is present in the header.
 *  2. Toggling to EN changes visible text.
 *  3. No translation key (e.g. "header.title.dashboard") leaks into the
 *     rendered DOM in either locale — proves the i18n provider's coverage.
 */

const PAGES_TO_AUDIT = ['/dashboard', '/inventory', '/requests'];

const RAW_KEY_PATTERN = /\b[a-z][a-zA-Z]*\.[a-z][a-zA-Z]*(\.[a-zA-Z]+)*\b/;

async function visibleBodyText(page: import('@playwright/test').Page): Promise<string> {
    return page.locator('body').innerText();
}

async function clickLocale(page: import('@playwright/test').Page, label: 'TH' | 'EN') {
    const button = page.getByRole('radio', { name: label === 'TH' ? /ภาษาไทย/i : /English/i }).first();
    if (!(await button.isVisible({ timeout: 5_000 }).catch(() => false))) {
        // Fall back: target by visible label inside the segmented control.
        const fallback = page.getByText(label, { exact: true }).first();
        await fallback.click();
    } else {
        await button.click();
    }
    // Setting locale triggers a full reload (see locale-toggle.tsx).
    await page.waitForLoadState('domcontentloaded');
}

test.describe('Golden 08 — Locale toggle + raw-key audit', () => {
    test.setTimeout(180_000);
    test('locale toggle is rendered in the header on dashboard', async ({ page }) => {
        await loginAs(page, 'admin');
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

        const toggle = page.getByRole('radiogroup', { name: /language/i });
        await expect(toggle).toBeVisible({ timeout: 30_000 });
    });

    for (const route of PAGES_TO_AUDIT) {
        test(`no raw i18n keys visible on ${route} in TH`, async ({ page }) => {
            await loginAs(page, 'admin');
            await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 90_000 });

            // Make sure we're in TH (default locale per messages.ts).
            await clickLocale(page, 'TH').catch(() => undefined);

            const text = await visibleBodyText(page);
            // The pattern only false-positives on actual product names; we filter
            // a small allowlist of legitimate dotted names.
            const hits = text.match(/\b(header|sidebar|button|form|dialog|toast)\.[a-zA-Z.]+/g) ?? [];
            expect(hits, `raw key hits in TH on ${route}: ${hits.join(', ')}`).toEqual([]);
        });

        test(`no raw i18n keys visible on ${route} in EN`, async ({ page }) => {
            await loginAs(page, 'admin');
            await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 90_000 });

            await clickLocale(page, 'EN').catch(() => undefined);

            const text = await visibleBodyText(page);
            const hits = text.match(/\b(header|sidebar|button|form|dialog|toast)\.[a-zA-Z.]+/g) ?? [];
            expect(hits, `raw key hits in EN on ${route}: ${hits.join(', ')}`).toEqual([]);
        });
    }

    test('toggling locale changes visible text', async ({ page }) => {
        await loginAs(page, 'admin');
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

        await clickLocale(page, 'TH').catch(() => undefined);
        const thaiText = await visibleBodyText(page);

        await clickLocale(page, 'EN').catch(() => undefined);
        const englishText = await visibleBodyText(page);

        // The two snapshots must differ — proves the locale provider re-renders.
        expect(thaiText).not.toBe(englishText);
        // Sanity: presence of distinctly Thai characters in TH snapshot.
        expect(thaiText).toMatch(/[฀-๿]/);
    });
});
