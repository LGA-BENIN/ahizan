import { config } from './vendure-config';

console.log('--------------------------------------------------');
console.log('Resolved Database Configuration:');
console.log('Type:', config.dbConnectionOptions.type);
console.log('Host:', (config.dbConnectionOptions as any).host);
console.log('Database:', (config.dbConnectionOptions as any).database);
console.log('Port:', (config.dbConnectionOptions as any).port);
console.log('--------------------------------------------------');
