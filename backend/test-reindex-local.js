const { bootstrap } = require('@vendure/core');
const { config } = require('./dist/vendure-config.js');

async function run() {
    config.apiOptions.port = 3006; // Avoid EADDRINUSE
    const app = await bootstrap(config);
    const searchPlugin = app.get(require('@vendure/core').JobQueueService);
    
    const requestContextService = app.get(require('@vendure/core').RequestContextService);
    const ctx = await requestContextService.create({ apiType: 'admin' });
    
    // Vendure search plugin registers a JobQueue to reindex
    // But since it might be easier, let's just trigger it via the service
    // DefaultSearchPlugin injects SearchService
    // Let's try to get SearchService
    let searchService;
    try {
        const searchModule = require('@vendure/core/dist/plugin/default-search-plugin/search.service');
        if (searchModule && searchModule.SearchService) {
             searchService = app.get(searchModule.SearchService);
        }
    } catch(e) {}
    
    if (searchService) {
        console.log("Triggering reindex...");
        await searchService.reindex(ctx);
        console.log("Reindex complete.");
    } else {
        console.log("Could not find SearchService.");
    }
    
    process.exit(0);
}
run().catch(err => {
    console.error(err);
    process.exit(1);
});
