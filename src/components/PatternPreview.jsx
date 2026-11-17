import { formatNumber, formatSeconds } from '../lib/format.js';
import { sampleLoadShape } from '../lib/loadPattern.js';

const WIDTH = 320;
const HEIGHT = 96;

/** Forma de la carga que recibirá la API, calculada mientras se llena el formulario. */
export default function PatternPreview({ vus, durationSeconds, pattern }) {
  if (!(vus >= 1) || !(durationSeconds >= 1)) {
    return <p className="muted">Indica los usuarios y la duración para ver la forma de la carga.</p>;
  }

  const shape = sampleLoadShape({ vus, durationSeconds, pattern });
  const peak = Math.max(vus, ...shape.map((sample) => sample.vus));
  const points = shape
    .map(({ t, vus: active }) => `${(t / durationSeconds) * WIDTH},${HEIGHT - (active / peak) * (HEIGHT - 4) - 1}`)
    .join(' ');

  return (
    <figure className="pattern-preview">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Vista previa de la carga: hasta ${vus} usuarios virtuales durante ${durationSeconds} segundos.`}
      >
        <line className="chart-baseline" x1="0" x2={WIDTH} y1={HEIGHT - 0.5} y2={HEIGHT - 0.5} />
        <polyline className="chart-line" points={points} stroke="var(--series-1)" />
      </svg>
      <figcaption>
        <span>0 s</span>
        <span>Hasta {formatNumber(peak)} VUs</span>
        <span>{formatSeconds(durationSeconds)}</span>
      </figcaption>
    </figure>
  );
}
