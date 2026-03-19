import { defineConfig, globalIgnores } from 'eslint/config';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
    ...nextCoreWebVitals,
    ...nextTypescript,
    {
        rules: {
            '@next/next/no-img-element': 'off',
            '@typescript-eslint/ban-ts-comment': 'off',
            '@typescript-eslint/no-empty-object-type': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            'prefer-const': 'off',
            'react-hooks/immutability': 'off',
            'react-hooks/set-state-in-effect': 'off',
            'react/no-unescaped-entities': 'off',
        },
    },
    globalIgnores([
        '.next/**',
        'coverage/**',
        'node_modules/**',
        'playwright-report/**',
        'test-results/**',
    ]),
]);
