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
            exclude: ['**/*.test.{ts,tsx}', '**/*.d.ts', 'lib/api-types.ts'],
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
