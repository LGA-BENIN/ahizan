import { NextConfig } from 'next';
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
    swSrc: "src/app/sw.ts",
    swDest: "public/sw.js",
    disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig & { allowedDevOrigins?: string[] } = {
    allowedDevOrigins: ['10.1.1.73', 'localhost:3001', '10.1.1.73:3001'],
    images: {
        dangerouslyAllowLocalIP: true,
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [360, 420, 640, 750, 828, 1080, 1200, 1920],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        minimumCacheTTL: 86400,
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
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default withSerwist(nextConfig);