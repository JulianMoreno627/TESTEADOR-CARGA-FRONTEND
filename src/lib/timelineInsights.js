// La latencia se considera degradada cuando el p95 duplica al del inicio de la prueba.
const SATURATION_FACTOR = 2;
// El throughput se considera estancado si los usuarios suben ≥ 20 % y las req/s < 5 %.
const VUS_GROWTH = 0.2;
const RPS_GROWTH = 0.05;

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const pick = (point) => ({ t: point.t, activeVus: point.activeVus, rps: point.rps, p95: point.latency?.p95 ?? null, errorRate: point.errorRate });

/**
 * Lectura automática de la serie de tiempo, sin IA: reglas simples y explicables.
 * Es lógica pura para poder probarla con node:test y ejecutarla en un Web Worker.
 */
export function analyzeTimeline(timeline) {
  const withLatency = timeline.filter((point) => point.latency?.p95 != null);
  if (withLatency.length === 0) {
    return { baselineP95: null, saturation: null, firstError: null, plateau: null, peakRps: null, tailRatio: null };
  }

  // Línea base: el p95 típico del primer 20 % de la prueba (al menos un punto).
  const head = withLatency.slice(0, Math.max(1, Math.ceil(withLatency.length * 0.2)));
  const baselineP95 = median(head.map((point) => point.latency.p95));

  const saturationPoint = withLatency.find((point) => point.latency.p95 >= baselineP95 * SATURATION_FACTOR);
  const firstErrorPoint = timeline.find((point) => point.errors > 0);
  const peakPoint = timeline.reduce((best, point) => (point.rps > best.rps ? point : best), timeline[0]);

  let plateau = null;
  for (let index = 1; index < timeline.length; index += 1) {
    const previous = timeline[index - 1];
    const current = timeline[index];
    if (previous.activeVus === 0 || previous.rps === 0) continue;
    const vusGrowth = (current.activeVus - previous.activeVus) / previous.activeVus;
    const rpsGrowth = (current.rps - previous.rps) / previous.rps;
    if (vusGrowth >= VUS_GROWTH && rpsGrowth < RPS_GROWTH) {
      plateau = pick(current);
      break;
    }
  }

  const ratios = withLatency.filter((point) => point.latency.p50 > 0).map((point) => point.latency.p99 / point.latency.p50);

  return {
    baselineP95,
    saturation: saturationPoint ? pick(saturationPoint) : null,
    firstError: firstErrorPoint ? pick(firstErrorPoint) : null,
    plateau,
    peakRps: pick(peakPoint),
    // Cuántas veces es el p99 respecto al p50: mide qué tan larga es la "cola" de latencia.
    tailRatio: ratios.length > 0 ? median(ratios) : null,
  };
}

const CSV_COLUMNS = [
  ['segundo', (point) => point.t],
  ['vus_activos', (point) => point.activeVus],
  ['vus_objetivo', (point) => point.targetVus],
  ['peticiones', (point) => point.requests],
  ['errores', (point) => point.errors],
  ['req_por_segundo', (point) => point.rps],
  ['tasa_errores', (point) => point.errorRate],
  ['p50_ms', (point) => point.latency?.p50],
  ['p95_ms', (point) => point.latency?.p95],
  ['p99_ms', (point) => point.latency?.p99],
];

/** Serie de tiempo como CSV (separador coma, punto decimal), lista para Excel o Sheets. */
export function timelineToCsv(timeline) {
  const header = CSV_COLUMNS.map(([name]) => name).join(',');
  const rows = timeline.map((point) => CSV_COLUMNS.map(([, read]) => read(point) ?? '').join(','));
  return [header, ...rows].join('\n');
}
