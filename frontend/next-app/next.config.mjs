import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

const baseConfig = {
    turbopack: {
        root: process.cwd(), // Fix Turbopack workspace root detection
    },
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
