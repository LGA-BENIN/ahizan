import { NextConfig } from 'next';
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
    swSrc: "src/app/sw.ts",
    swDest: "public/sw.js",
    disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
    cacheComponents: false,
    images: {
        dangerouslyAllowLocalIP: true,
        remotePatterns: [
            { hostname: 'readonlydemo.vendure.io' },
            { hostname: 'demo.vendure.io' },
            { hostname: 'localhost' },
            { hostname: '127.0.0.1' },
            { hostname: 'api.ahizan.com' },
            { hostname: 'media.ahizan.com' },
            { hostname: 'ahizan_backend' },
            { hostname: 'images.unsplash.com' }
        ],
    },
    turbopack: {
        root: __dirname,
    },
};

export default withSerwist(nextConfig);