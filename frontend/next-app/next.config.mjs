/** @type {import('next').NextConfig} */
const nextConfig = {
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

export default nextConfig;
