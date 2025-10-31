import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';

const mapRowToProcessingJob = (row) => ({
  id: row.id,
  mediaItemId: row.media_item_id,
  ref: row.ref,
  status: row.status,
  progressMessage: row.progress_message,
  processorJobId: row.processor_job_id,
  processorWorkerId: row.processor_worker_id,
  error: row.error,
  priority: row.priority ?? 'normal',
  queuedBy: row.queued_by ?? null,
  result: row.result ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  startedAt: row.started_at,
  completedAt: row.completed_at,
  lastSyncedAt: row.last_synced_at,
  media: row.media_item_id
    ? {
        id: row.media_item_id,
        title: row.media_title ?? null,
        extension: row.media_extension ?? null,
        resourceId: row.media_resource_id ?? null
      }
    : null,
  worker: row.processor_worker_id
    ? {
        id: row.processor_worker_id,
        name: row.worker_name ?? null,
        baseUrl: row.worker_base_url ?? null,
        isActive: row.worker_is_active ?? null
      }
    : null
});

const selectJobWithMedia = `
  SELECT
    pj.*,
    mi.title AS media_title,
    mi.extension AS media_extension,
    mi.resource_id AS media_resource_id,
    mw.name AS worker_name,
    mw.base_url AS worker_base_url,
    mw.is_active AS worker_is_active
  FROM processing_jobs pj
  LEFT JOIN media_items mi ON mi.id = pj.media_item_id
  LEFT JOIN media_workers mw ON mw.id = pj.processor_worker_id
`;

export const createProcessingJob = async ({
  mediaItemId,
  ref,
  status,
  progressMessage,
  processorJobId,
  processorWorkerId,
  queuedBy,
  priority,
  result
}) => {
  const id = randomUUID();
  const values = [
    id,
    mediaItemId ?? null,
    ref,
    status ?? 'queued',
    progressMessage ?? null,
    processorJobId ?? null,
    processorWorkerId ?? null,
    queuedBy ?? null,
    priority ?? 'normal',
    result ?? null
  ];

  await pool.query(
    `
      INSERT INTO processing_jobs (
        id,
        media_item_id,
        ref,
        status,
        progress_message,
        processor_job_id,
        processor_worker_id,
        queued_by,
        priority,
        result,
        created_at,
        updated_at,
        last_synced_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), NOW())
    `,
    values
  );

  return getProcessingJobById(id);
};

const buildUpdateStatement = (updates = {}) => {
  const columns = [];
  const values = [];
  let index = 1;

  const map = {
    status: 'status',
    progressMessage: 'progress_message',
    processorJobId: 'processor_job_id',
    processorWorkerId: 'processor_worker_id',
    error: 'error',
    priority: 'priority',
    queuedBy: 'queued_by',
    result: 'result',
    startedAt: 'started_at',
    completedAt: 'completed_at',
    lastSyncedAt: 'last_synced_at'
  };

  Object.entries(updates).forEach(([key, value]) => {
    if (!(key in map) || value === undefined) {
      return;
    }

    const column = map[key];
    columns.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  });

  return { columns, values };
};

export const updateProcessingJob = async (id, updates = {}) => {
  const { columns, values } = buildUpdateStatement(updates);

  if (columns.length === 0) {
    return getProcessingJobById(id);
  }

  const query = `
    UPDATE processing_jobs
    SET ${columns.join(', ')}, updated_at = NOW()
    WHERE id = $${values.length + 1}
    RETURNING id
  `;

  await pool.query(query, [...values, id]);
  return getProcessingJobById(id);
};

export const getProcessingJobById = async (id) => {
  const result = await pool.query(`${selectJobWithMedia} WHERE pj.id = $1`, [id]);

  if (result.rowCount === 0) {
    return null;
  }

  return mapRowToProcessingJob(result.rows[0]);
};

export const getProcessingJobByProcessorId = async (processorJobId) => {
  const result = await pool.query(`${selectJobWithMedia} WHERE pj.processor_job_id = $1`, [processorJobId]);
  if (result.rowCount === 0) {
    return null;
  }

  return mapRowToProcessingJob(result.rows[0]);
};

export const listProcessingJobs = async () => {
  const result = await pool.query(`${selectJobWithMedia} ORDER BY pj.created_at DESC`);
  return result.rows.map(mapRowToProcessingJob);
};

export const listProcessingJobsPaginated = async ({ limit, offset }) => {
  const result = await pool.query(
    `${selectJobWithMedia} ORDER BY pj.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows.map(mapRowToProcessingJob);
};

export const countProcessingJobs = async () => {
  const result = await pool.query('SELECT COUNT(*)::BIGINT AS total FROM processing_jobs');
  if (result.rowCount === 0) {
    return 0;
  }
  return Number(result.rows[0].total ?? 0);
};

export const summarizeProcessingJobsByStatus = async () => {
  const result = await pool.query(
    `
      SELECT status, COUNT(*)::BIGINT AS total
      FROM processing_jobs
      GROUP BY status
    `
  );

  const summary = {};

  result.rows.forEach((row) => {
    const key = `${row.status ?? ''}`.toLowerCase();
    summary[key] = Number(row.total ?? 0);
  });

  return summary;
};

export const getLatestProcessingJobByRef = async (ref) => {
  const normalizedRef = `${ref ?? ''}`.trim();

  if (!normalizedRef) {
    return null;
  }

  const result = await pool.query(
    `${selectJobWithMedia} WHERE pj.ref = $1 ORDER BY pj.updated_at DESC LIMIT 1`,
    [normalizedRef]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapRowToProcessingJob(result.rows[0]);
};
