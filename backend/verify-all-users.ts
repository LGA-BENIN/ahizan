import { bootstrap, JobQueueService, TransactionalConnection, User } from '@vendure/core';
import { config } from './src/vendure-config';

// Script to manually verify all users (fix for development)
async function verifyAllUsers() {
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
