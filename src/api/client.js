import { API_URL } from '../config.js';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function send(path, { method = 'GET', body, signal } = {}) {
  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      signal,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', `No se pudo conectar con el backend en ${API_URL}. Comprueba que esté en marcha.`);
  }
}

/** Devuelve `{ data, meta }`, o lanza ApiError con el formato de error del contrato. */
async function request(path, options) {
  const response = await send(path, options);
  if (response.status === 204) return { data: null };

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    const { code = 'UNEXPECTED_RESPONSE', message = 'El servidor devolvió una respuesta inesperada.', details } = payload?.error ?? {};
    throw new ApiError(response.status, code, message, details);
  }
  return payload;
}

const dataOf = async (promise) => (await promise).data;

export const loadTests = {
  start: (config) => dataOf(request('/api/v1/load-tests', { method: 'POST', body: config })),
  list: ({ limit = 20, offset = 0, signal } = {}) => request(`/api/v1/load-tests?limit=${limit}&offset=${offset}`, { signal }),
  get: (id, { signal } = {}) => dataOf(request(`/api/v1/load-tests/${id}`, { signal })),
  stop: (id) => dataOf(request(`/api/v1/load-tests/${id}/stop`, { method: 'POST' })),
  remove: (id) => dataOf(request(`/api/v1/load-tests/${id}`, { method: 'DELETE' })),
  compare: (baseline, candidate, { signal } = {}) =>
    dataOf(request(`/api/v1/load-tests/compare?baseline=${baseline}&candidate=${candidate}`, { signal })),
  reportUrl: (id, format) => `${API_URL}/api/v1/load-tests/${id}/report?format=${format}`,
};

export const targets = {
  list: ({ signal } = {}) => dataOf(request('/api/v1/targets', { signal })),
  register: (hostname) => dataOf(request('/api/v1/targets', { method: 'POST', body: { hostname } })),
  verify: (id, method) => dataOf(request(`/api/v1/targets/${id}/verify`, { method: 'POST', body: { method } })),
  remove: (id) => dataOf(request(`/api/v1/targets/${id}`, { method: 'DELETE' })),
};

export const system = {
  metrics: ({ signal } = {}) => dataOf(request('/api/v1/metrics', { signal })),
  /** /health no usa el formato común: responde 503 con su estado si la base de datos falla. */
  health: async ({ signal } = {}) => (await send('/health', { signal })).json(),
};

/** Vistas que renderiza el backend, cada una con su patrón de renderizado. */
export const views = {
  history: `${API_URL}/views/history`,
  report: (id) => `${API_URL}/views/reports/${id}`,
  compare: (baseline, candidate) => `${API_URL}/views/compare?baseline=${baseline}&candidate=${candidate}`,
};
