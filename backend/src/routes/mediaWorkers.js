import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listMediaWorkers,
  createMediaWorker,
  getMediaWorkerById,
  updateMediaWorker,
  deleteMediaWorker
} from '../data/mediaWorkersStore.js';
import { fetchWorkerRuntimeState, applyWorkerConcurrency } from '../services/mediaWorkers.js';

const router = express.Router();

const parseBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }

  return null;
};

const parseConcurrency = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed < 1) {
    return null;
  }

  return Math.floor(parsed);
};

const includeRuntime = async (worker, opts = {}) => {
  const runtime = worker.isActive
    ? await fetchWorkerRuntimeState(worker)
    : {
        healthStatus: 'inactive',
        healthPayload: null,
        config: null,
        error: null,
        checkedAt: new Date().toISOString()
      };

  if (opts.error) {
    runtime.error = opts.error;
  }

  return {
    ...worker,
    runtime
  };
};

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const workers = await listMediaWorkers();
    const withRuntime = await Promise.all(workers.map((worker) => includeRuntime(worker)));

    res.status(200).json({
      workers: withRuntime,
      count: withRuntime.length
    });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, baseUrl, isActive, concurrency } = req.body ?? {};

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'name is required' });
    }

    if (!baseUrl || typeof baseUrl !== 'string' || baseUrl.trim() === '') {
      return res.status(400).json({ error: 'baseUrl is required' });
    }

    const parsedConcurrency = parseConcurrency(concurrency ?? 1);
    if (parsedConcurrency === null) {
      return res.status(400).json({ error: 'concurrency must be a positive number' });
    }

    const parsedActive = isActive === undefined ? true : parseBoolean(isActive);
    if (parsedActive === null) {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    const worker = await createMediaWorker({
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      isActive: parsedActive,
      concurrency: parsedConcurrency ?? 1
    });

    let concurrencyError = null;
    if (worker.isActive) {
      try {
        await applyWorkerConcurrency(worker, worker.concurrency);
      } catch (error) {
        concurrencyError = error.message;
      }
    }

    const responseWorker = await includeRuntime(worker, { error: concurrencyError });

    res.status(201).json({
      worker: responseWorker
    });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const worker = await getMediaWorkerById(id);

    if (!worker) {
      return res.status(404).json({ error: 'Media worker not found' });
    }

    const responseWorker = await includeRuntime(worker);
    res.status(200).json({ worker: responseWorker });
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existingWorker = await getMediaWorkerById(id);

    if (!existingWorker) {
      return res.status(404).json({ error: 'Media worker not found' });
    }

    const updates = {};
    const { name, baseUrl, isActive, concurrency } = req.body ?? {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'name must be a non-empty string' });
      }
      updates.name = name.trim();
    }

    if (baseUrl !== undefined) {
      if (typeof baseUrl !== 'string' || baseUrl.trim() === '') {
        return res.status(400).json({ error: 'baseUrl must be a non-empty string' });
      }
      updates.baseUrl = baseUrl.trim();
    }

    if (isActive !== undefined) {
      const parsedActive = parseBoolean(isActive);
      if (parsedActive === null) {
        return res.status(400).json({ error: 'isActive must be a boolean' });
      }
      updates.isActive = parsedActive;
    }

    if (concurrency !== undefined) {
      const parsedConcurrency = parseConcurrency(concurrency);
      if (parsedConcurrency === null) {
        return res.status(400).json({ error: 'concurrency must be a positive number' });
      }
      updates.concurrency = parsedConcurrency;
    }

    const updatedWorker = await updateMediaWorker(id, updates);

    let concurrencyError = null;
    const shouldSyncConcurrency =
      updatedWorker.isActive && (updates.concurrency !== undefined || updates.baseUrl !== undefined);

    if (shouldSyncConcurrency) {
      try {
        await applyWorkerConcurrency(updatedWorker, updatedWorker.concurrency);
      } catch (error) {
        concurrencyError = error.message;
      }
    }

    const responseWorker = await includeRuntime(updatedWorker, { error: concurrencyError });

    res.status(200).json({
      worker: responseWorker
    });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const worker = await getMediaWorkerById(id);

    if (!worker) {
      return res.status(404).json({ error: 'Media worker not found' });
    }

    await deleteMediaWorker(id);
    res.status(204).send();
  })
);

export default router;
