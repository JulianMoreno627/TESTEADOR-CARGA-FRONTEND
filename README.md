# Testeador de Carga Visual: Frontend

Interfaz en React para configurar pruebas de carga, seguir sus métricas en tiempo real, compararlas y pedirle a una IA que las analice.

**Autor:** Julián David Moreno · Programación orientada a la web

| | |
|---|---|
| Aplicación (Vercel) | <https://testeador-carga-frontend.vercel.app> |
| Backend (Render) | <https://testeador-carga-api.onrender.com> · [repositorio](https://github.com/JulianMoreno627/TESTEADOR-CARGA-BACKEND) |

El código está en inglés y los textos que ve el usuario, en español. En el plan gratuito, Render apaga el backend tras 15 minutos sin uso: la primera carga puede tardar cerca de un minuto.

Para probar en producción, usa la API de ejemplo ya verificada: `https://testeador-carga-demo.onrender.com/slow`, `/fast`, `/flaky` o `/heavy`.

## Puesta en marcha local

Requiere Node.js 20 o superior, y Node.js 22.9 o superior para el backend. Usa tres terminales:

```bash
# 1. Backend, en su carpeta.
npm run dev            # http://localhost:3000

# 2. API de ejemplo, en la carpeta del backend.
npm run demo:target    # http://localhost:4000

# 3. Frontend, en esta carpeta.
npm install
npm run dev            # http://localhost:5173
```

Abre <http://localhost:5173> con `localhost`, no con `127.0.0.1`, porque el backend solo autoriza ese origen por CORS.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en el puerto 5173 |
| `npm run build` | Genera la versión de producción en `dist/` |
| `npm run preview` | Sirve `dist/` en el puerto 5173 |
| `npm test` | Pruebas con `node:test`: lógica pura y contrato |
| `npm run contract:sync` | Descarga el contrato OpenAPI publicado por el backend |

| Variable | Uso | Por defecto |
|---|---|---|
| `VITE_API_URL` | URL del backend, para REST y Socket.io | `http://localhost:3000` |

En Vercel, `VITE_API_URL` apunta al backend de Render, y la URL de Vercel está en `CORS_ORIGINS` del backend.

## Pantallas

| Ruta | Pantalla | Qué permite |
|---|---|---|
| `/` | Nueva prueba | Configurar destino, usuarios, duración y patrón, con vista previa de la carga |
| `/tests/:id` | Prueba | Seguirla en vivo y detenerla; al terminar, ver el resumen, la lectura automática, el análisis con IA y los reportes (PDF, JSON, HTML o CSV) |
| `/history` | Historial | Listar y eliminar corridas, y elegir dos para comparar |
| `/compare` | Comparar | Ver qué métricas mejoraron o empeoraron entre dos corridas |
| `/targets` | Dominios | Registrar un dominio público y verificarlo por HTTP o DNS |
| `/system` | Sistema | Rendimiento del backend: event loop, CPU, memoria, workers y latencia por ruta |
| `/rendering` | Renderizado | Comparar CSR, SSR, SSG e ISR con sus trade-offs y medirlos contra el backend real |

## Cómo cubre los temas de la materia

| Tema | Dónde | Detalle |
|---|---|---|
| **Workers e hilos** | [timeline.worker.js](src/workers/timeline.worker.js) | Un Web Worker calcula la lectura automática y el CSV en otro hilo del navegador, mientras la interfaz sigue dibujando y recibiendo datos en vivo |
| **CSR** | Toda la aplicación | React dibuja la interfaz en el navegador a partir del JSON de la API |
| **CSR, SSR, SSG e ISR** | [RenderingPage.jsx](src/pages/RenderingPage.jsx) | Tabla de trade-offs y medición en vivo de cada patrón con `Server-Timing` |
| **Contract-first** | [contract/openapi.yaml](contract/openapi.yaml), [contract.test.js](src/api/contract.test.js) | El cliente usa los `operationId` del contrato del backend, y una prueba falla si alguno no existe o cambió |
| **Métricas de rendimiento** | Pantallas Prueba y Sistema | p50, p95, p99, throughput y errores de la API probada, y el rendimiento del propio backend |
| **IA** | [AiAnalysisPanel.jsx](src/components/AiAnalysisPanel.jsx) | Muestra el análisis de Gemini, o de Groq como respaldo, y avisa cuál respondió |

## Arquitectura

```text
src/
├── api/client.js       Peticiones REST según el contrato (OPERATIONS = operationId del OpenAPI)
├── realtime/socket.js  Conexión única de Socket.io
├── workers/            Web Worker de la serie de tiempo y su cliente con promesas
├── hooks/              useLiveTest (REST + tiempo real) y useElementWidth
├── lib/                Lógica pura y probada: formulario, patrones, serie, lectura automática, escalas, formatos
├── components/         LineChart (SVG), panel de IA, lectura automática y componentes base
├── pages/              Una por pantalla
└── styles/global.css   Variables de color (claro y oscuro) y estilos
contract/openapi.yaml   Copia del contrato del backend (npm run contract:sync)
```

### Decisiones

- **Tiempo real sin perder datos.** `test:metrics` puede descartar puntos, así que `useLiveTest` combina por tiempo lo que llega por REST, por la suscripción y por el socket. Al recibir `test:finished` pide de nuevo la prueba para tener la serie y el resumen definitivos.
- **Web Worker con interfaz de promesas.** [timelineWorkerClient.js](src/workers/timelineWorkerClient.js) crea el worker una sola vez y asocia cada respuesta a su petición por un id. La lógica vive en [timelineInsights.js](src/lib/timelineInsights.js), que es pura y se prueba sin navegador.
- **Dos análisis complementarios.**
  - La *lectura automática* son reglas fijas, instantáneas y explicables: punto de saturación, primer error, throughput estancado y cola de latencia.
  - El *análisis con IA* interpreta y recomienda, pero puede equivocarse; la interfaz lo advierte.
- **La IA solo se llama si el usuario lo pide.** El panel primero consulta si ya hay un análisis guardado (GET) y solo genera uno nuevo al pulsar el botón (POST), para cuidar la cuota gratuita.
- **Gráficas propias en SVG** con un solo eje cada una, huecos cuando falta la latencia, cursor y navegación con el teclado. Cada prueba ofrece además sus datos en una tabla.
- **Credenciales fuera del navegador.** El borrador del formulario se conserva solo en memoria, porque sus headers pueden llevar credenciales.
- **Patrones de carga duplicados a propósito.** La vista previa usa las fórmulas de `src/domain/loadPatterns.js` del backend. Si esas fórmulas cambian, también hay que actualizar `src/lib/loadPattern.js`.
