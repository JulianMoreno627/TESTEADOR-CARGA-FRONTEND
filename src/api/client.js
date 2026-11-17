import { API_URL } from '../config.js';
import { fetchWithWakeUp } from './wakeUp.js';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Operaciones que usa el frontend, con el mismo operationId del contrato OpenAPI
 * (contract/openapi.yaml). La prueba de contrato comprueba que cada una exista allí
 * con el mismo método y la misma ruta: si el backend cambia el contrato, falla aquí.
 */
export const OPERATIONS = {
  getHealth: { method: 'GET', path: '/health' },
  getServerMetrics: { method: 'GET', path: '/api/v1/metrics' },
  startLoadTest: { method: 'POST', path: '/api/v1/load-tests' },
  listLoadTests: { method: 'GET', path: '/api/v1/load-tests' },
  getLoadTest: { method: 'GET', path: '/api/v1/load-tests/{id}' },
  stopLoadTest: { method: 'POST', path: '/api/v1/load-tests/{id}/stop' },
  deleteLoadTest: { method: 'DELETE', path: '/api/v1/load-tests/{id}' },
  compareLoadTests: { method: 'GET', path: '/api/v1/load-tests/compare' },
  downloadReport: { method: 'GET', path: '/api/v1/load-tests/{id}/report' },
  getAnalysis: { method: 'GET', path: '/api/v1/load-tests/{id}/analysis' },
  createAnalysis: { method: 'POST', path: '/api/v1/load-tests/{id}/analysis' },
  listTargets: { method: 'GET', path: '/api/v1/targets' },
  registerTarget: { method: 'POST', path: '/api/v1/targets' },
  verifyTarget: { method: 'POST', path: '/api/v1/targets/{id}/verify' },
  deleteTarget: { method: 'DELETE', path: '/api/v1/targets/{id}' },
};

/** Arma la URL de una operación: rellena los parámetros de ruta y añade la query. */
export function urlFor(operationId, { params = {}, query } = {}) {
  const path = OPERATIONS[operationId].path.replace(/\{(\w+)\}/g, (_, name) => encodeURIComponent(params[name]));
  const search = query ? `?${new URLSearchParams(query)}` : '';
  return `${API_URL}${path}${search}`;
}

async function send(operationId, { params, query, body, signal } = {}) {
  const { method } = OPERATIONS[operationId];
  const url = urlFor(operationId, { params, query });
  const init = {
    method,
    signal,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  };

  try {
    // Las consultas esperan a que el backend despierte; las acciones no se repiten solas.
    return method === 'GET' ? await fetchWithWakeUp(url, init) : await fetch(url, init);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'No se pudo conectar con el backend. Si estuvo inactivo, el plan gratuito de Render tarda cerca de un minuto en despertar: espera un momento y vuelve a intentarlo.',
    );
  }
}

/** Devuelve `{ data, meta }`, o lanza ApiError con el formato de error del contrato. */
async function request(operationId, options) {
  const response = await send(operationId, options);
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
  start: (config) => dataOf(request('startLoadTest', { body: config })),
  list: ({ limit = 20, offset = 0, signal } = {}) => request('listLoadTests', { query: { limit, offset }, signal }),
  get: (id, { signal } = {}) => dataOf(request('getLoadTest', { params: { id }, signal })),
  stop: (id) => dataOf(request('stopLoadTest', { params: { id } })),
  remove: (id) => dataOf(request('deleteLoadTest', { params: { id } })),
  compare: (baseline, candidate, { signal } = {}) =>
    dataOf(request('compareLoadTests', { query: { baseline, candidate }, signal })),
  reportUrl: (id, format) => urlFor('downloadReport', { params: { id }, query: { format } }),
};

export const analysis = {
  get: (id, { signal } = {}) => dataOf(request('getAnalysis', { params: { id }, signal })),
  create: (id) => dataOf(request('createAnalysis', { params: { id } })),
};

export const targets = {
  list: ({ signal } = {}) => dataOf(request('listTargets', { signal })),
  register: (hostname) => dataOf(request('registerTarget', { body: { hostname } })),
  verify: (id, method) => dataOf(request('verifyTarget', { params: { id }, body: { method } })),
  remove: (id) => dataOf(request('deleteTarget', { params: { id } })),
};

export const system = {
  metrics: ({ signal } = {}) => dataOf(request('getServerMetrics', { signal })),
  /**
   * /health no usa el formato común: responde 503 con su estado si la base de datos falla.
   * No reintenta: la pantalla Sistema debe mostrar de inmediato si el servidor no responde.
   */
  health: async ({ signal } = {}) => (await fetch(urlFor('getHealth'), { signal })).json(),
};

/** Vistas que renderiza el backend, cada una con su patrón de renderizado. */
export const views = {
  history: `${API_URL}/views/history`,
  report: (id) => `${API_URL}/views/reports/${id}`,
  compare: (baseline, candidate) => `${API_URL}/views/compare?baseline=${baseline}&candidate=${candidate}`,
};
