import { bootstrap } from '@vendure/core';
import { config } from './vendure-config';
import { NotificationsService } from './plugins/notifications/notifications.service';
import { RequestContext } from '@vendure/core';

async function run() {
    console.log('Bootstrapping Vendure context for testing...');
    config.apiOptions.port = 3099;
    const app = await bootstrap(config);
    console.log('Bootstrapped successfully. Fetching NotificationsService...');
    const notificationsService = app.get(NotificationsService);
    
    // Create a mock RequestContext
    const ctx = RequestContext.empty();
    
    const userId = '11';
    const payload = {
        userId,
        eventType: 'TEST_MANUAL',
        title: 'Ahizan Push Test ' + new Date().toLocaleTimeString(),
        body: 'Ceci est un test de notification push envoyé depuis le serveur.',
        channels: ['PUSH'] as any[],
        actionUrl: 'https://ahizan.com/account/messages',
    };
    
    console.log(`Sending web push to user ${userId}...`);
    try {
        await (notificationsService as any).sendWebPush(ctx, payload);
        console.log('Web push operation finished successfully.');
    } catch (e: any) {
        console.error('Web push failed with error:', e);
    }
    
    await app.close();
    process.exit(0);
}

run().catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
});
