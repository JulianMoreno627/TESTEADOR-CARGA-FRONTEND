import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPayload, fieldErrorsFrom, INITIAL_FORM, translateFieldMessage, validateForm } from './testForm.js';

const form = (changes) => ({ ...INITIAL_FORM, url: 'http://localhost:4000/slow', ...changes });

test('omite los campos opcionales vacíos', () => {
  assert.deepEqual(buildPayload(form({})), {
    url: 'http://localhost:4000/slow',
    method: 'GET',
    vus: 50,
    durationSeconds: 30,
    pattern: { type: 'constant' },
    thinkTimeMs: 0,
    timeoutMs: 10000,
  });
});

test('solo envía los campos del patrón elegido', () => {
  const payload = buildPayload(form({ patternType: 'ramp', startVus: '5', rampSeconds: '', baseVus: '9' }));
  assert.deepEqual(payload.pattern, { type: 'ramp', startVus: 5 });
});

test('descarta los headers sin nombre', () => {
  const headers = [{ name: ' X-Demo ', value: '1' }, { name: '', value: 'ignorado' }];
  assert.deepEqual(buildPayload(form({ headers })).headers, { 'X-Demo': '1' });
});

test('envía el cuerpo como JSON si puede y como texto si no', () => {
  assert.deepEqual(buildPayload(form({ method: 'POST', body: '{"a":1}' })).body, { a: 1 });
  assert.equal(buildPayload(form({ method: 'POST', body: 'hola' })).body, 'hola');
  assert.equal(buildPayload(form({ method: 'POST', body: '12' })).body, '12');
});

test('no envía cuerpo en métodos que no lo admiten', () => {
  assert.equal('body' in buildPayload(form({ method: 'GET', body: 'x' })), false);
});

test('exige URL, VUs y duración', () => {
  const errors = validateForm({ ...INITIAL_FORM, vus: '', durationSeconds: '0' });
  assert.deepEqual(Object.keys(errors), ['url', 'vus', 'durationSeconds']);
});

test('traduce los mensajes de límites', () => {
  assert.equal(translateFieldMessage('Too big: expected number to be <=500'), 'Debe ser como máximo 500.');
  assert.equal(translateFieldMessage('Too small: expected number to be >0'), 'Debe ser mayor que 0.');
  assert.equal(translateFieldMessage('URL inválida.'), 'URL inválida.');
});

test('agrupa los errores por campo del formulario', () => {
  const errors = fieldErrorsFrom([
    { field: 'pattern.startVus', message: 'A' },
    { field: 'headers.Host', message: 'B' },
    { field: 'headers.Connection', message: 'C' },
  ]);
  assert.deepEqual(errors, { 'pattern.startVus': 'A', headers: 'B' });
});
