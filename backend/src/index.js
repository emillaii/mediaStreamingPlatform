import dotenv from 'dotenv';
import app from './app.js';
import { verifyConnection } from './db/pool.js';
import { initializeDatabase } from './db/init.js';

dotenv.config();

const port = Number(process.env.PORT ?? 4000);

const start = async () => {
  try {
    await verifyConnection();
    await initializeDatabase();
  } catch (error) {
    console.error('Backend startup failed during database initialization:', error);
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`Backend service listening on port ${port}`);
  });
};

start();
