/** Une dos listas de puntos sin duplicar; cada punto se identifica por su tiempo `t`. */
export function mergeTimeline(current, incoming) {
  if (incoming.length === 0) return current;

  const lastT = current.at(-1)?.t ?? -Infinity;
  if (incoming.every((point, index) => point.t > (index === 0 ? lastT : incoming[index - 1].t))) {
    return [...current, ...incoming];
  }

  const byTime = new Map(current.map((point) => [point.t, point]));
  for (const point of incoming) byTime.set(point.t, point);
  return [...byTime.values()].sort((a, b) => a.t - b.t);
}

/** Totales acumulados, para cuando aún no ha llegado ningún `test:metrics` con `totals`. */
export function sumTimeline(timeline) {
  const requests = timeline.reduce((total, point) => total + point.requests, 0);
  const errors = timeline.reduce((total, point) => total + point.errors, 0);
  return { requests, errors, errorRate: requests > 0 ? errors / requests : 0 };
}
