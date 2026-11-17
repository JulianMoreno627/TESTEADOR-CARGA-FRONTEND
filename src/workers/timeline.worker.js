import { analyzeTimeline, timelineToCsv } from '../lib/timelineInsights.js';

/**
 * Web Worker: corre en un hilo del navegador distinto al de la interfaz.
 * Recibe la serie de tiempo por postMessage (se copia), hace el cálculo y responde.
 * Mientras tanto, el hilo principal sigue dibujando gráficas y atendiendo Socket.io.
 *
 * Entrada: { id, task: 'insights' | 'csv', timeline }
 * Salida:  { id, result } | { id, error }
 */
const TASKS = {
  insights: analyzeTimeline,
  csv: timelineToCsv,
};

self.onmessage = ({ data: { id, task, timeline } }) => {
  try {
    const run = TASKS[task];
    if (!run) throw new Error(`Tarea desconocida: ${task}`);
    self.postMessage({ id, result: run(timeline) });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};
