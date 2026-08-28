import { NextConfig } from 'next';

const nextConfig: NextConfig = {
    allowedDevOrigins: ['auth.ahizan.com', 'localhost:3003'],
    typescript: {
        ignoreBuildErrors: true,
    },
    experimental: {
        serverActions: {
            allowedOrigins: ['auth.ahizan.com', 'localhost:3003'],
        },
    },
};

export default nextConfig;
