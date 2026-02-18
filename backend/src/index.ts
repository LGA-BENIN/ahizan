import { bootstrap, runMigrations } from '@vendure/core';
import { config } from './vendure-config';

console.log('Starting migrations...');
runMigrations(config)
    .then(() => bootstrap(config))
    .catch(err => {
        console.log(err);
    });
// Trigger restart
