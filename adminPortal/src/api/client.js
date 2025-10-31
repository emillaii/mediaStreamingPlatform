const DEFAULT_BASE_URL = 'http://localhost:4000';

const getBaseUrl = () => {
  const envUrl = import.meta.env?.VITE_BACKEND_URL;
  return envUrl?.replace(/\/$/, '') || DEFAULT_BASE_URL;
};

const parseJsonResponse = async (response) => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : {};
};

const handleResponse = async (response) => {
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    const message = payload?.error || payload?.message || 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

export const loginSuperAdmin = async ({ email, password }) => {
  const response = await fetch(`${getBaseUrl()}/auth/super-admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  return handleResponse(response);
};

export const fetchUsers = async () => {
  const response = await fetch(`${getBaseUrl()}/users`);
  return handleResponse(response);
};

export const createUser = async (user) => {
  const response = await fetch(`${getBaseUrl()}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });

  return handleResponse(response);
};

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    const trimmedValue = typeof value === 'string' ? value.trim() : value;

    if (typeof trimmedValue === 'string' && trimmedValue.length === 0) {
      return;
    }

    searchParams.set(key, trimmedValue);
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

export const fetchMediaLibrary = async (params = {}) => {
  const queryString = buildQueryString({
    search: params.search,
    page: params.page,
    pageSize: params.pageSize
  });

  const response = await fetch(`${getBaseUrl()}/media${queryString}`);
  return handleResponse(response);
};

export const importMediaMetadata = async (items) => {
  const payload = Array.isArray(items) ? items : items?.items ?? items?.media;

  if (!Array.isArray(payload)) {
    throw new Error('Media upload payload must be an array of metadata entries');
  }

  const response = await fetch(`${getBaseUrl()}/media/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return handleResponse(response);
};

export const refreshMediaDownloadUrl = async (ref) => {
  const normalizedRef = `${ref ?? ''}`.trim();

  if (!normalizedRef) {
    throw new Error('A media reference ID is required.');
  }

  const encodedRef = encodeURIComponent(normalizedRef);
  const response = await fetch(`${getBaseUrl()}/media/${encodedRef}/download-url`);
  return handleResponse(response);
};

export const enqueueProcessingJob = async ({ mediaId, ref, priority, queuedBy } = {}) => {
  const payload = {};

  if (mediaId) {
    payload.mediaId = mediaId;
  }

  if (ref) {
    payload.ref = ref;
  }

  if (priority) {
    payload.priority = priority;
  }

  if (queuedBy) {
    payload.queuedBy = queuedBy;
  }

  const response = await fetch(`${getBaseUrl()}/processing/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return handleResponse(response);
};

export const fetchProcessingJobs = async (params = {}) => {
  const queryString = buildQueryString({
    page: params.page,
    pageSize: params.pageSize
  });

  const response = await fetch(`${getBaseUrl()}/processing/jobs${queryString}`);
  return handleResponse(response);
};

export const fetchProcessingJob = async (jobId) => {
  const response = await fetch(`${getBaseUrl()}/processing/jobs/${jobId}`);
  return handleResponse(response);
};

export const fetchMediaWorkers = async () => {
  const response = await fetch(`${getBaseUrl()}/media-workers`);
  return handleResponse(response);
};

export const createMediaWorker = async (worker) => {
  const response = await fetch(`${getBaseUrl()}/media-workers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(worker)
  });

  return handleResponse(response);
};

export const updateMediaWorker = async (workerId, updates) => {
  const response = await fetch(`${getBaseUrl()}/media-workers/${workerId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });

  return handleResponse(response);
};

export const deleteMediaWorker = async (workerId) => {
  const response = await fetch(`${getBaseUrl()}/media-workers/${workerId}`, {
    method: 'DELETE'
  });

  if (response.status === 204) {
    return { success: true };
  }

  return handleResponse(response);
};
