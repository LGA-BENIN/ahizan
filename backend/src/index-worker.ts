import { bootstrapWorker } from '@vendure/core';
import { DataSource } from 'typeorm';
import { config, emailSenderNode } from './vendure-config';

// Apply TypeORM JSON patch to handle corrupted data gracefully
import './typeorm-patch';

let workerInstance: any = null;

bootstrapWorker(config)
    .then(worker => {
        workerInstance = worker;
        const dataSource = worker.app.get(DataSource);
        emailSenderNode.setDataSource(dataSource);
        return worker.startJobQueue();
    })
    .catch(err => {
        console.log(err);
        process.exit(1);
    });

// Graceful shutdown helper
async function gracefulShutdown(signal: string) {
    console.log(`Worker received signal ${signal}. Shutting down gracefully...`);
    if (workerInstance) {
        try {
            await workerInstance.close();
            console.log('Vendure worker closed successfully.');
        } catch (err) {
            console.error('Error during Vendure worker close:', err);
        }
    }
    process.exit(0);
}

process.once('SIGUSR2', () => gracefulShutdown('SIGUSR2'));
process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
