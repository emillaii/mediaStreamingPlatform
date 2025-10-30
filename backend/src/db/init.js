import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCHEMA_PATH = path.resolve(__dirname, '../../db/schema.sql');

export const initializeDatabase = async () => {
  try {
    const schemaSql = await fs.readFile(SCHEMA_PATH, 'utf-8');
    const trimmed = schemaSql.trim();

    if (!trimmed) {
      console.warn('Database schema file is empty, skipping initialization.');
      return;
    }

    await pool.query(trimmed);
    console.log('Database schema initialized from schema.sql');
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    throw error;
  }
};
