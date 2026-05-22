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
            // The vendureDashboardPlugin will scan your configuration in order
            // to find any plugins which have dashboard extensions, as well as
            // to introspect the GraphQL schema based on any API extensions
            // and custom fields that are configured.
            vendureConfigPath: pathToFileURL('./src/vendure-config-dashboard.ts'),
            // En local => http://127.0.0.1:3000
            // En Docker/Production => https://administrator.ahizan.com:443
            api: { host: apiHost, port: apiPort },
            // When you start the Vite server, your Admin API schema will
            // be introspected and the types will be generated in this location.
            // These types can be used in your dashboard extensions to provide
            // type safety when writing queries and mutations.
            gqlOutputPath: './src/gql',
        }),
    ],
    optimizeDeps: {
        include: ['react', 'react-dom', '@apollo/client', 'react-router-dom'],
    },
    resolve: {
        dedupe: ['react', 'react-dom', '@apollo/client', 'react-router-dom'],
        alias: {
            // This allows all plugins to reference a shared set of
            // GraphQL types.
            '@/gql': resolve(__dirname, './src/gql/graphql.ts'),
            react: resolve(__dirname, 'node_modules/react'),
            'react-dom': resolve(__dirname, 'node_modules/react-dom'),
            '@apollo/client': resolve(__dirname, 'node_modules/@apollo/client'),
        },
    },
});
