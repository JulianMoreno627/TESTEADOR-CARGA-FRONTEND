/** Lee la cabecera Server-Timing, por ejemplo "render;dur=2.1, total;dur=3.4" → { render: 2.1, total: 3.4 }. */
export function parseServerTiming(header) {
  const timings = {};
  if (!header) return timings;
  for (const entry of header.split(',')) {
    const [name, ...params] = entry.trim().split(';');
    const duration = params.map((param) => param.trim()).find((param) => param.startsWith('dur='));
    if (name && duration) timings[name] = Number(duration.slice(4));
  }
  return timings;
}

export function median(values) {
  const numbers = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (numbers.length === 0) return null;
  const middle = Math.floor(numbers.length / 2);
  return numbers.length % 2 ? numbers[middle] : (numbers[middle - 1] + numbers[middle]) / 2;
}

/** Resume varias mediciones de una misma URL. */
export function summarizeSamples(samples) {
  return {
    clientMs: median(samples.map((sample) => sample.clientMs)),
    serverMs: median(samples.map((sample) => sample.serverMs)),
    bytes: samples.at(-1)?.bytes ?? null,
    cacheStates: [...new Set(samples.map((sample) => sample.cache).filter(Boolean))],
    strategy: samples.at(-1)?.strategy ?? null,
  };
}
