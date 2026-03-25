import { bootstrap } from '@vendure/core';
import { config } from './src/vendure-config';
import { RegistrationField } from './src/plugins/page-inscription/entities/registration-field.entity';

(async () => {
    const app = await bootstrap(config);
    const connection = app.getService('TransactionalConnection');
    const repo = connection.rawConnection.getRepository(RegistrationField);

    const fields = await repo.find();
    console.log('--- Registration Fields in DB ---');
    fields.forEach(f => {
        console.log(`[${f.id}] ${f.name} (Label: ${f.label}) - Enabled: ${f.enabled}`);
    });
    console.log('---------------------------------');

    await app.close();
    process.exit(0);
})();
