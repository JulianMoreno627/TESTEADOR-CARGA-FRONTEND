function niceStep(roughStep, integer) {
  if (integer && roughStep < 1) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  // Con enteros, 2,5 solo sirve a partir de las decenas (25, 250...).
  const candidates = integer && magnitude < 10 ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10];
  return candidates.find((candidate) => normalized <= candidate) * magnitude;
}

/**
 * Marcas redondas desde 0 que cubren `max`. La última marca es el tope del eje.
 * `integer` evita marcas con decimales, para magnitudes como usuarios o segundos.
 */
export function niceTicks(max, count = 4, { integer = false } = {}) {
  if (!(max > 0)) return [0, 1];
  const step = niceStep(max / count, integer);
  const steps = Math.ceil(max / step - 1e-9);
  return Array.from({ length: steps + 1 }, (_, index) => Number((index * step).toPrecision(12)));
}

/**
 * Separa verticalmente las etiquetas para que no se pisen.
 * Recibe y devuelve `{ y }` en píxeles, sin cambiar el orden original.
 */
export function spreadLabels(labels, minGap, maxY) {
  const placed = labels.map((label, index) => ({ ...label, index })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < placed.length; i += 1) {
    placed[i].y = Math.max(placed[i].y, placed[i - 1].y + minGap);
  }
  for (let i = placed.length - 1; i >= 0; i -= 1) {
    const limit = i === placed.length - 1 ? maxY : placed[i + 1].y - minGap;
    placed[i].y = Math.min(placed[i].y, limit);
  }
  return placed.sort((a, b) => a.index - b.index).map(({ index, ...label }) => label);
}
