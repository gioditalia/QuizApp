import dotenv from 'dotenv';
dotenv.config();

export default {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
        sslmode: 'require'
      }
    },
    migrations: {
      directory: './migrations'
    }
  };