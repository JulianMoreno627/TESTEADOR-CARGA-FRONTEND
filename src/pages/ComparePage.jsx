import { ArrowLeftRight, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { loadTests, views } from '../api/client.js';
import { ErrorNotice, Loading, VerdictBadge } from '../components/Feedback.jsx';
import FormField from '../components/FormField.jsx';
import { formatDateTime, formatMs, formatNumber, formatPercent } from '../lib/format.js';

const RUN_OPTIONS_LIMIT = 100;

const VERDICT_TEXT = {
  improved: 'La candidata rinde mejor que la base.',
  regressed: 'La candidata rinde peor que la base.',
  mixed: 'Algunas métricas mejoraron y otras empeoraron.',
  unchanged: 'No hay diferencias más allá del ruido normal entre corridas.',
};

function formatMetric(key, value) {
  if (key === 'errorRate') return formatPercent(value);
  if (key === 'avgRps') return `${formatNumber(value, 1)} req/s`;
  return formatMs(value);
}

function formatChange(percent) {
  if (percent === null || percent === undefined) return '—';
  return `${percent > 0 ? '+' : ''}${formatNumber(percent, 1)} %`;
}

function RunSelect({ label, runs, value, onChange }) {
  return (
    <FormField label={label}>
      {(props) => (
        <select {...props} value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Elige una corrida…</option>
          {runs.map((run) => (
            <option key={run.id} value={run.id}>
              {run.name} · {formatDateTime(run.finishedAt)}
            </option>
          ))}
        </select>
      )}
    </FormField>
  );
}

export default function ComparePage() {
  const [params, setParams] = useSearchParams();
  const baseline = params.get('baseline') ?? '';
  const candidate = params.get('candidate') ?? '';

  const [runs, setRuns] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    loadTests
      .list({ limit: RUN_OPTIONS_LIMIT, signal: controller.signal })
      .then(({ data }) => setRuns(data.filter((run) => run.summary)))
      .catch((failure) => {
        if (failure.name !== 'AbortError') setError(failure);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setError(null);
    if (!baseline || !candidate) {
      setComparison(null);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    loadTests
      .compare(baseline, candidate, { signal: controller.signal })
      .then(setComparison)
      .catch((failure) => {
        if (failure.name === 'AbortError') return;
        setComparison(null);
        setError(failure);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [baseline, candidate]);

  const select = (next) => {
    const merged = { baseline, candidate, ...next };
    setParams(Object.fromEntries(Object.entries(merged).filter(([, value]) => value)), { replace: true });
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Comparar corridas</h1>
          <p className="muted">Comprueba si un cambio realmente mejoró el rendimiento de tu API.</p>
        </div>
        {baseline && candidate && (
          <div className="actions">
            <a className="button button-secondary" href={views.compare(baseline, candidate)} target="_blank" rel="noreferrer">
              <ExternalLink size={15} aria-hidden="true" /> Vista HTML
            </a>
          </div>
        )}
      </div>

      {runs && runs.length === 0 && !error && (
        <div className="card empty">
          <p>Necesitas al menos una corrida terminada para comparar.</p>
          <Link to="/" className="button button-primary">Crear una prueba</Link>
        </div>
      )}

      {runs && runs.length > 0 && (
        <section className="card compare-picker">
          <RunSelect label="Base (antes)" runs={runs} value={baseline} onChange={(id) => select({ baseline: id })} />
          <button
            type="button"
            className="button button-ghost button-icon"
            aria-label="Intercambiar base y candidata"
            title="Intercambiar"
            onClick={() => select({ baseline: candidate, candidate: baseline })}
          >
            <ArrowLeftRight size={16} aria-hidden="true" />
          </button>
          <RunSelect label="Candidata (después)" runs={runs} value={candidate} onChange={(id) => select({ candidate: id })} />
        </section>
      )}

      <ErrorNotice error={error} />
      {loading && !comparison && <Loading>Comparando…</Loading>}

      {comparison && (
        <section className={`card${loading ? ' is-refreshing' : ''}`}>
          <div className="verdict">
            <VerdictBadge verdict={comparison.verdict} />
            <p>{VERDICT_TEXT[comparison.verdict]}</p>
          </div>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Métrica</th>
                  <th scope="col" className="numeric">Base</th>
                  <th scope="col" className="numeric">Candidata</th>
                  <th scope="col" className="numeric">Cambio</th>
                  <th scope="col">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {comparison.metrics.map((metric) => (
                  <tr key={metric.key}>
                    <th scope="row">{metric.label}</th>
                    <td className="numeric">{formatMetric(metric.key, metric.baseline)}</td>
                    <td className="numeric">{formatMetric(metric.key, metric.candidate)}</td>
                    <td className="numeric">{formatChange(metric.changePercent)}</td>
                    <td><VerdictBadge verdict={metric.verdict} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted table-note">Un cambio menor al {comparison.noiseThresholdPercent} % se considera ruido.</p>
        </section>
      )}
    </>
  );
}
