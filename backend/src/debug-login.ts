import { bootstrap, RequestContext, User, NativeAuthenticationMethod, PasswordCipher, Channel } from '@vendure/core';
import { config } from './vendure-config';

async function debugLogin() {
    // Override port to avoid conflict with running server
    const debugConfig = {
        ...config,
        apiOptions: {
            ...config.apiOptions,
            port: 3002
        },
        // Disable plugins that might start servers or workers
        plugins: config.plugins?.filter(p => !['AssetServerPlugin', 'JobQueuePlugin'].includes(p.constructor.name))
    };

    console.log('Bootstrapping Vendure on port 3002...');
    const app = await bootstrap(debugConfig);
    console.log('Bootstrapped!');

    const ctx = await getSuperAdminContext(app);
    const email = 'eli111@gmail.com';
    const passwordCandidate = 'eli111@gmail.com'; // User said this is the password

    console.log(`\n--- Debugging User: ${email} ---`);

    const connection = app.get('TransactionalConnection');

    // 1. Find User
    const user = await connection.getRepository(ctx, User).findOne({
        where: { identifier: email },
        relations: ['authenticationMethods', 'roles', 'roles.channels']
    });

    if (!user) {
        console.error('ERROR: User not found in database!');
        await app.close();
        process.exit(1);
    }

    console.log('User found:', {
        id: user.id,
        identifier: user.identifier,
        verified: user.verified,
        deletedAt: user.deletedAt,
        roles: user.roles.map(r => r.code),
    });

    // 2. Check Auth Methods
    const authMethods = user.authenticationMethods;
    console.log(`User has ${authMethods.length} authentication methods.`);

    const nativeAuth = authMethods.find(m => m instanceof NativeAuthenticationMethod) as NativeAuthenticationMethod;

    if (!nativeAuth) {
        console.error('ERROR: No NativeAuthenticationMethod found for user!');
    } else {
        console.log('NativeAuthenticationMethod found:');
        console.log('  Identifier:', nativeAuth.identifier);
        console.log('  Hash:', nativeAuth.passwordHash?.substring(0, 20) + '...');

        // 3. Verify Password
        const passwordCipher = app.get(PasswordCipher);
        try {
            const isMatch = await passwordCipher.check(passwordCandidate, nativeAuth.passwordHash);
            console.log(`\nPassword Check for '${passwordCandidate}': ${isMatch ? 'PASSED ✅' : 'FAILED ❌'}`);

            if (!isMatch) {
                // Try hashing explicitly to see what it looks like
                const newHash = await passwordCipher.hash(passwordCandidate);
                console.log('  Hash of candidate:', newHash.substring(0, 20) + '...');
                console.log('  Stored hash:      ', nativeAuth.passwordHash?.substring(0, 20) + '...');
            }

        } catch (e) {
            console.error('Error checking password:', e);
        }
    }

    await app.close();
    process.exit(0);
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

debugLogin().catch(e => {
    console.error(e);
    process.exit(1);
});
