# Testeador de Carga Visual: Frontend

Interfaz en React para configurar pruebas de carga, seguir sus métricas en tiempo real y comparar resultados. Se conecta al backend de la carpeta `CASO-DE-ESTUDIO-TESTEADOR-DE-CARGA-VISUAL-BACKEND` usando el contrato de su archivo `docs/API.md`.

**Autor:** Julian Moreno

El código está en inglés. Los textos que ve el usuario están en español.

## Puesta en marcha

Requiere Node.js 20 o superior, y Node.js 22.9 o superior para el backend. Usa tres terminales:

```bash
# 1. Backend, en su carpeta. Sin DATABASE_URL, el historial queda en memoria.
npm run dev            # http://localhost:3000

# 2. API de ejemplo, en la carpeta del backend.
npm run demo:target    # http://localhost:4000

# 3. Frontend, en esta carpeta.
npm install
npm run dev            # http://localhost:5173
```

Abre <http://localhost:5173> con `localhost`, no con `127.0.0.1`, porque el backend solo autoriza ese origen por CORS. Elige una ruta de la API de ejemplo e inicia la prueba.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en el puerto 5173 |
| `npm run build` | Genera la versión de producción en `dist/` |
| `npm run preview` | Sirve `dist/` en el puerto 5173 |
| `npm test` | Pruebas de la lógica pura con `node:test` |

## Variables de entorno

Copia `.env.example` como `.env` si el backend no está en la URL por defecto.

| Variable | Uso | Por defecto |
|---|---|---|
| `VITE_API_URL` | URL del backend, para REST y Socket.io | `http://localhost:3000` |

Para desplegar en otro origen, agrégalo también a `CORS_ORIGINS` en el backend.

## Pantallas

| Ruta | Pantalla | Qué permite |
|---|---|---|
| `/` | Nueva prueba | Configurar destino, usuarios, duración y patrón, con vista previa de la carga |
| `/tests/:id` | Prueba | Seguirla en vivo, detenerla, ver el resumen final y descargar el reporte (PDF, JSON o HTML) |
| `/history` | Historial | Listar y eliminar corridas, y elegir dos para comparar |
| `/compare` | Comparar | Ver qué métricas mejoraron o empeoraron entre dos corridas |
| `/targets` | Dominios | Registrar un dominio público y verificarlo por HTTP o DNS |
| `/system` | Sistema | Ver el rendimiento del backend: event loop, CPU, memoria y latencia por ruta |

## Arquitectura

```text
src/
├── api/client.js       Peticiones REST y manejo del formato de error
├── realtime/socket.js  Conexión única de Socket.io
├── hooks/              useLiveTest (REST + tiempo real) y useElementWidth
├── lib/                Lógica pura y probada: formulario, patrones, serie de tiempo, escalas, formatos
├── components/         LineChart (SVG), PatternPreview, Breakdown, StatTile, avisos y campos
├── pages/              Una por pantalla
└── styles/global.css   Variables de color (claro y oscuro) y estilos
```

### Decisiones

- **Tiempo real sin perder datos.** `test:metrics` puede descartar puntos, así que `useLiveTest` combina por tiempo lo que llega por REST, por la suscripción y por el socket. Al recibir `test:finished` pide de nuevo la prueba para tener la serie y el resumen definitivos. Si se reconecta, vuelve a suscribirse.
- **Gráficas propias en SVG.** Son necesarias pocas funciones: líneas con huecos cuando `latency` es `null`, cursor con lectura de todas las series y navegación con el teclado. Cada prueba ofrece además sus datos en una tabla.
- **Un solo eje por gráfica.** Latencia, throughput, usuarios y errores tienen escalas distintas, por eso van en gráficas separadas con el mismo eje de tiempo.
- **Credenciales fuera del navegador.** El borrador del formulario se conserva solo en memoria, porque sus headers pueden llevar credenciales.
- **El servidor valida los límites.** Los máximos son configurables en el backend, así que el formulario muestra sus errores junto a cada campo en lugar de repetir las reglas.
- **Patrones de carga duplicados a propósito.** La vista previa usa las fórmulas de `src/domain/loadPatterns.js` del backend. Si esas fórmulas cambian, también hay que actualizar `src/lib/loadPattern.js`.
