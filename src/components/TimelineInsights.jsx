import { Cpu, FileSpreadsheet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatMs, formatNumber, formatPercent, formatRate, formatSeconds } from '../lib/format.js';
import { runTimelineTask } from '../workers/timelineWorkerClient.js';
import { ErrorNotice, Loading } from './Feedback.jsx';

function downloadText(fileName, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = Object.assign(document.createElement('a'), { href: url, download: fileName });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function Insight({ title, point, children, empty }) {
  return (
    <div className="insight">
      <dt>{title}</dt>
      <dd>{point ? children : <span className="muted">{empty}</span>}</dd>
    </div>
  );
}

/**
 * Lectura automática de la serie de tiempo, calculada en un Web Worker.
 * Complementa el análisis con IA: aquí son reglas fijas, rápidas y explicables.
 */
export default function TimelineInsights({ testId, timeline }) {
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    runTimelineTask('insights', timeline)
      .then((result) => active && setInsights(result))
      .catch((failure) => active && setError(failure));
    return () => {
      active = false;
    };
  }, [timeline]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      downloadText(`serie-${testId}.csv`, await runTimelineTask('csv', timeline), 'text/csv;charset=utf-8');
    } catch (failure) {
      setError(failure);
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="card insights" aria-labelledby="insights-title">
      <div className="insights-header">
        <h2 id="insights-title">Lectura automática</h2>
        <button type="button" className="button button-secondary button-small" onClick={exportCsv} disabled={exporting}>
          <FileSpreadsheet size={15} aria-hidden="true" /> {exporting ? 'Generando…' : 'Exportar CSV'}
        </button>
      </div>
      <p className="field-hint">
        <Cpu size={13} aria-hidden="true" /> Calculada en un Web Worker, fuera del hilo de la interfaz.
      </p>

      <ErrorNotice error={error} />
      {!insights && !error && <Loading>Calculando…</Loading>}
      {insights && (
        <dl className="insights-grid">
          <Insight title="Punto de saturación" point={insights.saturation} empty="La latencia no llegó a duplicarse.">
            En t = {formatSeconds(Math.round(insights.saturation?.t))}, con {formatNumber(insights.saturation?.activeVus)} usuarios:
            p95 de {formatMs(insights.saturation?.p95)}, el doble de la línea base ({formatMs(insights.baselineP95)}).
          </Insight>
          <Insight title="Primer error" point={insights.firstError} empty="No hubo errores.">
            En t = {formatSeconds(Math.round(insights.firstError?.t))}, con {formatNumber(insights.firstError?.activeVus)} usuarios
            ({formatPercent(insights.firstError?.errorRate)} de errores en ese segundo).
          </Insight>
          <Insight title="Throughput estancado" point={insights.plateau} empty="El throughput acompañó a los usuarios.">
            Desde t = {formatSeconds(Math.round(insights.plateau?.t))}: más usuarios ({formatNumber(insights.plateau?.activeVus)})
            ya no aumentaron las req/s ({formatRate(insights.plateau?.rps)}).
          </Insight>
          <Insight title="Cola de latencia (p99 / p50)" point={insights.tailRatio} empty="Sin datos.">
            El p99 es {formatNumber(insights.tailRatio, 1)} veces el p50
            {insights.tailRatio >= 3 ? ': algunas peticiones tardan mucho más que la mayoría.' : '.'}
          </Insight>
        </dl>
      )}
    </section>
  );
}
