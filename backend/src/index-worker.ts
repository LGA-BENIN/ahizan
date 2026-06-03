import { bootstrapWorker } from '@vendure/core';
import { DataSource } from 'typeorm';
import { config, emailSenderNode } from './vendure-config';

// Apply TypeORM JSON patch to handle corrupted data gracefully
import './typeorm-patch';

bootstrapWorker(config)
    .then(worker => {
        const dataSource = worker.app.get(DataSource);
        emailSenderNode.setDataSource(dataSource);
        return worker.startJobQueue();
    })
    .catch(err => {
        console.log(err);
    });
