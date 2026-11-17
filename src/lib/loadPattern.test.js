import assert from 'node:assert/strict';
import { test } from 'node:test';
import { targetVusAt } from './loadPattern.js';

const base = { vus: 100, durationSeconds: 40 };

test('constante: siempre el total', () => {
  assert.equal(targetVusAt(7, { ...base, pattern: { type: 'constant' } }), 100);
});

test('rampa: sube del inicio al total y se mantiene', () => {
  const config = { ...base, pattern: { type: 'ramp', startVus: 10, rampSeconds: 20 } };
  assert.equal(targetVusAt(0, config), 10);
  assert.equal(targetVusAt(10, config), 55);
  assert.equal(targetVusAt(30, config), 100);
});

test('picos: por defecto 2 picos centrados sobre el 10 % de los VUs', () => {
  const config = { ...base, pattern: { type: 'spike' } };
  assert.equal(targetVusAt(0, config), 10);
  assert.equal(targetVusAt(10, config), 100);
  assert.equal(targetVusAt(30, config), 100);
  assert.equal(targetVusAt(39, config), 10);
});
