import { bootstrap, RequestContext, User, Channel, Customer } from '@vendure/core';
import { config } from './vendure-config';
import { VendorService } from './plugins/multivendor/service/vendor.service';
import { execute, parse } from 'graphql';

async function debugAccess() {
    // Override port
    const debugConfig = {
        ...config,
        apiOptions: {
            ...config.apiOptions,
            port: 3004
        },
        plugins: config.plugins
    };

    console.log('Bootstrapping Vendure on port 3004...');
    const app = await bootstrap(debugConfig);
    console.log('Bootstrapped!');

    try {
        const connection = app.get('TransactionalConnection');
        const vendorService = app.get(VendorService);

        // 1. Get User
        // const email = 'rfewfrre@gmail.com'; // Use the user we just fixed
        const email = 'eli111@gmail.com';
        const user = await connection.getRepository(User).findOne({ where: { identifier: email }, relations: ['roles', 'roles.permissions'] });

        if (!user) {
            console.error('User not found!');
            return;
        }

        console.log('User found:', user.identifier);
        console.log('User Roles:', user.roles.map(r => r.code));
        user.roles.forEach(r => {
            console.log(`Role ${r.code} permissions:`, r.permissions);
        });

        // 2. Create RequestContext for this user
        const channel = await connection.getRepository(Channel).findOne({ where: { code: '__default_channel__' } });

        const ctx = new RequestContext({
            apiType: 'shop', // Simulate Shop API
            isAuthorized: true,
            authorizedAsOwnerOnly: false,
            channel: channel!,
            languageCode: channel!.defaultLanguageCode,
            session: {
                id: 'debug-session',
                expires: new Date(Date.now() + 100000),
                user: user,
                isAuthenticated: true,
                activeOrder: null,
                activeChannelId: channel!.id
            } as any
        });

        console.log('Context created for user.');

        // 3. Call Service method directly (to check service-level auth if any, though service usually doesn't check auth)
        // Service doesn't check auth, Resolver does. 
        // But we want to check if the logic inside resolver works with this context.

        console.log('Testing findByUserId...');
        try {
            const vendor = await vendorService.findByUserId(ctx, user.id.toString());
            console.log('Service findByUserId result:', vendor ? vendor.name : 'null');
        } catch (e) {
            console.error('Service findByUserId FAILED:', e);
        }

        // 4. Simulate Resolver Check (verify Guard logic essentially)
        // We can't easily invoke the resolver with guards here without full GQL execution.
        // But we can check if the permissions match.

        const hasAuth = user.roles.some(r => r.permissions.includes('Authenticated'));
        console.log('User has Authenticated permission:', hasAuth);

        const hasVendor = user.roles.some(r => r.permissions.includes('Vendor'));
        console.log('User has Vendor permission:', hasVendor);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await app.close();
        process.exit(0);
    }
}

debugAccess().catch(console.error);
