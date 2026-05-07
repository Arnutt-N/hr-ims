import { defineConfig, devices } from '@playwright/test';

// Allow overriding the dev server port via env var so tests can run even
// when something else (Hyper-V, Docker proxy, another Node process) has
// port 3000 reserved. Falls back to 3000 to preserve existing behavior.
const PORT = process.env.PORT || '3000';
const BASE_URL = `http://localhost:${PORT}`;

// In CI we run against a production build (`next start`) instead of the
// Webpack dev server. Compile-on-demand under load was causing aborted
// navigations and 90s waitForURL timeouts (see PR #14 CI history).
// Local dev runs unchanged: `npm run dev` for fast inner-loop iteration.
const useProdServer = process.env.E2E_USE_PROD === '1';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: BASE_URL,
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
        },
    ],
    webServer: {
        command: useProdServer ? 'npm run start' : 'npm run dev',
        url: BASE_URL,
        env: { PORT },
        // Dev mode: Next.js 16 with --webpack takes longer than the default
        // 60s on first compile for this monorepo — give it up to 3 minutes.
        // Prod mode: `next start` boots in seconds against a pre-built `.next/`,
        // so 60s is plenty.
        timeout: useProdServer ? 60_000 : 180_000,
        reuseExistingServer: !process.env.CI,
    },
});
