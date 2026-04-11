import { test } from '@playwright/test';

test('login debug — full instrumentation', async ({ page }) => {
    test.setTimeout(120_000);

    page.on('console', (msg) => console.log(`  [browser ${msg.type()}]`, msg.text()));
    page.on('pageerror', (err) => console.log('  [pageerror]', err.message));
    page.on('requestfailed', (req) => console.log('  [requestfailed]', req.method(), req.url(), req.failure()?.errorText));
    page.on('response', async (res) => {
        const req = res.request();
        if (req.method() === 'POST' || res.url().includes('auth') || res.url().includes('login')) {
            console.log(`  [${req.method()}] ${res.status()} ${res.url()}`);
        }
    });

    console.log('[test] goto /login');
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    console.log('[test] url before fill:', page.url());

    console.log('[test] fill email');
    await page.locator('input[name="email"]').fill('superadmin@demo.com');

    console.log('[test] fill password');
    await page.locator('input[name="password"]').fill('demo123');

    console.log('[test] click submit');
    await page.locator('button[type="submit"]').click();

    // Wait a bit for any navigation / network activity to settle
    await page.waitForTimeout(6_000);

    console.log('[test] url after 6s wait:', page.url());

    const alertText = await page.locator('[role="alert"]').textContent().catch(() => null);
    console.log('[test] alert text:', alertText);

    // Capture any visible red/error text on the page
    const errorText = await page.locator('text=/error|invalid|failed/i').first().textContent().catch(() => null);
    console.log('[test] error text:', errorText);

    await page.screenshot({ path: 'D:/genAI/hr-ims/examples/screenshots/auto/debug-after-login.png', fullPage: true });
    console.log('[test] screenshot saved to examples/screenshots/auto/debug-after-login.png');
});
