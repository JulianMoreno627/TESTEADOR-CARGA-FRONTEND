import { useState } from 'react';
import { useElementWidth } from '../hooks/useElementWidth.js';
import { formatSeconds } from '../lib/format.js';
import { niceTicks, spreadLabels } from '../lib/scale.js';

const MARGIN = { top: 12, bottom: 26, left: 56 };
const LABEL_GAP = 13;
const LABEL_CHAR_WIDTH = 7;

/** Parte la serie en tramos continuos: un valor `null` deja un hueco en la línea. */
function toSegments(data, read, x, y) {
  const segments = [];
  let current = null;
  for (const item of data) {
    const value = read(item);
    if (value === null || value === undefined) {
      current = null;
    } else {
      if (!current) {
        current = [];
        segments.push(current);
      }
      current.push([x(item.t), y(value)]);
    }
  }
  return segments;
}

function lastValueOf(data, read) {
  for (let index = data.length - 1; index >= 0; index -= 1) {
    const value = read(data[index]);
    if (value !== null && value !== undefined) return { t: data[index].t, value };
  }
  return null;
}

function nearestIndex(data, t) {
  let best = 0;
  data.forEach((item, index) => {
    if (Math.abs(item.t - t) < Math.abs(data[best].t - t)) best = index;
  });
  return best;
}

/**
 * Gráfica de líneas en SVG con un solo eje Y. `data` es una lista de `{ t, ... }` y cada
 * serie indica `{ key, label, color, read }`. Admite puntero y flechas del teclado.
 */
export default function LineChart({ title, data, series, xMin = 0, xMax, formatY, minYMax = 1, integerY = false, height = 210, emptyText = 'Esperando datos…' }) {
  const [containerRef, width] = useElementWidth();
  const [activeIndex, setActiveIndex] = useState(null);

  const showLabels = series.length > 1;
  const longestLabel = Math.max(...series.map(({ label }) => label.length));
  const marginRight = showLabels ? longestLabel * LABEL_CHAR_WIDTH + 12 : 14;
  const plotWidth = Math.max(width - MARGIN.left - marginRight, 1);
  const plotHeight = height - MARGIN.top - MARGIN.bottom;

  const xSpan = Math.max(xMax - xMin, 1);
  const x = (t) => MARGIN.left + ((t - xMin) / xSpan) * plotWidth;
  const xTicks = niceTicks(xSpan, width < 360 ? 3 : 5, { integer: true }).filter((tick) => tick <= xSpan);

  const values = series.flatMap(({ read }) => data.map(read)).filter((value) => value !== null && value !== undefined);
  const yTicks = niceTicks(Math.max(minYMax, ...values), 4, { integer: integerY });
  const yMax = yTicks.at(-1);
  const y = (value) => MARGIN.top + plotHeight - (value / yMax) * plotHeight;

  const endLabels = showLabels
    ? spreadLabels(
        series.flatMap(({ key, label, read }) => {
          const last = lastValueOf(data, read);
          return last ? [{ key, label, x: x(last.t), y: y(last.value) + 4 }] : [];
        }),
        LABEL_GAP,
        height - MARGIN.bottom,
      )
    : [];

  const active = activeIndex === null ? null : data[activeIndex];

  const handlePointerMove = (event) => {
    if (data.length === 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const t = xMin + ((event.clientX - bounds.left - MARGIN.left) / plotWidth) * xSpan;
    setActiveIndex(nearestIndex(data, t));
  };

  const handleKeyDown = (event) => {
    if (data.length === 0) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.key === 'ArrowLeft' ? -1 : 1;
    setActiveIndex((index) => Math.min(data.length - 1, Math.max(0, (index ?? data.length - 1) + step)));
  };

  return (
    <figure className="chart">
      <figcaption className="chart-header">
        <h3>{title}</h3>
        {showLabels && (
          <ul className="legend">
            {series.map(({ key, label, color }) => (
              <li key={key}>
                <span className="legend-key" style={{ background: color }} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        )}
      </figcaption>

      <div className="chart-plot" ref={containerRef} style={{ height }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`${title}. Usa las flechas izquierda y derecha para recorrer los valores.`}
            tabIndex={0}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setActiveIndex(null)}
            onKeyDown={handleKeyDown}
            onFocus={() => data.length > 0 && setActiveIndex(data.length - 1)}
            onBlur={() => setActiveIndex(null)}
          >
            {yTicks.map((tick) => (
              <g key={tick}>
                <line
                  className={tick === 0 ? 'chart-baseline' : 'chart-grid'}
                  x1={MARGIN.left}
                  x2={MARGIN.left + plotWidth}
                  y1={y(tick)}
                  y2={y(tick)}
                />
                <text className="chart-tick" x={MARGIN.left - 8} y={y(tick) + 4} textAnchor="end">
                  {formatY(tick)}
                </text>
              </g>
            ))}

            {xTicks.map((tick) => (
              <text
                key={tick}
                className="chart-tick"
                x={MARGIN.left + (tick / xSpan) * plotWidth}
                y={height - 6}
                textAnchor={tick === 0 ? 'start' : 'middle'}
              >
                {formatSeconds(xMin + tick)}
              </text>
            ))}

            {series.map(({ key, color, read }) =>
              toSegments(data, read, x, y).map((segment, index) =>
                segment.length === 1 ? (
                  <circle key={`${key}-${index}`} cx={segment[0][0]} cy={segment[0][1]} r={3} fill={color} />
                ) : (
                  <polyline key={`${key}-${index}`} className="chart-line" points={segment.join(' ')} stroke={color} />
                ),
              ),
            )}

            {endLabels.map(({ key, label, x: labelX, y: labelY }) => (
              <text key={key} className="chart-end-label" x={labelX + 7} y={labelY}>
                {label}
              </text>
            ))}

            {active && (
              <g>
                <line className="chart-crosshair" x1={x(active.t)} x2={x(active.t)} y1={MARGIN.top} y2={MARGIN.top + plotHeight} />
                {series.map(({ key, color, read }) => {
                  const value = read(active);
                  return value === null || value === undefined ? null : (
                    <circle key={key} className="chart-marker" cx={x(active.t)} cy={y(value)} r={4} fill={color} />
                  );
                })}
              </g>
            )}
          </svg>
        )}

        {data.length === 0 && <p className="chart-empty">{emptyText}</p>}

        {active && (
          <div
            className="chart-tooltip"
            style={x(active.t) > width / 2 ? { right: width - x(active.t) + 10 } : { left: x(active.t) + 10 }}
          >
            <p className="chart-tooltip-time">{formatSeconds(Math.round(active.t))}</p>
            <ul>
              {series.map(({ key, label, color, read }) => (
                <li key={key}>
                  <span className="tooltip-key" style={{ background: color }} aria-hidden="true" />
                  <strong>{formatY(read(active))}</strong>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </figure>
  );
}
