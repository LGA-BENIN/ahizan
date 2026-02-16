import { bootstrap, RequestContext, User, NativeAuthenticationMethod, PasswordCipher, Channel, Customer } from '@vendure/core';
import { config } from './vendure-config';
import { VendorService } from './plugins/multivendor/service/vendor.service';

async function debugRegister() {
    // Override port to avoid conflict with running server
    const debugConfig = {
        ...config,
        apiOptions: {
            ...config.apiOptions,
            port: 3003
        },
        plugins: config.plugins // We need plugins for VendorService
    };

    console.log('Bootstrapping Vendure on port 3003...');
    const app = await bootstrap(debugConfig);
    console.log('Bootstrapped!');

    try {
        const vendorService = app.get(VendorService);
        const connection = app.get('TransactionalConnection');

        const ctx = await getSuperAdminContext(app);
        
        const testEmail = `test-vendor-${Date.now()}@example.com`;
        const testPassword = 'Password123!';
        
        console.log(`\n--- Testing Registration for: ${testEmail} ---`);

        const vendor = await vendorService.create(ctx, {
            email: testEmail,
            name: 'Test Vendor',
            password: testPassword,
            phoneNumber: '1234567890',
            address: '123 Test St',
            type: 'INDIVIDUAL'
        });

        console.log('Vendor created:', vendor.name);
        
        if (!vendor.user) {
            console.error('ERROR: Vendor has no user linked!');
        } else {
            console.log('Vendor User ID:', vendor.user.id);
            
            // Check for Customer
            const customer = await connection.getRepository(ctx, Customer).findOne({
                where: { user: { id: vendor.user.id } }
            });

            if (customer) {
                console.log('SUCCESS: Customer found linked to user!');
                console.log('Customer:', {
                    id: customer.id,
                    email: customer.emailAddress,
                    firstName: customer.firstName
                });
            } else {
                console.error('FAILURE: NO Customer found linked to user!');
            }
        }

    } catch (e) {
        console.error('Error during registration test:', e);
    } finally {
        await app.close();
        process.exit(0);
    }
}

// Helper to get Context
async function getSuperAdminContext(app: any): Promise<RequestContext> {
    const connection = app.get('TransactionalConnection');
    const params = {
         where: {
            identifier: process.env.SUPERADMIN_USERNAME || 'superadmin',
        }
    }
    const superAdminUser = await connection.getRepository(User).findOne(params);
    const channel = await connection.getRepository(Channel).findOne({ where: { code: '__default_channel__' } });

    return new RequestContext({
        apiType: 'admin',
        isAuthorized: true,
        authorizedAsOwnerOnly: false,
        channel: channel!,
        languageCode: channel!.defaultLanguageCode,
        session: {
            id: 'debug-session',
            expires: new Date(Date.now() + 100000),
            user: superAdminUser,
            isAuthenticated: true,
            activeOrder: null,
            activeChannelId: channel!.id
        } as any
    });
}

debugRegister().catch(e => {
    console.error(e);
    process.exit(1);
});
