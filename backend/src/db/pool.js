import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const {
  DATABASE_URL,
  DB_HOST = 'localhost',
  DB_PORT = 5432,
  DB_NAME,
  DB_USER,
  DB_PASSWORD
} = process.env;

let poolConfig;

if (DATABASE_URL) {
  poolConfig = {
    connectionString: DATABASE_URL
  };
} else {
  poolConfig = {
    host: DB_HOST,
    port: Number(DB_PORT),
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD
  };
}

export const pool = new Pool(poolConfig);

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL client error', error);
});

pool.on('connect', () => {
  if (DATABASE_URL) {
    console.log('PostgreSQL pool established using DATABASE_URL');
  } else {
    console.log('PostgreSQL pool established', {
      host: poolConfig.host,
      port: poolConfig.port,
      database: poolConfig.database,
      user: poolConfig.user
    });
  }
});

export const verifyConnection = async () => {
  const client = await pool.connect();

  try {
    await client.query('SELECT 1');
    console.log('PostgreSQL connection verified');
  } finally {
    client.release();
  }
};
