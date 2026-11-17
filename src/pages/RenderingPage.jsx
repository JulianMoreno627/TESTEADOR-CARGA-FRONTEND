import { ExternalLink, Gauge } from 'lucide-react';
import { useState } from 'react';
import { loadTests, urlFor, views } from '../api/client.js';
import { ErrorNotice, Loading } from '../components/Feedback.jsx';
import { formatBytes, formatMs } from '../lib/format.js';
import { parseServerTiming, summarizeSamples } from '../lib/renderingLab.js';

const SAMPLES = 5;

const PATTERNS = [
  {
    key: 'csr',
    name: 'CSR',
    fullName: 'Client-Side Rendering',
    where: 'Esta aplicación React (Vercel)',
    when: 'En el navegador, después de descargar el JavaScript y pedir los datos a la API.',
    pros: 'Muy interactiva; el servidor solo envía JSON; ideal para el dashboard en vivo.',
    cons: 'La primera pantalla tarda más (JS + datos) y los buscadores ven una página vacía.',
  },
  {
    key: 'ssr',
    name: 'SSR',
    fullName: 'Server-Side Rendering',
    where: 'Comparación HTML del backend (/views/compare)',
    when: 'En el servidor, en cada petición.',
    pros: 'HTML completo y siempre actualizado; funciona sin JavaScript.',
    cons: 'Cada visita cuesta CPU y una consulta a la base de datos.',
  },
  {
    key: 'ssg',
    name: 'SSG',
    fullName: 'Static Site Generation',
    where: 'Reporte de una corrida (/views/reports/:id)',
    when: 'Una vez, la primera vez que se pide; después se sirve el archivo.',
    pros: 'Lo más rápido y barato: no consulta la base de datos ni renderiza.',
    cons: 'Solo sirve para contenido que no cambia; si cambia, hay que regenerarlo.',
  },
  {
    key: 'isr',
    name: 'ISR',
    fullName: 'Incremental Static Regeneration',
    where: 'Historial HTML del backend (/views/history)',
    when: 'Se sirve una copia en caché y se regenera en segundo plano al vencer.',
    pros: 'Casi tan rápido como SSG, pero se actualiza solo.',
    cons: 'Un visitante puede ver una versión unos segundos vieja.',
  },
];

async function measure(url) {
  const startedAt = performance.now();
  // no-store: así se mide al servidor y no a la caché del navegador.
  const response = await fetch(url, { cache: 'no-store' });
  const body = await response.arrayBuffer();
  return {
    clientMs: performance.now() - startedAt,
    serverMs: parseServerTiming(response.headers.get('server-timing')).total ?? null,
    bytes: body.byteLength,
    cache: response.headers.get('x-cache'),
    strategy: response.headers.get('x-render-strategy') ?? 'CSR (JSON)',
    status: response.status,
  };
}

/** Elige corridas terminadas reales para que SSG y SSR tengan qué mostrar. */
async function pickRuns() {
  const { data } = await loadTests.list({ limit: 20 });
  const finished = data.filter((run) => run.status !== 'running' && run.summary);
  if (finished.length === 0) throw new Error('Primero ejecuta al menos una prueba: SSG y SSR necesitan una corrida terminada.');
  return [finished[0], finished[1] ?? finished[0]];
}

export default function RenderingPage() {
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  const run = async () => {
    setError(null);
    setResults(null);
    try {
      setProgress('Eligiendo corridas…');
      const [first, second] = await pickRuns();
      const urls = {
        csr: urlFor('listLoadTests', { query: { limit: 20, offset: 0 } }),
        ssr: views.compare(first.id, second.id),
        ssg: views.report(first.id),
        isr: views.history,
      };

      const measured = {};
      for (const pattern of PATTERNS) {
        setProgress(`Midiendo ${pattern.name}…`);
        // La primera petición calienta el servidor (Render gratuito se duerme) y no se cuenta.
        await measure(urls[pattern.key]);
        const samples = [];
        for (let index = 0; index < SAMPLES; index += 1) samples.push(await measure(urls[pattern.key]));
        measured[pattern.key] = { url: urls[pattern.key], ...summarizeSamples(samples) };
      }
      setResults(measured);
    } catch (failure) {
      setError(failure);
    } finally {
      setProgress(null);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Patrones de renderizado</h1>
          <p className="muted">
            El proyecto usa los cuatro patrones clásicos, cada uno donde mejor encaja. Aquí se comparan sus
            trade-offs y se miden contra el backend real.
          </p>
        </div>
        <div className="actions">
          <button type="button" className="button button-primary" onClick={run} disabled={Boolean(progress)}>
            <Gauge size={16} aria-hidden="true" /> {progress ? 'Midiendo…' : 'Medir ahora'}
          </button>
        </div>
      </div>

      <ErrorNotice error={error} />
      {progress && <Loading>{progress}</Loading>}

      <section className="card">
        <h2>Trade-offs</h2>
        <div className="table-scroll">
          <table className="table rendering-table">
            <thead>
              <tr>
                <th scope="col">Patrón</th>
                <th scope="col">Dónde se usa</th>
                <th scope="col">Cuándo se genera el HTML</th>
                <th scope="col">Ventaja</th>
                <th scope="col">Costo</th>
              </tr>
            </thead>
            <tbody>
              {PATTERNS.map((pattern) => (
                <tr key={pattern.key}>
                  <th scope="row">
                    {pattern.name}
                    <span className="muted rendering-full-name">{pattern.fullName}</span>
                  </th>
                  <td>{pattern.where}</td>
                  <td>{pattern.when}</td>
                  <td>{pattern.pros}</td>
                  <td>{pattern.cons}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {results && (
        <section className="card rendering-results">
          <h2>Mediciones</h2>
          <p className="field-hint">
            Mediana de {SAMPLES} peticiones por patrón, sin caché del navegador. <strong>Servidor</strong> sale de la
            cabecera Server-Timing; <strong>Total</strong> incluye además la red hasta Render.
          </p>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Patrón</th>
                  <th scope="col" className="numeric">Servidor</th>
                  <th scope="col" className="numeric">Total</th>
                  <th scope="col" className="numeric">Tamaño</th>
                  <th scope="col">Caché (X-Cache)</th>
                  <th scope="col">Abrir</th>
                </tr>
              </thead>
              <tbody>
                {PATTERNS.map((pattern) => {
                  const result = results[pattern.key];
                  return (
                    <tr key={pattern.key}>
                      <th scope="row">{pattern.name}</th>
                      <td className="numeric">{formatMs(result.serverMs)}</td>
                      <td className="numeric">{formatMs(result.clientMs)}</td>
                      <td className="numeric">{formatBytes(result.bytes)}</td>
                      <td>{result.cacheStates.join(' → ') || '—'}</td>
                      <td>
                        <a href={result.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${pattern.name}`}>
                          <ExternalLink size={15} aria-hidden="true" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="field-hint">
            En CSR el tiempo es solo el de los datos (JSON): falta sumar lo que tarda React en dibujar en el navegador.
            En SSR, SSG e ISR la respuesta ya es la página completa.
          </p>
        </section>
      )}
    </>
  );
}
