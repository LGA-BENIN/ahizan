const { bootstrap } = require('@vendure/core');
const { config } = require('./dist/vendure-config.js');
const { ProductVariant } = require('@vendure/core/dist/entity/product-variant/product-variant.entity.js');

async function run() {
    const app = await bootstrap(config);
    const connection = app.get('TransactionalConnection');
    const variantRepo = connection.getRepository(ProductVariant);
    
    // Find one variant with its collections
    const variant = await variantRepo.findOne({
        where: {},
        relations: ['collections']
    });
    
    console.log("Variant name:", variant.name);
    console.log("Variant collections:", variant.collections.map(c => c.id));
    process.exit(0);
}
run().catch(err => {
    console.error(err);
    process.exit(1);
});
