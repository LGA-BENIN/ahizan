import { NextConfig } from 'next';

const nextConfig: NextConfig = {
    cacheComponents: true,
    images: {
        // This is necessary to display images from your local Vendure instance
        dangerouslyAllowLocalIP: true,
        remotePatterns: [
            {
                hostname: 'readonlydemo.vendure.io',
            },
            {
                hostname: 'demo.vendure.io'
            },
            {
                hostname: 'localhost'
            },
            {
                hostname: 'images.unsplash.com'
            },
            {
                hostname: '**.unsplash.com'
            }
        ],
    },
    experimental: {
        rootParams: true,
        serverActions: {
            bodySizeLimit: '50mb',
        },
    },
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default nextConfig;