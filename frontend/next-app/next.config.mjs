import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

const baseConfig = {
    turbopack: {
        root: process.cwd(), // Fix Turbopack workspace root detection
    },
    // uploadthing ships .d.cts declaration files that use ESM syntax,
    // which webpack 5 (via `next build --webpack`) rejects with a
    // "Specified module format (CommonJs) is not matching..." error.
    // Running these packages through Next's compiler avoids the mismatch.
    transpilePackages: [
        '@uploadthing/react',
        '@uploadthing/mime-types',
        '@uploadthing/shared',
        'uploadthing',
    ],
    async rewrites() {
        return {
            fallback: [
                {
                    source: '/api/:path*',
                    destination: 'http://localhost:3001/api/:path*', // Proxy to express backend
                },
            ],
        };
    },
};

export default function nextConfig(phase) {
    return {
        distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next-build',
        ...baseConfig,
    };
}
