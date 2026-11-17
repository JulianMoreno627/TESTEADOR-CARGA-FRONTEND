import { useCallback, useEffect, useState } from 'react';
import { loadTests } from '../api/client.js';
import { mergeTimeline } from '../lib/timeline.js';
import { socket } from '../realtime/socket.js';

const SUBSCRIBE_TIMEOUT_MS = 5_000;

/**
 * Estado de una prueba: lo ya ocurrido llega por REST y al suscribirse; lo nuevo, por
 * Socket.io. Los puntos se combinan por tiempo, porque `test:metrics` puede perder
 * alguno o llegar antes que la respuesta de la suscripción.
 */
export function useLiveTest(id) {
  const [state, setState] = useState({ run: null, timeline: [], totals: null, error: null, loading: true });

  const applyRun = useCallback((run) => {
    setState((previous) => {
      // Una respuesta lenta no debe devolver a "running" una prueba que ya terminó.
      const isStale = previous.run && previous.run.status !== 'running' && run.status === 'running';
      return {
        ...previous,
        run: isStale ? previous.run : run,
        timeline: mergeTimeline(previous.timeline, run.timeline ?? []),
        error: null,
        loading: false,
      };
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchRun = () =>
      loadTests.get(id, { signal: controller.signal }).then(applyRun).catch((error) => {
        if (error.name !== 'AbortError') setState((previous) => ({ ...previous, error, loading: false }));
      });

    const subscribe = async () => {
      try {
        const reply = await socket.timeout(SUBSCRIBE_TIMEOUT_MS).emitWithAck('test:subscribe', id);
        if (reply.ok && !controller.signal.aborted) applyRun(reply.run);
      } catch {
        // Sin respuesta: se conserva lo obtenido por REST y se reintenta al reconectar.
      }
    };

    const onMetrics = ({ testId, point, totals }) => {
      if (testId !== id) return;
      setState((previous) => ({ ...previous, timeline: mergeTimeline(previous.timeline, [point]), totals }));
    };

    // Llega a todos los clientes. El evento no trae el timeline: se pide para recuperar puntos perdidos.
    const onFinished = (finished) => {
      if (finished.id !== id) return;
      setState((previous) => ({ ...previous, run: previous.run && { ...previous.run, ...finished } }));
      fetchRun();
    };

    fetchRun();
    socket.on('connect', subscribe);
    socket.on('test:metrics', onMetrics);
    socket.on('test:finished', onFinished);
    if (socket.connected) subscribe();

    return () => {
      controller.abort();
      socket.off('connect', subscribe);
      socket.off('test:metrics', onMetrics);
      socket.off('test:finished', onFinished);
      socket.emit('test:unsubscribe', id);
    };
  }, [id, applyRun]);

  const stop = useCallback(async () => applyRun(await loadTests.stop(id)), [id, applyRun]);

  return { ...state, stop };
}
