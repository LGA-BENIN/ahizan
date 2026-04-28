
import { bootstrap, RequestContext, TransactionalConnection, Channel, User } from '@vendure/core';
import { config } from './src/vendure-config';
import { VendorService } from './src/plugins/multivendor/service/vendor.service';
import { RegistrationField } from './src/plugins/page-inscription/entities/registration-field.entity';

// Override port to avoid conflict
config.apiOptions.port = 3005;
config.dbConnectionOptions.synchronize = false; // Don't sync schema, just use existing
config.plugins = config.plugins.filter(p => p.constructor.name !== 'DefaultJobQueuePlugin'); // Disable job queue to avoid noise

(async () => {
    console.log('Bootstrapping Vendure on port 3005...');
    const app = await bootstrap(config);
    const vendorService = app.get(VendorService);
    const connection = app.get(TransactionalConnection);

    // Create a Context
    // We will use the 'superadmin' to ensure we have permissions
    const superAdmin = await connection.rawConnection.getRepository(User).findOne({ where: { identifier: 'superadmin' } });
    const channel = await connection.rawConnection.getRepository(Channel).findOne({ where: { code: '__default_channel__' } });

    if (!superAdmin || !channel) {
        console.error('Superadmin or Default Channel not found. Cannot proceed.');
        process.exit(1);
    }

    const ctx = new RequestContext({
        channel,
        apiType: 'admin',
        isAuthorized: true,
        authorizedAsOwnerOnly: false,
        session: {
            user: superAdmin,
            id: 'test-session',
            expires: new Date(Date.now() + 3600000),
            isAuthenticated: true,
            activeChannelId: channel.id
        } as any
    });

    console.log('Context created');

    // 1. Ensure a required field exists
    const fieldRepo = connection.getRepository(ctx, RegistrationField);
    let testField = await fieldRepo.findOne({ where: { name: 'testRequiredField' } });

    // Clean up any previous test field
    if (testField) {
        await fieldRepo.remove(testField);
    }

    testField = new RegistrationField({
        name: 'testRequiredField',
        label: 'Test Required Field',
        type: 'text',
        required: true,
        enabled: true,
        order: 99
    });
    await fieldRepo.save(testField);
    console.log('Created test required field: testRequiredField');


    // 2. Attempt registration WITHOUT field
    console.log('--- TEST 1: Attempting registration WITHOUT required field ---');
    try {
        await vendorService.create(ctx, {
            name: 'Test Vendor Fail',
            email: `test-fail-${Date.now()}@test.com`,
            phoneNumber: '12345678',
            // Missing 'testRequiredField' in dynamicDetails
            dynamicDetails: {}
        });
        console.error('FAILURE: Registration should have failed but succeeded.');
    } catch (e: any) {
        if (e.message && (e.message.includes('est obligatoire') || e.message.includes('required'))) {
            console.log('SUCCESS: Registration failed as expected with message:', e.message);
        } else {
            console.error('FAILURE: Registration failed but with unexpected error:', e.message);
            console.error(e);
        }
    }

    // 3. Attempt registration WITH field
    console.log('--- TEST 2: Attempting registration WITH required field ---');
    try {
        const vendor = await vendorService.create(ctx, {
            name: 'Test Vendor Success',
            email: `test-success-${Date.now()}@test.com`,
            phoneNumber: '12345678',
            dynamicDetails: {
                testRequiredField: 'Some value'
            }
        });
        console.log('SUCCESS: Registration succeeded. New Vendor ID:', vendor.id);
    } catch (e: any) {
        console.error('FAILURE: Registration should have succeeded but failed:', e.message);
        console.error(e);
    }

    // Cleanup
    if (testField) {
        await fieldRepo.remove(testField);
        console.log('Cleaned up test field');
    }

    process.exit(0);
})();
