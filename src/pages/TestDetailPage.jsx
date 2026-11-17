import { ArrowLeft, FileDown, FileJson, FileText, GitCompareArrows, Square } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadTests, views } from '../api/client.js';
import Breakdown from '../components/Breakdown.jsx';
import { ErrorNotice, Loading, StatusBadge } from '../components/Feedback.jsx';
import LineChart from '../components/LineChart.jsx';
import StatTile from '../components/StatTile.jsx';
import { useLiveTest } from '../hooks/useLiveTest.js';
import { formatBytes, formatDateTime, formatMs, formatNumber, formatPercent, formatRate, formatSeconds } from '../lib/format.js';
import { sumTimeline } from '../lib/timeline.js';

const PATTERN_LABELS = { constant: 'Constante', ramp: 'Rampa', spike: 'Picos' };

const LATENCY_SERIES = [
  { key: 'p50', label: 'p50', color: 'var(--series-1)', read: (point) => point.latency?.p50 ?? null },
  { key: 'p95', label: 'p95', color: 'var(--series-2)', read: (point) => point.latency?.p95 ?? null },
  { key: 'p99', label: 'p99', color: 'var(--series-3)', read: (point) => point.latency?.p99 ?? null },
];
const THROUGHPUT_SERIES = [{ key: 'rps', label: 'Throughput', color: 'var(--series-1)', read: (point) => point.rps }];
const VUS_SERIES = [
  { key: 'active', label: 'Activos', color: 'var(--series-1)', read: (point) => point.activeVus },
  { key: 'target', label: 'Objetivo', color: 'var(--series-2)', read: (point) => point.targetVus },
];
const ERROR_SERIES = [{ key: 'errors', label: 'Errores', color: 'var(--series-1)', read: (point) => point.errorRate }];

const LATENCY_FIELDS = [
  ['min', 'Mínima'],
  ['mean', 'Media'],
  ['p50', 'p50'],
  ['p90', 'p90'],
  ['p95', 'p95'],
  ['p99', 'p99'],
  ['max', 'Máxima'],
];

function LiveStats({ timeline, totals, run }) {
  const last = timeline.at(-1);
  const { requests, errorRate } = totals ?? sumTimeline(timeline);
  return (
    <dl className="stats">
      <StatTile label="Throughput actual" value={formatRate(last?.rps)} />
      <StatTile label="Latencia p95" value={formatMs(last?.latency?.p95)} />
      <StatTile label="Usuarios activos" value={formatNumber(last?.activeVus)} hint={`de ${formatNumber(run.config.vus)} como máximo`} />
      <StatTile label="Tasa de errores" value={formatPercent(errorRate)} />
      <StatTile label="Peticiones" value={formatNumber(requests)} />
    </dl>
  );
}

function FinalStats({ summary }) {
  return (
    <dl className="stats">
      <StatTile label="Throughput medio" value={formatRate(summary.avgRps)} hint={`Pico: ${formatRate(summary.peakRps)}`} />
      <StatTile label="Latencia p95" value={formatMs(summary.latency?.p95)} />
      <StatTile label="Pico de usuarios" value={formatNumber(summary.peakVus)} />
      <StatTile
        label="Tasa de errores"
        value={formatPercent(summary.errorRate)}
        hint={`${formatNumber(summary.failedRequests)} peticiones fallidas`}
      />
      <StatTile label="Peticiones" value={formatNumber(summary.totalRequests)} hint={`${formatBytes(summary.totalBytes)} recibidos`} />
    </dl>
  );
}

