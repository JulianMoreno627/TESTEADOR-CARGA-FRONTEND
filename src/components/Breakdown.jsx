import { formatNumber, formatPercent } from '../lib/format.js';

/** Lista ordenada de conteos (códigos HTTP, tipos de error). Una sola categoría no necesita barra. */
export default function Breakdown({ counts, emptyText }) {
  const entries = Object.entries(counts ?? {}).sort(([, a], [, b]) => b - a);
  if (entries.length === 0) return <p className="muted">{emptyText}</p>;

  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const largest = entries[0][1];

  return (
    <ul className="breakdown">
      {entries.map(([label, count]) => (
        <li key={label}>
          <span className="breakdown-label">{label}</span>
          {entries.length > 1 && (
            <span className="breakdown-track" aria-hidden="true">
              <span className="breakdown-bar" style={{ width: `${(count / largest) * 100}%` }} />
            </span>
          )}
          <span className="breakdown-value">
            {formatNumber(count)} <span className="muted">({formatPercent(count / total)})</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
