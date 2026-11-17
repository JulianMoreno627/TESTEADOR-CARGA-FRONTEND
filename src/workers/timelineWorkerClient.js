/**
 * Cliente del Web Worker con una interfaz de promesas: cada petición lleva un id
 * y se resuelve cuando llega la respuesta con ese mismo id.
 * El worker se crea la primera vez que se usa y se reutiliza después.
 */
let worker = null;
let nextId = 0;
const pending = new Map();

function getWorker() {
  if (worker) return worker;
  // Vite empaqueta el worker como un archivo aparte a partir de esta URL.
  worker = new Worker(new URL('./timeline.worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data: { id, result, error } }) => {
    const request = pending.get(id);
    if (!request) return;
    pending.delete(id);
    if (error) request.reject(new Error(error));
    else request.resolve(result);
  };
  worker.onerror = (event) => {
    for (const request of pending.values()) request.reject(new Error(event.message || 'Falló el Web Worker.'));
    pending.clear();
    worker.terminate();
    worker = null;
  };
  return worker;
}

export function runTimelineTask(task, timeline) {
  return new Promise((resolve, reject) => {
    nextId += 1;
    pending.set(nextId, { resolve, reject });
    getWorker().postMessage({ id: nextId, task, timeline });
  });
}
