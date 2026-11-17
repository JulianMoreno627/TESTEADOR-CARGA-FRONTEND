import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // El backend solo autoriza este origen por CORS: si el puerto cambiara, las peticiones fallarían.
  server: { port: 5173, strictPort: true },
});
