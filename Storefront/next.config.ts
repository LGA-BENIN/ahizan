import { NextConfig } from 'next';

const nextConfig: NextConfig = {
    cacheComponents: false,
    images: {
        dangerouslyAllowLocalIP: true,
        remotePatterns: [
            { hostname: 'readonlydemo.vendure.io' },
            { hostname: 'demo.vendure.io' },
            { hostname: 'localhost' },
            { hostname: '127.0.0.1' },
            { hostname: 'images.unsplash.com' }
        ],
    },
    turbopack: {
        root: __dirname,
    },
};

export default nextConfig;