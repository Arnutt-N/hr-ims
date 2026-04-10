import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

const baseConfig = {
    turbopack: {
        root: process.cwd(), // Fix Turbopack workspace root detection
    },
    // @uploadthing/* ships .d.cts TypeScript declaration files that contain
    // ESM syntax. Webpack 5 (used by `next build --webpack`) rejects them
    // with: "Specified module format (CommonJs) is not matching the module
    // format of the source code (EcmaScript Modules)". Running these
    // packages through Next's SWC compiler avoids the mismatch.
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
