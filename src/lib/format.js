const LOCALE = 'es-CO';
const EMPTY = '—';

const isMissing = (value) => value === null || value === undefined || Number.isNaN(value);

export function formatNumber(value, maximumFractionDigits = 0) {
  if (isMissing(value)) return EMPTY;
  return value.toLocaleString(LOCALE, { maximumFractionDigits });
}

export function formatMs(value) {
  if (isMissing(value)) return EMPTY;
  if (value >= 1000) return `${formatNumber(value / 1000, 2)} s`;
  return `${formatNumber(value, value < 10 ? 1 : 0)} ms`;
}

/** Recibe una proporción de 0 a 1. */
export function formatPercent(value) {
  if (isMissing(value)) return EMPTY;
  return `${formatNumber(value * 100, value !== 0 && value < 0.1 ? 2 : 1)} %`;
}

export function formatRate(value) {
  return isMissing(value) ? EMPTY : `${formatNumber(value, value < 10 ? 1 : 0)} req/s`;
}

export function formatBytes(bytes) {
  if (isMissing(bytes)) return EMPTY;
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${formatNumber(value, unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatSeconds(value) {
  if (isMissing(value)) return EMPTY;
  if (value < 60) return `${formatNumber(value, value % 1 === 0 ? 0 : 1)} s`;
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  if (minutes < 60) return seconds ? `${minutes} min ${seconds} s` : `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

export function formatDateTime(iso) {
  if (!iso) return EMPTY;
  return new Date(iso).toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
}
