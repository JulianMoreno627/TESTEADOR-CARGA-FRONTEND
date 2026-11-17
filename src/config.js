// `?.` permite importar este módulo también desde node:test, donde no existe import.meta.env.
export const API_URL = (import.meta.env?.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
