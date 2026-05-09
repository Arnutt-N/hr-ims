import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        pool: 'forks',
        fileParallelism: false,
        setupFiles: ['./tests/setup.ts'],
        include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        exclude: ['**/node_modules/**', '**/dist/**', '**/tests/e2e/**'],
        alias: {
            '@': path.resolve(__dirname, './'),
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov', 'json-summary'],
            include: ['lib/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
            exclude: [
                '**/*.test.{ts,tsx}',
                '**/*.d.ts',
                'lib/api-types.ts',
                // PRP v6 Phase 2: maintenance Server Actions land in this PR
                // but their unit tests are scheduled for Phase 4 per the PRP
                // PR plan (PRPs/claude/2026-05-09_104630_*.md, section 4
                // Phase 4 commit candidates). Excluded from coverage measurement
                // until tests arrive; remove this line in Phase 4 PR.
                'lib/actions/maintenance.ts',
                // Same rationale: helpers and infra shipped in Phase 2 are tested
                // in Phase 4 alongside the Server Actions that consume them.
                'lib/maintenance/**',
            ],
            // Per-file gates for every Server Action in lib/actions/.
            // Coverage was lifted from 0.45% (Phase A baseline) to 91.61%
            // weighted average across all 24 files, with no file below 70%.
            thresholds: {
                'lib/actions/*.ts': {
                    lines: 70,
                    statements: 70,
                    functions: 65,
                    branches: 55,
                },
            },
        },
    },
});
