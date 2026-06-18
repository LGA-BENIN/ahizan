import { bootstrap, runMigrations } from '@vendure/core';
import { DataSource } from 'typeorm';
import { config, emailSenderNode } from './vendure-config';

// Apply TypeORM JSON patch to handle corrupted data gracefully
import './typeorm-patch';

let appInstance: any = null;

console.log('Starting migrations...');
runMigrations(config)
    .then(() => bootstrap(config))
    .then((app) => {
        appInstance = app;
        // Inject TypeORM connection into our dynamic email sender
        const dataSource = app.get(DataSource);
        emailSenderNode.setDataSource(dataSource);
        console.log('Dynamic Email Sender successfully hooked into DB.');
    })
    .catch(err => {
        console.log(err);
        process.exit(1);
    });

// Graceful shutdown helper
async function gracefulShutdown(signal: string) {
    console.log(`Received signal ${signal}. Shutting down gracefully...`);
    if (appInstance) {
        try {
            await appInstance.close();
            console.log('Vendure application closed successfully.');
        } catch (err) {
            console.error('Error during Vendure application close:', err);
        }
    }
    process.exit(0);
}

process.once('SIGUSR2', () => gracefulShutdown('SIGUSR2'));
process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
