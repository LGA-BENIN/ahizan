const { bootstrap } = require('@vendure/core');
const { config } = require('./dist/vendure-config.js');

async function run() {
    config.apiOptions.port = 3005;
    const app = await bootstrap(config);
    const collectionService = app.get(require('@vendure/core').CollectionService);
    const requestContextService = app.get(require('@vendure/core').RequestContextService);
    
    const ctx = await requestContextService.create({ apiType: 'admin' });
    
    // Trigger the apply collection filters job for collection 2
    console.log("Triggering apply collection filters job for Collection 2...");
    
    // We will do applyCollectionFiltersInternal manually to avoid job queue issues if the worker isn't running
    const collection = await collectionService.findOne(ctx, 2);
    await collectionService.applyCollectionFiltersInternal(collection);
    console.log("Done applyCollectionFiltersInternal.");
    
    // Then re-index
    const searchPlugin = app.get(require('@vendure/core').JobQueueService);
    console.log("Job queue service fetched.");
    
    process.exit(0);
}
run().catch(err => {
    console.error(err);
    process.exit(1);
});