function SummaryDetails({ summary }) {
  return (
    <section className="summary-grid">
      <div className="card">
        <h2>Latencia final</h2>
        <table className="table table-compact">
          <tbody>
            {LATENCY_FIELDS.map(([key, label]) => (
              <tr key={key}>
                <th scope="row">{label}</th>
                <td className="numeric">{formatMs(summary.latency?.[key])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <h2>Códigos de respuesta</h2>
        <Breakdown counts={summary.statusCodes} emptyText="No se recibieron respuestas." />
      </div>
      <div className="card">
        <h2>Tipos de error</h2>
        <Breakdown counts={summary.errorTypes} emptyText="No hubo errores." />
      </div>
    </section>
  );
}

function TimelineTable({ timeline }) {
  return (
    <details className="card timeline-table">
      <summary>Ver los datos en una tabla ({formatNumber(timeline.length)} puntos)</summary>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Tiempo</th>
              <th scope="col" className="numeric">VUs activos</th>
              <th scope="col" className="numeric">Req/s</th>
              <th scope="col" className="numeric">p50</th>
              <th scope="col" className="numeric">p95</th>
              <th scope="col" className="numeric">p99</th>
              <th scope="col" className="numeric">Errores</th>
            </tr>
          </thead>
          <tbody>
            {timeline.map((point) => (
              <tr key={point.t}>
                <td>{formatSeconds(Math.round(point.t))}</td>
                <td className="numeric">{formatNumber(point.activeVus)}</td>
                <td className="numeric">{formatNumber(point.rps)}</td>
                <td className="numeric">{formatMs(point.latency?.p50)}</td>
                <td className="numeric">{formatMs(point.latency?.p95)}</td>
                <td className="numeric">{formatMs(point.latency?.p99)}</td>
                <td className="numeric">{formatPercent(point.errorRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function TestDetail({ id }) {
  const { run, timeline, totals, error, loading, stop } = useLiveTest(id);
  const [stopping, setStopping] = useState(false);
  const [stopError, setStopError] = useState(null);

  if (loading) return <Loading>Cargando la prueba…</Loading>;
  if (!run) {
    return (
      <>
        <ErrorNotice error={error} />
        <Link to="/history" className="back-link">
          <ArrowLeft size={15} aria-hidden="true" /> Volver al historial
        </Link>
      </>
    );
  }

  const running = run.status === 'running';
  const { config, summary } = run;
  const elapsed = timeline.at(-1)?.t ?? 0;
  const xMax = Math.max(config.durationSeconds, elapsed);

  const handleStop = async () => {
    setStopping(true);
    setStopError(null);
    try {
      await stop();
    } catch (failure) {
      // Si terminó justo antes de pulsar, `test:finished` ya actualiza la pantalla.
      if (failure.code !== 'TEST_NOT_RUNNING') setStopError(failure);
    } finally {
      setStopping(false);
    }
  };

  return (
    <>
      <Link to="/history" className="back-link">
        <ArrowLeft size={15} aria-hidden="true" /> Historial
      </Link>

      <div className="page-header">
        <div className="page-title">
          <div className="title-row">
            <h1>{run.name}</h1>
            <StatusBadge status={run.status} />
          </div>
          <p className="target-line">
            <code>{config.method}</code> <span className="url">{config.url}</span>
          </p>
          <p className="muted">
            {formatNumber(config.vus)} VUs · {formatSeconds(config.durationSeconds)} · Patrón {PATTERN_LABELS[config.pattern?.type]?.toLowerCase() ?? config.pattern?.type} ·{' '}
            {formatDateTime(run.startedAt ?? run.createdAt)}
          </p>
        </div>

        <div className="actions">
          {running ? (
            <button type="button" className="button button-danger" onClick={handleStop} disabled={stopping}>
              <Square size={15} aria-hidden="true" /> {stopping ? 'Deteniendo…' : 'Detener'}
            </button>
          ) : (
            summary && (
              <>
                <a className="button button-secondary" href={loadTests.reportUrl(id, 'pdf')}>
                  <FileDown size={15} aria-hidden="true" /> PDF
                </a>
                <a className="button button-secondary" href={loadTests.reportUrl(id, 'json')}>
                  <FileJson size={15} aria-hidden="true" /> JSON
                </a>
                <a className="button button-secondary" href={views.report(id)} target="_blank" rel="noreferrer">
                  <FileText size={15} aria-hidden="true" /> Reporte HTML
                </a>
                <Link className="button button-secondary" to={`/compare?candidate=${id}`}>
                  <GitCompareArrows size={15} aria-hidden="true" /> Comparar
                </Link>
              </>
            )
          )}
        </div>
      </div>

      {running && (
        <div
          className="progress"
          role="progressbar"
          aria-label="Avance de la prueba"
          aria-valuemin={0}
          aria-valuemax={config.durationSeconds}
          aria-valuenow={Math.min(Math.round(elapsed), config.durationSeconds)}
        >
          <span style={{ width: `${Math.min(100, (elapsed / config.durationSeconds) * 100)}%` }} />
        </div>
      )}

      <ErrorNotice error={stopError} />
      {run.error && <ErrorNotice error={{ message: run.error.message ?? String(run.error) }} />}
      {!running && !summary && <p className="notice">Esta corrida se interrumpió antes de terminar, así que no tiene resultados finales.</p>}

      {summary ? <FinalStats summary={summary} /> : <LiveStats timeline={timeline} totals={totals} run={run} />}

      {(running || timeline.length > 0) && (
        <>
          <section className="charts" aria-label="Métricas a lo largo de la prueba">
            <div className="card">
              <LineChart title="Latencia" data={timeline} series={LATENCY_SERIES} xMax={xMax} formatY={formatMs} minYMax={10} />
            </div>
            <div className="card">
              <LineChart title="Throughput (req/s)" data={timeline} series={THROUGHPUT_SERIES} xMax={xMax} formatY={(value) => formatNumber(value)} minYMax={10} />
            </div>
            <div className="card">
              <LineChart title="Usuarios virtuales" data={timeline} series={VUS_SERIES} xMax={xMax} formatY={(value) => formatNumber(value)} minYMax={config.vus} integerY />
            </div>
            <div className="card">
              <LineChart title="Tasa de errores" data={timeline} series={ERROR_SERIES} xMax={xMax} formatY={formatPercent} minYMax={0.05} />
            </div>
          </section>
          {timeline.length > 0 && <TimelineTable timeline={timeline} />}
        </>
      )}

      {summary && <SummaryDetails summary={summary} />}
    </>
  );
}

export default function TestDetailPage() {
  const { id } = useParams();
  return <TestDetail key={id} id={id} />;
}
