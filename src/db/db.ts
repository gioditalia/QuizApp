import knex from 'knex';
import knexConfig from './knexfile';

const environment = process.env.NODE_ENV || 'development';

console.log('🔧 Environment:', environment);
console.log('🔧 Database config:', JSON.stringify(knexConfig, null, 2));

const db = knex(knexConfig);

// Test connessione
db.raw('SELECT 1')
  .then(() => console.log('✅ Database connected successfully'))
  .catch(err => console.error('❌ Database connection failed:', err.message));

export default db;