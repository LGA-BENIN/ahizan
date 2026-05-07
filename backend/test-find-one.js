const { bootstrap } = require('@vendure/core');
const config = require('./src/vendure-config').config;

async function check() {
    const app = await bootstrap(config);
    const productService = app.get('ProductService');
    const requestContextService = app.get('RequestContextService');
    
    // We need a dummy context for the default channel
    const ctx = await requestContextService.create({
        apiType: 'admin'
    });
    
    console.log("Channel ID from context:", ctx.channel.id);
    
    const product = await productService.findOne(ctx, "147"); // LATEST PRODUCT ID
    console.log("Product from ProductService.findOne:", product ? product.name : "NULL");

    const rawProduct = await app.get('TransactionalConnection').getRepository(ctx, 'Product').findOne({
        where: { id: "147" },
        relations: ['channels']
    });
    console.log("Product from DB:", rawProduct ? rawProduct.name : "NULL");
    if (rawProduct) {
        console.log("Channels:", rawProduct.channels.map(c => c.id));
    }
    
    process.exit(0);
}

check().catch(console.error);
