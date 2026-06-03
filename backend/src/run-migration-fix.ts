import { runMigrations } from '@vendure/core';
import { config } from './vendure-config';

console.log('Running JSON column fix migration...');
runMigrations(config)
    .then(() => {
        console.log('Migration completed successfully');
        process.exit(0);
    })
    .catch(err => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
