import { initializeDatabase } from '../src/db/init.js';
import { verifyConnection, pool } from '../src/db/pool.js';

const run = async () => {
  try {
    await verifyConnection();
    await initializeDatabase();
    console.log('Database initialization completed successfully.');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

run();
