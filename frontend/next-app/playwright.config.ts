import { defineConfig, devices } from '@playwright/test';

// Allow overriding the dev server port via env var so tests can run even
// when something else (Hyper-V, Docker proxy, another Node process) has
// port 3000 reserved. Falls back to 3000 to preserve existing behavior.
const PORT = process.env.PORT || '3000';
const BASE_URL = `http://localhost:${PORT}`;

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
        command: 'npm run dev',
        url: BASE_URL,
        env: { PORT },
        // Next.js 16 with --webpack takes longer than the default 60s on
        // first compile for this monorepo — give it up to 3 minutes.
        timeout: 180_000,
        reuseExistingServer: !process.env.CI,
    },
});
