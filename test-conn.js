require('dotenv').config({ path: 'backend/.env' });
const { TransactionalConnection } = require('@vendure/core');
console.log("TransactionalConnection exists:", !!TransactionalConnection);
