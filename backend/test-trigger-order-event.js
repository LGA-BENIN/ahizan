const { bootstrap, RequestContext, ChannelService, OrderService, Order } = require('@vendure/core');
const { config } = require('./dist/vendure-config');

async function run() {
    console.log('Bootstrapping Vendure context...');
    const app = await bootstrap(config);
    const connection = app.get('TransactionalConnection');
    const orderService = app.get(OrderService);

    // Get order ID 93
    const orderRepo = connection.rawConnection.getRepository(Order);
    const order = await orderRepo.findOne({ where: { id: 93 }, relations: ['lines', 'lines.productVariant'] });

    if (!order) {
        console.error('Order 93 not found');
        process.exit(1);
    }

    console.log('Found Order 93:', order.code, 'State:', order.state);

    // Create a RequestContext
    const channelService = app.get(ChannelService);
    const defaultChannel = await channelService.getDefaultChannel();
    const ctx = new RequestContext({
        apiType: 'admin',
        isAuthorized: true,
        authorizedAsOwnerOnly: false,
        channel: defaultChannel,
        languageCode: defaultChannel.defaultLanguageCode,
    });

    console.log('Transitioning Order 93 to PaymentSettled...');
    await orderService.transitionToState(ctx, order.id, 'PaymentSettled');
    console.log('Transition complete!');

    setTimeout(async () => {
        const logs = await connection.rawConnection.query(`
            SELECT id, "createdAt", "userId", "eventType", title, body 
            FROM notification_log 
            WHERE id > 122 
            ORDER BY id ASC;
        `);
        console.log('\n--- NOTIFICATION LOG ENTRIES GENERATED ---');
        console.table(logs);
        process.exit(0);
    }, 2000);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
