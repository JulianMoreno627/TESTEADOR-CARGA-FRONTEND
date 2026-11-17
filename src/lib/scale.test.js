import assert from 'node:assert/strict';
import { test } from 'node:test';
import { niceTicks, spreadLabels } from './scale.js';

test('genera marcas redondas que cubren el máximo', () => {
  assert.deepEqual(niceTicks(320), [0, 100, 200, 300, 400]);
  assert.deepEqual(niceTicks(0.05), [0, 0.02, 0.04, 0.06]);
});

test('con enteros no genera marcas con decimales', () => {
  assert.deepEqual(niceTicks(12, 5, { integer: true }), [0, 5, 10, 15]);
  assert.deepEqual(niceTicks(1, 4, { integer: true }), [0, 1]);
  assert.deepEqual(niceTicks(100, 4, { integer: true }), [0, 25, 50, 75, 100]);
});

test('usa un eje por defecto cuando no hay valores', () => {
  assert.deepEqual(niceTicks(0), [0, 1]);
});

test('separa etiquetas cercanas sin salirse del área', () => {
  const [a, b, c] = spreadLabels([{ y: 100 }, { y: 102 }, { y: 104 }], 13, 110);
  assert.ok(b.y - a.y >= 13);
  assert.ok(c.y - b.y >= 13);
  assert.ok(c.y <= 110);
});
