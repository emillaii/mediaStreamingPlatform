const normalizePath = (path) => (path.startsWith('/') ? path : `/${path}`);

const buildWorkerUrl = (baseUrl, path) => `${baseUrl}${normalizePath(path)}`;

const parseJson = async (response) => {
  const contentType = response.headers?.get?.('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

export const fetchWorkerRuntimeState = async (worker) => {
  const summary = {
    healthStatus: 'unknown',
    healthPayload: null,
    config: null,
    error: null,
    checkedAt: new Date().toISOString()
  };

  try {
    const healthResponse = await fetch(buildWorkerUrl(worker.baseUrl, '/health'), {
      method: 'GET'
    });

    const healthPayload = await parseJson(healthResponse);
    summary.healthPayload = healthPayload;
    summary.healthStatus = healthResponse.ok ? 'ok' : 'error';

    try {
      const configResponse = await fetch(buildWorkerUrl(worker.baseUrl, '/config'), {
        method: 'GET'
      });
      const configPayload = await parseJson(configResponse);
      if (configResponse.ok) {
        summary.config = configPayload;
      } else {
        summary.error = configPayload?.error || configPayload?.message || 'Failed to load worker config';
      }
    } catch (configError) {
      summary.error = configError.message;
    }
  } catch (error) {
    summary.healthStatus = 'unreachable';
    summary.error = error.message;
  }

  return summary;
};

export const applyWorkerConcurrency = async (worker, concurrency) => {
  const parsedConcurrency = Number(concurrency);
  if (!Number.isFinite(parsedConcurrency) || Number.isNaN(parsedConcurrency) || parsedConcurrency < 1) {
    const error = new Error('Concurrency must be a positive number.');
    error.status = 400;
    throw error;
  }

  const response = await fetch(buildWorkerUrl(worker.baseUrl, '/config'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ concurrency: Math.floor(parsedConcurrency) })
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    const error = new Error(payload?.error || payload?.message || 'Failed to update worker configuration');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};
