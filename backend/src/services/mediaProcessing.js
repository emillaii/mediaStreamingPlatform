import { listActiveMediaWorkers, getMediaWorkerById } from '../data/mediaWorkersStore.js';

const DEFAULT_PROCESSING_BASE_URL =
  process.env.MEDIA_PROCESSING_URL?.replace(/\/$/, '') || 'http://localhost:3001';

const normalizePath = (path) => (path.startsWith('/') ? path : `/${path}`);

const buildProcessorUrl = (baseUrl, path) => `${baseUrl}${normalizePath(path)}`;

const fallbackWorker = () => ({
  id: null,
  name: 'Default Worker',
  baseUrl: DEFAULT_PROCESSING_BASE_URL,
  isActive: true,
  concurrency: 1
});

let roundRobinIndex = 0;

const selectActiveWorker = async () => {
  const workers = await listActiveMediaWorkers();

  if (workers.length === 0) {
    const error = new Error('No registered media worker');
    error.code = 'NO_MEDIA_WORKER';
    error.status = 503;
    throw error;
  }

  if (roundRobinIndex >= workers.length) {
    roundRobinIndex = 0;
  }

  const worker = workers[roundRobinIndex];
  roundRobinIndex = (roundRobinIndex + 1) % workers.length;
  return worker;
};

const resolveWorkerById = async (workerId) => {
  if (!workerId) {
    if (!DEFAULT_PROCESSING_BASE_URL) {
      return null;
    }
    return fallbackWorker();
  }

  return getMediaWorkerById(workerId);
};

const parseProcessorResponse = async (response) => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  return text ? { message: text } : {};
};

export const enqueueProcessorJob = async (ref) => {
  const worker = await selectActiveWorker();

  const response = await fetch(buildProcessorUrl(worker.baseUrl, '/media/download'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref })
  });

  const payload = await parseProcessorResponse(response);

  if (!response.ok) {
    const error = new Error(payload?.error || payload?.message || 'Failed to enqueue media processing job');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return { worker, payload };
};

export const getProcessorJobStatus = async (processorWorkerId, processorJobId) => {
  const worker = await resolveWorkerById(processorWorkerId);

  if (!worker) {
    const error = new Error('Processor worker not found');
    error.status = 404;
    throw error;
  }

  const response = await fetch(
    buildProcessorUrl(worker.baseUrl, `/media/download/${encodeURIComponent(processorJobId)}/status`)
  );

  if (response.status === 404) {
    const error = new Error('Processor job not found');
    error.status = 404;
    throw error;
  }

  const payload = await parseProcessorResponse(response);

  if (!response.ok) {
    const error = new Error(payload?.error || payload?.message || 'Failed to fetch processor job status');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};
