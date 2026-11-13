import path from 'path';
import { fileURLToPath } from 'url';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

// [2026-11-10] Modified by Cursor: exact "true" only. Any other value (including
// unset) is fail-closed so the Quick Demo panel and its credential module stay
// out of the client bundle. `env` forces a build-time constant even when the
// variable is missing, which is what lets webpack drop the dead branch.
const appDir = path.dirname(fileURLToPath(import.meta.url));
const demoModeEnabled = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

const baseConfig = {
    env: {
        NEXT_PUBLIC_DEMO_MODE: demoModeEnabled ? 'true' : '',
    },
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
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
        return {
            fallback: [
                {
                    source: '/api/:path*',
                    destination: `${backendUrl}/api/:path*`, // Proxy to express backend
                },
            ],
        };
    },
    webpack(config, { webpack }) {
        // Production and `next dev` both use webpack (see package.json scripts).
        // Swap the credential module for an empty component unless demo mode is on.
        if (!demoModeEnabled) {
            config.plugins.push(
                new webpack.NormalModuleReplacementPlugin(
                    /(?:^|[\\/])demo-quick-access(?:\.tsx)?$/,
                    path.join(appDir, 'components/auth/demo-quick-access-off.tsx'),
                ),
            );
        }
        return config;
    },
};

export default function nextConfig(phase) {
    return {
        distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next-build',
        ...baseConfig,
    };
}
