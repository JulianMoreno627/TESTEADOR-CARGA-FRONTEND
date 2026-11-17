import assert from 'node:assert/strict';
import { test } from 'node:test';
import { median, parseServerTiming, summarizeSamples } from './renderingLab.js';

test('lee Server-Timing con varias métricas y descripciones', () => {
  assert.deepEqual(parseServerTiming('render;dur=2.1, total;dur=3.4'), { render: 2.1, total: 3.4 });
  assert.deepEqual(parseServerTiming('db;desc="Consulta";dur=10'), { db: 10 });
  assert.deepEqual(parseServerTiming(null), {});
});

test('la mediana ignora valores que no son números', () => {
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([null, undefined]), null);
});

test('resume las muestras de un patrón', () => {
  const summary = summarizeSamples([
    { clientMs: 120, serverMs: 4, bytes: 900, cache: 'MISS', strategy: 'ISR' },
    { clientMs: 80, serverMs: 1, bytes: 900, cache: 'HIT', strategy: 'ISR' },
    { clientMs: 90, serverMs: 1, bytes: 900, cache: 'HIT', strategy: 'ISR' },
  ]);
  assert.deepEqual(summary, { clientMs: 90, serverMs: 1, bytes: 900, cacheStates: ['MISS', 'HIT'], strategy: 'ISR' });
});
