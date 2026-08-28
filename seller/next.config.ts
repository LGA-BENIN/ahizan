import { NextConfig } from 'next';
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
    swSrc: "src/app/sw.ts",
    swDest: "public/sw.js",
    disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
    cacheComponents: false,
    devIndicators: false,
    allowedDevOrigins: ['seller.ahizan.com'],
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
                hostname: 'api.ahizan.com'
            },
            {
                hostname: 'media.ahizan.com'
            },
            {
                hostname: 'ahizan_backend'
            },
            {
                hostname: 'images.unsplash.com'
            },
            {
                hostname: '**.unsplash.com'
            },
            {
                hostname: 'ahizan_backend'
            }
        ],
    },
    experimental: {
        rootParams: true,
        serverActions: {
            bodySizeLimit: '50mb',
            allowedOrigins: ['seller.ahizan.com', 'localhost:3000'],
        },
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    turbopack: {
        root: __dirname,
    },
};


export default withSerwist(nextConfig);