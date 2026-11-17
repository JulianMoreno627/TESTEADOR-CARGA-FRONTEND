import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchWithWakeUp } from './wakeUp.js';

const networkError = () => Object.assign(new TypeError('Failed to fetch'), { name: 'TypeError' });

test('reintenta mientras el servidor despierta y devuelve la primera respuesta', async () => {
  let calls = 0;
  const fetchFn = async () => {
    calls += 1;
    if (calls < 3) throw networkError();
    return 'respuesta';
  };
  assert.equal(await fetchWithWakeUp('/x', {}, { delays: [0, 0, 0], fetchFn }), 'respuesta');
  assert.equal(calls, 3);
});

test('se rinde cuando se acaban los reintentos', async () => {
  let calls = 0;
  const fetchFn = async () => {
    calls += 1;
    throw networkError();
  };
  await assert.rejects(fetchWithWakeUp('/x', {}, { delays: [0, 0], fetchFn }), /Failed to fetch/);
  assert.equal(calls, 3, 'un intento inicial y dos reintentos');
});

test('no reintenta si la petición se canceló', async () => {
  let calls = 0;
  const fetchFn = async () => {
    calls += 1;
    throw new DOMException('Abortado', 'AbortError');
  };
  await assert.rejects(fetchWithWakeUp('/x', {}, { delays: [0, 0], fetchFn }), { name: 'AbortError' });
  assert.equal(calls, 1);
});

test('cancelar durante la espera detiene los reintentos', async () => {
  const controller = new AbortController();
  const fetchFn = async () => {
    throw networkError();
  };
  const pending = fetchWithWakeUp('/x', { signal: controller.signal }, { delays: [60_000], fetchFn });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});
