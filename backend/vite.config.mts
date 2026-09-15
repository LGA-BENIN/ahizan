import 'dotenv/config';
import { vendureDashboardPlugin } from '@vendure/dashboard/vite';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { defineConfig } from 'vite';

// En local (dev), on pointe vers le serveur local.
// En production/Docker, on pointe vers le sous-domaine public.
const IS_DEV = process.env.APP_ENV === 'dev';
const IS_DOCKER = !IS_DEV && (process.env.DOCKER === 'true' || process.env.NODE_ENV === 'production');
const apiHost = process.env.API_HOST || (IS_DOCKER ? 'https://administrator.ahizan.com' : 'http://127.0.0.1');
const apiPort = process.env.API_PORT ? parseInt(process.env.API_PORT, 10) : (IS_DOCKER ? 443 : 3000);

export default defineConfig({
    base: '/admin',
    define: {
        'import.meta.env.VITE_STOREFRONT_URL': JSON.stringify(process.env.STOREFRONT_URL || 'https://ahizan.com'),
    },
    build: {
        outDir: join(__dirname, 'dist/dashboard'),
    },
    server: {
        host: '127.0.0.1',
        proxy: {
            '/admin-api': {
                target: 'http://127.0.0.1:3000',
                changeOrigin: true,
            },
            '/shop-api': {
                target: 'http://127.0.0.1:3000',
                changeOrigin: true,
            },
            '/assets': {
                target: 'http://127.0.0.1:3000',
                changeOrigin: true,
            },
        },
        fs: {
            allow: ['..'],
        },
    },
    plugins: [
        vendureDashboardPlugin({
            vendureConfigPath: pathToFileURL('./src/vendure-config-dashboard.ts'),
            api: { host: apiHost, port: apiPort },
            gqlOutputPath: './src/gql',
        }),
    ],
    resolve: {
        // Ensures only ONE copy of React is bundled — prevents the
        // "Cannot read properties of null (reading 'useState')" error
        // that occurs when extension components resolve a different React instance
        // than the one used by Vendure Dashboard core.
        dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
        alias: {
            // Force all dashboard extension components to use the SAME React
            // instance as Vendure Dashboard core.
            'react': resolve(__dirname, 'node_modules/react'),
            'react-dom': resolve(__dirname, 'node_modules/react-dom'),
            // Shared GraphQL types for all plugins.
            '@/gql': resolve(__dirname, './src/gql/graphql.ts'),
        },
    },
});
