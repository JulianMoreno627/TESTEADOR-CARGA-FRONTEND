import { ExternalLink, GitCompareArrows, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadTests, views } from '../api/client.js';
import { ErrorNotice, Loading, StatusBadge } from '../components/Feedback.jsx';
import { formatDateTime, formatMs, formatNumber, formatPercent, formatSeconds } from '../lib/format.js';
import { socket } from '../realtime/socket.js';

const PAGE_SIZE = 20;
const MAX_SELECTED = 2;

export default function HistoryPage() {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);

  const load = useCallback(async (signal) => {
    setRefreshing(true);
    try {
      const { data, meta } = await loadTests.list({ limit: PAGE_SIZE, offset, signal });
      // Al borrar la última fila de una página, se vuelve a la anterior.
      if (data.length === 0 && offset > 0) {
        setOffset(Math.max(0, offset - PAGE_SIZE));
        return;
      }
      setPage({ items: data, total: meta.total });
      setError(null);
    } catch (failure) {
      if (failure.name !== 'AbortError') setError(failure);
    } finally {
      if (!signal?.aborted) setRefreshing(false);
    }
  }, [offset]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);

    const reload = () => load(controller.signal);
    socket.on('test:started', reload);
    socket.on('test:finished', reload);
    return () => {
      controller.abort();
      socket.off('test:started', reload);
      socket.off('test:finished', reload);
    };
  }, [load]);

  const toggleSelected = (run) =>
    setSelected((current) => (current.some(({ id }) => id === run.id) ? current.filter(({ id }) => id !== run.id) : [...current, run]));

  const handleDelete = async (run) => {
    if (!window.confirm(`¿Eliminar "${run.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await loadTests.remove(run.id);
      setSelected((current) => current.filter(({ id }) => id !== run.id));
      await load();
    } catch (failure) {
      setError(failure);
    }
  };

  const handleCompare = () => {
    // La corrida más antigua es la base: así el cambio se lee como antes → después.
    const [baseline, candidate] = [...selected].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    navigate(`/compare?baseline=${baseline.id}&candidate=${candidate.id}`);
  };

  const total = page?.total ?? 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Historial</h1>
          <p className="muted">Elige dos corridas terminadas para comparar sus resultados.</p>
        </div>
        <div className="actions">
          <a className="button button-secondary" href={views.history} target="_blank" rel="noreferrer">
            <ExternalLink size={15} aria-hidden="true" /> Vista HTML
          </a>
          <button type="button" className="button button-primary" disabled={selected.length !== MAX_SELECTED} onClick={handleCompare}>
            <GitCompareArrows size={15} aria-hidden="true" /> Comparar ({selected.length}/{MAX_SELECTED})
          </button>
        </div>
      </div>

      <ErrorNotice error={error} />

      {!page && !error && <Loading>Cargando el historial…</Loading>}

      {page && page.items.length === 0 && (
        <div className="card empty">
          <p>Aún no hay pruebas.</p>
          <Link to="/" className="button button-primary">Crear la primera</Link>
        </div>
      )}

      {page && page.items.length > 0 && (
        <div className={`card table-scroll${refreshing ? ' is-refreshing' : ''}`}>
          <table className="table">
            <thead>
              <tr>
                <th scope="col"><span className="visually-hidden">Seleccionar</span></th>
                <th scope="col">Prueba</th>
                <th scope="col">Estado</th>
                <th scope="col" className="numeric">VUs</th>
                <th scope="col" className="numeric">Duración</th>
                <th scope="col" className="numeric">Peticiones</th>
                <th scope="col" className="numeric">p95</th>
                <th scope="col" className="numeric">Errores</th>
                <th scope="col">Fecha</th>
                <th scope="col"><span className="visually-hidden">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((run) => {
                const isSelected = selected.some(({ id }) => id === run.id);
                return (
                  <tr key={run.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar ${run.name} para comparar`}
                        checked={isSelected}
                        disabled={!run.summary || (!isSelected && selected.length >= MAX_SELECTED)}
                        onChange={() => toggleSelected(run)}
                      />
                    </td>
                    <td className="cell-name">
                      <Link to={`/tests/${run.id}`}>{run.name}</Link>
                      <span className="url muted">{run.config.method} {run.config.url}</span>
                    </td>
                    <td><StatusBadge status={run.status} /></td>
                    <td className="numeric">{formatNumber(run.config.vus)}</td>
                    <td className="numeric">{formatSeconds(run.summary?.durationSeconds ?? run.config.durationSeconds)}</td>
                    <td className="numeric">{formatNumber(run.summary?.totalRequests)}</td>
                    <td className="numeric">{formatMs(run.summary?.latency?.p95)}</td>
                    <td className="numeric">{formatPercent(run.summary?.errorRate)}</td>
                    <td className="nowrap">{formatDateTime(run.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="button button-ghost button-icon"
                        aria-label={`Eliminar ${run.name}`}
                        title={run.status === 'running' ? 'Detén la prueba para eliminarla' : 'Eliminar'}
                        disabled={run.status === 'running'}
                        onClick={() => handleDelete(run)}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {total > PAGE_SIZE && (
        <nav className="pagination" aria-label="Páginas del historial">
          <button type="button" className="button button-secondary" disabled={offset === 0} onClick={() => setOffset(offset - PAGE_SIZE)}>
            Anterior
          </button>
          <span className="muted">
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} de {formatNumber(total)}
          </span>
          <button type="button" className="button button-secondary" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>
            Siguiente
          </button>
        </nav>
      )}
    </>
  );
}
