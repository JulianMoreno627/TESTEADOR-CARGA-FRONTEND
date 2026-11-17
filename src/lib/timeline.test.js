import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeTimeline, sumTimeline } from './timeline.js';

const point = (t, extra = {}) => ({ t, requests: 10, errors: 1, ...extra });

test('añade al final los puntos nuevos', () => {
  const merged = mergeTimeline([point(1)], [point(2), point(3)]);
  assert.deepEqual(merged.map(({ t }) => t), [1, 2, 3]);
});

test('no duplica puntos y ordena los que llegan tarde', () => {
  const merged = mergeTimeline([point(1), point(3)], [point(1), point(2), point(3)]);
  assert.deepEqual(merged.map(({ t }) => t), [1, 2, 3]);
});

test('conserva la misma lista si no llega nada', () => {
  const current = [point(1)];
  assert.equal(mergeTimeline(current, []), current);
});

test('suma los totales de la serie', () => {
  assert.deepEqual(sumTimeline([point(1), point(2)]), { requests: 20, errors: 2, errorRate: 0.1 });
  assert.equal(sumTimeline([]).errorRate, 0);
});
