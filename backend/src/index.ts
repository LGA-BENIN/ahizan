import { bootstrap, runMigrations } from '@vendure/core';
import { DataSource } from 'typeorm';
import { fork, ChildProcess } from 'child_process';
import path from 'path';
import { config, emailSenderNode } from './vendure-config';

// Apply TypeORM JSON patch to handle corrupted data gracefully
import './typeorm-patch';

let appInstance: any = null;
let workerProcess: ChildProcess | null = null;

console.log('Starting migrations...');
runMigrations(config)
    .then(() => bootstrap(config))
    .then(async (app) => {
        appInstance = app;
        // Inject TypeORM connection into our dynamic email sender
        const dataSource = app.get(DataSource);
        emailSenderNode.setDataSource(dataSource);
        console.log('Dynamic Email Sender successfully hooked into DB.');

        // Démarrage du worker (JobQueue) dans un processus enfant distinct pour éviter les conflits Croner/Scheduler
        const workerPath = path.join(__dirname, 'index-worker.js');
        workerProcess = fork(workerPath, [], {
            env: process.env,
        });
        workerProcess.on('exit', (code) => {
            console.log(`Vendure JobQueue Worker exited with code ${code}`);
        });
        console.log(`Vendure JobQueue Worker spawned as child process (pid: ${workerProcess.pid}).`);
    })
    .catch(err => {
        console.log(err);
        process.exit(1);
    });

// Graceful shutdown helper
async function gracefulShutdown(signal: string) {
    console.log(`Received signal ${signal}. Shutting down gracefully...`);
    if (workerProcess) {
        try {
            workerProcess.kill(signal as any);
            console.log('Vendure worker process terminated.');
        } catch (err) {
            console.error('Error terminating Vendure worker process:', err);
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
