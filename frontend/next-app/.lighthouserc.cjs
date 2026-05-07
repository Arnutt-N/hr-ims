/**
 * Lighthouse CI config — Phase F of the audit PRP.
 *
 * Budget per the PRP (initial baseline — to be tightened as a11y debt
 * is paid down):
 *   • Performance      ≥ 80
 *   • Accessibility    ≥ 85   (target 95 once contrast / labels pass)
 *   • Best Practices   ≥ 90
 *
 * Lighthouse runs against the *production* build (`next start`) so we
 * measure shipping numbers, not webpack-dev overhead. CI seeds the DB
 * before this job so /dashboard, /inventory, and /requests can render.
 */
module.exports = {
    ci: {
        collect: {
            startServerCommand: 'npm run start',
            url: [
                'http://localhost:3000/login',
                'http://localhost:3000/dashboard',
                'http://localhost:3000/inventory',
                'http://localhost:3000/requests',
            ],
            numberOfRuns: 1,
            settings: {
                preset: 'desktop',
                // Skip PWA — HR-IMS isn't a progressive web app target.
                onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
            },
        },
        assert: {
            assertions: {
                'categories:performance': ['error', { minScore: 0.8 }],
                // Initial baseline: 0.85. The 0.95 PRP target is tracked as
                // follow-up work; raise this number incrementally as the
                // a11y backlog is closed (icon-only buttons, contrast, etc.).
                'categories:accessibility': ['error', { minScore: 0.85 }],
                'categories:best-practices': ['error', { minScore: 0.9 }],
                // SEO is "warn" — not a hard gate, but track regressions.
                'categories:seo': ['warn', { minScore: 0.85 }],
            },
        },
        upload: {
            target: 'temporary-public-storage',
        },
    },
};
