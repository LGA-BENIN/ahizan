import { bootstrap, runMigrations } from '@vendure/core';
import { DataSource } from 'typeorm';
import { config, emailSenderNode } from './vendure-config';

// Apply TypeORM JSON patch to handle corrupted data gracefully
import './typeorm-patch';

console.log('Starting migrations...');
runMigrations(config)
    .then(() => bootstrap(config))
    .then((app) => {
        // Inject TypeORM connection into our dynamic email sender
        const dataSource = app.get(DataSource);
        emailSenderNode.setDataSource(dataSource);
        console.log('Dynamic Email Sender successfully hooked into DB.');
    })
    .catch(err => {
        console.log(err);
    });
