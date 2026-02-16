import { bootstrap, User, TransactionalConnection } from '@vendure/core';
import { config } from './src/vendure-config';

// Override port to avoid conflict with running server
config.apiOptions.port = 3002;
// Disable plugins that might start servers or workers if possible, or just ignore
// Actually, just changing port is enough for bootstrap() to work in parallel

async function verifyAllUsers() {
    console.log('Bootstrapping Vendure (Verification Tool)...');
    const app = await bootstrap(config);
    const connection = app.get(TransactionalConnection);

    console.log('Verifying all users...');

    // Update all users to verified = true
    await connection.getRepository(User).update({}, { verified: true });

    console.log('All users have been set to verified: true');

    // List users to confirm
    const users = await connection.getRepository(User).find();
    console.log(`Found ${users.length} users:`);
    users.forEach(u => console.log(`- ${u.identifier} (verified: ${u.verified})`));

    process.exit(0);
}

verifyAllUsers().catch(err => {
    console.error(err);
    process.exit(1);
});
