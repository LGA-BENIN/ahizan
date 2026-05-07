const { bootstrap } = require('@vendure/core');
const config = require('./src/vendure-config').config;

async function run() {
    const app = await bootstrap(config);
    const collectionService = app.get('CollectionService');
    console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(collectionService)));
    process.exit(0);
}
run();
