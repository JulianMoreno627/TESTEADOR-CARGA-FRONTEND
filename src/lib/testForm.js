export const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD', 'OPTIONS']);

export const methodAllowsBody = (method) => !METHODS_WITHOUT_BODY.has(method);

export const INITIAL_FORM = Object.freeze({
  name: '',
  url: '',
  method: 'GET',
  vus: '50',
  durationSeconds: '30',
  patternType: 'constant',
  startVus: '',
  rampSeconds: '',
  baseVus: '',
  spikes: '',
  spikeSeconds: '',
  thinkTimeMs: '0',
  timeoutMs: '10000',
  headers: [],
  body: '',
});

const isBlank = (value) => String(value).trim() === '';

/** Añade solo los campos opcionales que el usuario llenó. */
function numericFields(form, names) {
  const fields = {};
  for (const name of names) {
    if (!isBlank(form[name])) fields[name] = Number(form[name]);
  }
  return fields;
}

function buildPattern(form) {
  if (form.patternType === 'ramp') return { type: 'ramp', ...numericFields(form, ['startVus', 'rampSeconds']) };
  if (form.patternType === 'spike') return { type: 'spike', ...numericFields(form, ['baseVus', 'spikes', 'spikeSeconds']) };
  return { type: 'constant' };
}

/** Un JSON de objeto o lista se envía como tal, y así el backend añade su Content-Type. */
function parseBody(text) {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
  } catch {
    // No es JSON: se envía como texto.
  }
  return text;
}

/** Convierte el estado del formulario en el cuerpo de POST /api/v1/load-tests. */
export function buildPayload(form) {
  const payload = {
    url: form.url.trim(),
    method: form.method,
    vus: Number(form.vus),
    durationSeconds: Number(form.durationSeconds),
    pattern: buildPattern(form),
    ...numericFields(form, ['thinkTimeMs', 'timeoutMs']),
  };

  if (!isBlank(form.name)) payload.name = form.name.trim();

  const headers = form.headers.filter(({ name }) => !isBlank(name));
  if (headers.length > 0) {
    payload.headers = Object.fromEntries(headers.map(({ name, value }) => [name.trim(), value]));
  }

  if (methodAllowsBody(form.method) && !isBlank(form.body)) payload.body = parseBody(form.body);

  return payload;
}

/** Errores que no vale la pena enviar al servidor. Los límites los valida el backend. */
export function validateForm(form) {
  const errors = {};
  if (isBlank(form.url)) errors.url = 'Escribe la URL que quieres probar.';
  if (!(Number(form.vus) >= 1)) errors.vus = 'Debe haber al menos 1 usuario virtual.';
  if (!(Number(form.durationSeconds) >= 1)) errors.durationSeconds = 'La duración debe ser de al menos 1 segundo.';
  return errors;
}

/** El backend deja en inglés los mensajes por defecto de Zod sobre límites numéricos. */
export function translateFieldMessage(message) {
  const limit = /^Too (?:big|small): expected \w+ to (?:be|have) (<=|>=|<|>)\s?([\d.,]+)/.exec(message);
  if (limit) {
    const texts = { '<=': 'como máximo', '>=': 'al menos', '<': 'menor que', '>': 'mayor que' };
    return `Debe ser ${texts[limit[1]]} ${limit[2]}.`;
  }
  if (/expected int/i.test(message)) return 'Debe ser un número entero.';
  return message;
}

/** Pasa `details` de VALIDATION_ERROR a un mapa de campo → mensaje. */
export function fieldErrorsFrom(details) {
  if (!Array.isArray(details)) return {};
  const errors = {};
  for (const { field, message } of details) {
    const key = field.split('.').slice(0, field.startsWith('pattern.') ? 2 : 1).join('.');
    errors[key] ??= translateFieldMessage(message);
  }
  return errors;
}
