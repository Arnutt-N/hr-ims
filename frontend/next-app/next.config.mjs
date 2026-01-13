/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: '/api/:path((?!auth).*)*',  // Match all /api/* except /api/auth/*
                destination: 'http://localhost:3001/api/:path*', // Proxy to express backend
            },
        ];
    },
};

export default nextConfig;
