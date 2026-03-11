import { bootstrapWorker } from '@vendure/core';
import { DataSource } from 'typeorm';
import { config, emailSenderNode } from './vendure-config';

bootstrapWorker(config)
    .then(worker => {
        const dataSource = worker.app.get(DataSource);
        emailSenderNode.setDataSource(dataSource);
        return worker.startJobQueue();
    })
    .catch(err => {
        console.log(err);
    });
