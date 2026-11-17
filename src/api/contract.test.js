import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from 'yaml';

import { OPERATIONS, urlFor } from './client.js';

/** Prueba de contrato del lado del consumidor (contract-first). */
const contract = parse(readFileSync(new URL('../../contract/openapi.yaml', import.meta.url), 'utf8'));

const contractOperations = new Map();
for (const [path, item] of Object.entries(contract.paths)) {
  for (const [method, operation] of Object.entries(item)) {
    if (operation?.operationId) contractOperations.set(operation.operationId, { method: method.toUpperCase(), path });
  }
}

test('cada operación del cliente existe en el contrato con el mismo método y ruta', () => {
  for (const [operationId, { method, path }] of Object.entries(OPERATIONS)) {
    const documented = contractOperations.get(operationId);
    assert.ok(documented, `${operationId} no está en contract/openapi.yaml`);
    assert.deepEqual({ method, path }, documented, `${operationId} no coincide con el contrato`);
  }
});

test('el cliente cubre todas las operaciones del contrato que usa la interfaz', () => {
  // /health/live solo lo usa Render para su health check.
  const notUsedByUi = new Set(['getLiveness']);
  const missing = [...contractOperations.keys()].filter((id) => !OPERATIONS[id] && !notUsedByUi.has(id));
  assert.deepEqual(missing, []);
});

test('urlFor rellena la ruta y la query', () => {
  const url = urlFor('downloadReport', { params: { id: 'a/b' }, query: { format: 'pdf' } });
  assert.match(url, /\/api\/v1\/load-tests\/a%2Fb\/report\?format=pdf$/);
});
