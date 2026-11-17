import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeTimeline, timelineToCsv } from './timelineInsights.js';

const point = (t, activeVus, rps, p95, errors = 0) => ({
  t,
  activeVus,
  targetVus: activeVus,
  requests: rps,
  errors,
  rps,
  errorRate: rps ? errors / rps : 0,
  latency: { p50: p95 / 2, p95, p99: p95 * 1.5 },
});

// Rampa: el throughput sube con los usuarios hasta el segundo 5, luego se estanca y la latencia se dispara.
const ramp = [
  point(1, 10, 100, 50),
  point(2, 20, 200, 52),
  point(3, 30, 300, 55),
  point(4, 40, 400, 60),
  point(5, 50, 480, 80),
  point(6, 60, 490, 140, 3),
  point(7, 70, 495, 260, 12),
];

test('detecta el punto de saturación, el primer error y el estancamiento del throughput', () => {
  const insights = analyzeTimeline(ramp);

  assert.equal(insights.baselineP95, 51);
  assert.equal(insights.saturation.t, 6, 'el p95 duplica la línea base en el segundo 6');
  assert.equal(insights.saturation.activeVus, 60);
  assert.equal(insights.firstError.t, 6);
  assert.equal(insights.plateau.t, 6, 'los usuarios suben 20 % y las req/s solo 2 %');
  assert.equal(insights.peakRps.rps, 495);
  assert.equal(insights.tailRatio, 3);
});

test('una prueba estable no reporta saturación ni errores', () => {
  const flat = [1, 2, 3, 4, 5].map((t) => point(t, 10, 100, 40));
  const insights = analyzeTimeline(flat);
  assert.equal(insights.saturation, null);
  assert.equal(insights.firstError, null);
  assert.equal(insights.plateau, null);
});

test('sin respuestas no hay nada que leer', () => {
  const empty = [{ t: 1, activeVus: 2, rps: 0, errors: 5, errorRate: 1, latency: { p50: null, p95: null, p99: null } }];
  assert.equal(analyzeTimeline(empty).saturation, null);
});

test('exporta la serie como CSV con celdas vacías cuando falta la latencia', () => {
  const csv = timelineToCsv([point(1, 10, 100, 50), { ...point(2, 10, 0, 0), latency: { p50: null, p95: null, p99: null } }]);
  const [header, first, second] = csv.split('\n');
  assert.equal(header, 'segundo,vus_activos,vus_objetivo,peticiones,errores,req_por_segundo,tasa_errores,p50_ms,p95_ms,p99_ms');
  assert.equal(first, '1,10,10,100,0,100,0,25,50,75');
  assert.match(second, /,,,$/);
});
