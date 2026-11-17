/**
 * Contract-first: el contrato OpenAPI vive en el repositorio del backend y es la
 * fuente de verdad. Este script trae la versión publicada y la deja en
 * contract/openapi.yaml; después, `npm test` comprueba que el cliente siga cumpliéndolo.
 *
 * Uso: npm run contract:sync
 *      CONTRACT_URL=http://localhost:3000/api/v1/openapi.yaml npm run contract:sync
 */
import { writeFile } from 'node:fs/promises';

const DEFAULT_URL = 'https://raw.githubusercontent.com/JulianMoreno627/TESTEADOR-CARGA-BACKEND/main/contract/openapi.yaml';
const url = process.env.CONTRACT_URL ?? DEFAULT_URL;
const target = new URL('../contract/openapi.yaml', import.meta.url);

const response = await fetch(url);
if (!response.ok) {
  console.error(`No se pudo descargar el contrato de ${url}: HTTP ${response.status}`);
  process.exit(1);
}

const text = await response.text();
if (!text.startsWith('openapi:')) {
  console.error('La respuesta no parece un contrato OpenAPI.');
  process.exit(1);
}

await writeFile(target, text);
console.log(`Contrato actualizado desde ${url}`);
