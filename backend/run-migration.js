const { runMigrations } = require('@vendure/core');
const path = require('path');

// Load the config
const configPath = path.join(__dirname, 'src', 'vendure-config.ts');
const config = require(configPath).config;

console.log('Running migrations...');
runMigrations(config)
    .then(() => {
        console.log('Migrations completed successfully');
        process.exit(0);
    })
    .catch(err => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
