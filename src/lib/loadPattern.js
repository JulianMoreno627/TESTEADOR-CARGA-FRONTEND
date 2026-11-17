/**
 * Usuarios virtuales objetivo en un instante. Usa las mismas fórmulas que
 * src/domain/loadPatterns.js del backend, para que la vista previa coincida con la prueba.
 */
export function targetVusAt(elapsedSeconds, { vus, durationSeconds, pattern }) {
  if (pattern.type === 'ramp') {
    const startVus = pattern.startVus ?? 1;
    const progress = Math.min(1, elapsedSeconds / (pattern.rampSeconds ?? durationSeconds));
    return Math.round(startVus + (vus - startVus) * progress);
  }

  if (pattern.type === 'spike') {
    const baseVus = pattern.baseVus ?? Math.max(1, Math.ceil(vus * 0.1));
    const period = durationSeconds / (pattern.spikes ?? 2);
    const spikeSeconds = pattern.spikeSeconds ?? Math.max(1, Math.round(period / 4));
    const spikeStart = (period - spikeSeconds) / 2;
    const position = elapsedSeconds % period;
    return position >= spikeStart && position < spikeStart + spikeSeconds ? vus : baseVus;
  }

  return vus;
}

export function sampleLoadShape(config, samples = 200) {
  return Array.from({ length: samples + 1 }, (_, index) => {
    const t = (config.durationSeconds * index) / samples;
    return { t, vus: targetVusAt(t, config) };
  });
}
