import { CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { system } from '../api/client.js';
import { ErrorNotice, Loading } from '../components/Feedback.jsx';
import LineChart from '../components/LineChart.jsx';
import StatTile from '../components/StatTile.jsx';
import { formatMs, formatNumber, formatPercent, formatSeconds } from '../lib/format.js';
import { socket } from '../realtime/socket.js';

const HEALTH_INTERVAL_MS = 15_000;
const MAX_SAMPLES = 360; // 30 minutos a una muestra cada 5 segundos.

const DELAY_SERIES = [{ key: 'delay', label: 'Retardo p99', color: 'var(--series-1)', read: (sample) => sample.delay }];

function HealthBadge({ health }) {
  if (!health) return null;
  const healthy = health.status === 'ok';
  const Icon = healthy ? CheckCircle2 : XCircle;
  return (
    <span className={`badge tone-${healthy ? 'good' : 'critical'}`}>
      <Icon size={14} aria-hidden="true" />
      {healthy ? 'Servidor en buen estado' : 'Servidor degradado'} · base de datos {health.database === 'up' ? 'activa' : 'caída'}
    </span>
  );
}

export default function SystemPage() {
  const [metrics, setMetrics] = useState(null);
  const [samples, setSamples] = useState([]);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    const controller = new AbortController();

    const receive = (snapshot) => {
      setMetrics(snapshot);
      setError(null);
      // El retardo se calcula cada 5 s: antes de la primera muestra no existe.
      if (!snapshot.eventLoop) return;
      const t = (new Date(snapshot.timestamp).getTime() - startedAt.current) / 1000;
      setSamples((current) => [...current, { t: Math.max(0, t), delay: snapshot.eventLoop.delayP99Ms }].slice(-MAX_SAMPLES));
    };

    const onFailure = (failure) => {
      if (failure.name !== 'AbortError') setError(failure);
    };

    const checkHealth = () => system.health({ signal: controller.signal }).then(setHealth).catch(() => setHealth({ status: 'down', database: 'down' }));

    system.metrics({ signal: controller.signal }).then(receive).catch(onFailure);
    checkHealth();
    const healthTimer = setInterval(checkHealth, HEALTH_INTERVAL_MS);
    socket.on('server:metrics', receive);

    return () => {
      controller.abort();
      clearInterval(healthTimer);
      socket.off('server:metrics', receive);
    };
  }, []);

  const routes = Object.entries(metrics?.routes ?? {}).sort(([, a], [, b]) => b.count - a.count);
  const firstT = samples[0]?.t ?? 0;
  const lastT = samples.at(-1)?.t ?? 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Sistema</h1>
          <p className="muted">
            Rendimiento del propio backend. Si el retardo del event loop se mantiene bajo durante una prueba, los workers están protegiendo al hilo principal.
          </p>
        </div>
        <HealthBadge health={health} />
      </div>

      <ErrorNotice error={error} />
      {!metrics && !error && <Loading />}

      {metrics && (
        <>
          <dl className="stats">
            <StatTile label="Retardo event loop (p99)" value={formatMs(metrics.eventLoop?.delayP99Ms)} />
            <StatTile label="Uso del event loop" value={formatPercent(metrics.eventLoop?.utilization)} />
            <StatTile label="CPU del proceso" value={`${formatNumber(metrics.cpuPercent, 1)} %`} hint="Incluye a los workers" />
            <StatTile label="Memoria (RSS)" value={`${formatNumber(metrics.memoryMb?.rss, 1)} MB`} hint={`Heap: ${formatNumber(metrics.memoryMb?.heapUsed, 1)} MB`} />
            <StatTile label="Tiempo activo" value={formatSeconds(metrics.uptimeSeconds)} />
          </dl>

          <dl className="stats stats-compact">
            <StatTile label="Pruebas activas" value={formatNumber(metrics.gauges?.activeLoadTests)} />
            <StatTile label="Workers activos" value={formatNumber(metrics.gauges?.activeWorkers)} />
            <StatTile label="Clientes conectados" value={formatNumber(metrics.gauges?.socketClients)} />
          </dl>

          <section className="card">
            <LineChart
              title="Retardo del event loop (p99)"
              data={samples}
              series={DELAY_SERIES}
              xMin={firstT}
              xMax={Math.max(firstT + 60, lastT)}
              formatY={formatMs}
              minYMax={10}
              emptyText="La primera muestra llega en unos segundos…"
            />
          </section>

          <section className="card">
            <h2>Latencia por ruta</h2>
            {routes.length === 0 ? (
              <p className="muted">Todavía no hay peticiones registradas.</p>
            ) : (
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Ruta</th>
                      <th scope="col" className="numeric">Peticiones</th>
                      <th scope="col" className="numeric">Errores 5xx</th>
                      <th scope="col" className="numeric">p50</th>
                      <th scope="col" className="numeric">p95</th>
                      <th scope="col" className="numeric">p99</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routes.map(([route, stats]) => (
                      <tr key={route}>
                        <th scope="row"><code>{route}</code></th>
                        <td className="numeric">{formatNumber(stats.count)}</td>
                        <td className="numeric">{formatNumber(stats.serverErrors)}</td>
                        <td className="numeric">{formatMs(stats.latencyMs?.p50)}</td>
                        <td className="numeric">{formatMs(stats.latencyMs?.p95)}</td>
                        <td className="numeric">{formatMs(stats.latencyMs?.p99)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
