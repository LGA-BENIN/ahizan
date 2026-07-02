import { bootstrap, bootstrapWorker, runMigrations } from '@vendure/core';
import { DataSource } from 'typeorm';
import { config, emailSenderNode } from './vendure-config';

// Apply TypeORM JSON patch to handle corrupted data gracefully
import './typeorm-patch';

let appInstance: any = null;
let workerInstance: any = null;

console.log('Starting migrations...');
runMigrations(config)
    .then(() => bootstrap(config))
    .then(async (app) => {
        appInstance = app;
        // Inject TypeORM connection into our dynamic email sender
        const dataSource = app.get(DataSource);
        emailSenderNode.setDataSource(dataSource);
        console.log('Dynamic Email Sender successfully hooked into DB.');

        // Start job queue processing inside the main server process so verification emails are sent immediately
        try {
            const worker = await bootstrapWorker(config);
            workerInstance = worker;
            await worker.startJobQueue();
            console.log('Vendure Job Queue Worker started successfully.');
        } catch (workerErr) {
            console.error('Error starting Vendure Job Queue Worker:', workerErr);
        }
    })
    .catch(err => {
        console.log(err);
        process.exit(1);
    });

// Graceful shutdown helper
async function gracefulShutdown(signal: string) {
    console.log(`Received signal ${signal}. Shutting down gracefully...`);
    if (workerInstance) {
        try {
            await workerInstance.close();
            console.log('Vendure worker closed successfully.');
        } catch (err) {
            console.error('Error during Vendure worker close:', err);
        }
    }
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
