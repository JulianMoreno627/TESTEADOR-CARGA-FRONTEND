/**
 * El backend está en el plan gratuito de Render: tras 15 minutos sin uso se apaga y
 * tarda cerca de un minuto en volver. Mientras arranca, responde sin cabeceras CORS
 * y el navegador lo ve como un fallo de red.
 */

// Esperas entre reintentos: unos 60 s en total, lo que tarda Render en despertar.
export const WAKE_UP_DELAYS_MS = Object.freeze([2_000, 4_000, 8_000, 12_000, 15_000, 20_000]);

const abortError = (signal) => signal.reason ?? new DOMException('Abortado', 'AbortError');

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    // Si ya se canceló, el evento 'abort' no volverá a dispararse: hay que comprobarlo antes.
    if (signal?.aborted) {
      reject(abortError(signal));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(abortError(signal));
    }, { once: true });
  });

/**
 * fetch con reintentos ante fallos de red. Solo para peticiones idempotentes (GET):
 * repetir un POST podría, por ejemplo, iniciar dos veces la misma prueba.
 */
export async function fetchWithWakeUp(url, init = {}, { delays = WAKE_UP_DELAYS_MS, fetchFn = fetch } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fetchFn(url, init);
    } catch (error) {
      if (error.name === 'AbortError' || attempt >= delays.length) throw error;
      await sleep(delays[attempt], init.signal);
    }
  }
}

/** Avisa al backend apenas abre la app, para que vaya despertando mientras se navega. */
export function wakeUpBackend(apiUrl, fetchFn = fetch) {
  fetchFn(`${apiUrl}/health/live`, { cache: 'no-store' }).catch(() => {
    // Si aún está dormido, las peticiones de cada pantalla ya reintentan.
  });
}
