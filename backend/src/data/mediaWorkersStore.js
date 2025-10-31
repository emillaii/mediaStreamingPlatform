import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';

const mapRowToMediaWorker = (row) => ({
  id: row.id,
  name: row.name,
  baseUrl: row.base_url,
  isActive: row.is_active,
  concurrency: row.concurrency,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const listMediaWorkers = async () => {
  const result = await pool.query('SELECT * FROM media_workers ORDER BY created_at ASC');
  return result.rows.map(mapRowToMediaWorker);
};

export const listActiveMediaWorkers = async () => {
  const result = await pool.query('SELECT * FROM media_workers WHERE is_active = TRUE ORDER BY created_at ASC');
  return result.rows.map(mapRowToMediaWorker);
};

export const getMediaWorkerById = async (id) => {
  const result = await pool.query('SELECT * FROM media_workers WHERE id = $1', [id]);
  if (result.rowCount === 0) {
    return null;
  }
  return mapRowToMediaWorker(result.rows[0]);
};

export const createMediaWorker = async ({ name, baseUrl, isActive = true, concurrency = 1 }) => {
  const id = randomUUID();
  const normalizedUrl = `${baseUrl ?? ''}`.trim().replace(/\/+$/, '');

  const values = [id, name, normalizedUrl, isActive, concurrency];

  await pool.query(
    `
      INSERT INTO media_workers (
        id,
        name,
        base_url,
        is_active,
        concurrency,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    `,
    values
  );

  return getMediaWorkerById(id);
};

const buildUpdateStatement = (updates = {}) => {
  const columns = [];
  const values = [];
  let index = 1;

  const map = {
    name: 'name',
    baseUrl: 'base_url',
    isActive: 'is_active',
    concurrency: 'concurrency'
  };

  Object.entries(updates).forEach(([key, value]) => {
    if (!(key in map) || value === undefined) {
      return;
    }

    const column = map[key];
    const normalizedValue =
      column === 'base_url' && typeof value === 'string'
        ? value.trim().replace(/\/+$/, '')
        : value;

    columns.push(`${column} = $${index}`);
    values.push(normalizedValue);
    index += 1;
  });

  return { columns, values };
};

export const updateMediaWorker = async (id, updates = {}) => {
  const { columns, values } = buildUpdateStatement(updates);

  if (columns.length === 0) {
    return getMediaWorkerById(id);
  }

  await pool.query(
    `
      UPDATE media_workers
      SET ${columns.join(', ')}, updated_at = NOW()
      WHERE id = $${values.length + 1}
    `,
    [...values, id]
  );

  return getMediaWorkerById(id);
};

export const deleteMediaWorker = async (id) => {
  await pool.query('DELETE FROM media_workers WHERE id = $1', [id]);
};
