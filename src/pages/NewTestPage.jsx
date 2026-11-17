import { Play, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadTests } from '../api/client.js';
import { ErrorNotice } from '../components/Feedback.jsx';
import FormField from '../components/FormField.jsx';
import PatternPreview from '../components/PatternPreview.jsx';
import { buildPayload, fieldErrorsFrom, INITIAL_FORM, methodAllowsBody, METHODS, validateForm } from '../lib/testForm.js';

const PATTERNS = [
  { value: 'constant', label: 'Constante', description: 'Todos los usuarios desde el inicio.' },
  { value: 'ramp', label: 'Rampa', description: 'Los usuarios aumentan de forma gradual.' },
  { value: 'spike', label: 'Picos', description: 'Carga base con ráfagas de todos los usuarios.' },
];

// Rutas de `npm run demo:target` en el backend.
const DEMO_ROUTES = ['fast', 'slow', 'flaky', 'heavy'];
const TARGET_ERROR_CODES = new Set(['TARGET_NOT_VERIFIED', 'TARGET_VERIFICATION_FAILED']);

// Solo en memoria: sobrevive al cambiar de página para repetir una prueba, pero nunca
// se escribe en el navegador, porque los headers pueden llevar credenciales.
let savedDraft = null;

function hostnameOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function PatternFields({ form, errors, numberInput }) {
  if (form.patternType === 'ramp') {
    return (
      <div className="field-row">
        <FormField label="Usuarios iniciales" hint="Por defecto, 1." error={errors['pattern.startVus']}>
          {(props) => numberInput('startVus', props)}
        </FormField>
        <FormField label="Segundos de subida" hint="Por defecto, toda la prueba." error={errors['pattern.rampSeconds']}>
          {(props) => numberInput('rampSeconds', props)}
        </FormField>
      </div>
    );
  }
  if (form.patternType === 'spike') {
    return (
      <div className="field-row field-row-3">
        <FormField label="Usuarios base" hint="Por defecto, el 10 %." error={errors['pattern.baseVus']}>
          {(props) => numberInput('baseVus', props)}
        </FormField>
        <FormField label="Número de picos" hint="Por defecto, 2." error={errors['pattern.spikes']}>
          {(props) => numberInput('spikes', props)}
        </FormField>
        <FormField label="Segundos por pico" hint="Por defecto, ¼ del periodo." error={errors['pattern.spikeSeconds']}>
          {(props) => numberInput('spikeSeconds', props)}
        </FormField>
      </div>
    );
  }
  return null;
}

export default function NewTestPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(savedDraft ?? INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    savedDraft = form;
  }, [form]);

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setSubmitError(null);
    setFieldErrors(({ [name]: _field, [`pattern.${name}`]: _patternField, ...rest }) => rest);
  };

  const bind = (name) => ({ value: form[name], onChange: (event) => setField(name, event.target.value) });
  const numberInput = (name, props) => <input type="number" min="0" step="1" inputMode="numeric" {...props} {...bind(name)} />;

  const setHeader = (index, changes) =>
    setForm((current) => ({
      ...current,
      headers: current.headers.map((header, position) => (position === index ? { ...header, ...changes } : header)),
    }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError(null);

    const clientErrors = validateForm(form);
    setFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setSubmitting(true);
    try {
      const run = await loadTests.start(buildPayload(form));
      navigate(`/tests/${run.id}`);
    } catch (error) {
      setFieldErrors(error.code === 'VALIDATION_ERROR' ? fieldErrorsFrom(error.details) : {});
      setSubmitError(error);
      setSubmitting(false);
    }
  };

  const hostname = hostnameOf(form.url);
  const payloadPreview = buildPayload(form);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Nueva prueba de carga</h1>
          <p className="muted">Simula usuarios concurrentes contra tu API y mide cómo responde en tiempo real.</p>
        </div>
      </div>

      <form className="new-test" onSubmit={handleSubmit} noValidate>
        <div className="new-test-main">
          <section className="card">
            <h2>Destino</h2>
            <div className="field-row field-row-url">
              <FormField label="Método">
                {(props) => (
                  <select {...props} {...bind('method')}>
                    {METHODS.map((method) => (
                      <option key={method}>{method}</option>
                    ))}
                  </select>
                )}
              </FormField>
              <FormField label="URL" error={fieldErrors.url}>
                {(props) => <input type="url" placeholder="http://localhost:4000/slow" autoComplete="off" {...props} {...bind('url')} />}
              </FormField>
            </div>

            {import.meta.env.DEV && (
              <div className="demo-routes">
                <span className="muted">API de ejemplo:</span>
                {DEMO_ROUTES.map((route) => (
                  <button key={route} type="button" className="chip" onClick={() => setField('url', `http://localhost:4000/${route}`)}>
                    /{route}
                  </button>
                ))}
              </div>
            )}

            <FormField label="Nombre" hint="Opcional. Sirve para reconocerla en el historial." error={fieldErrors.name}>
              {(props) => <input type="text" maxLength={120} placeholder="Antes de la optimización" {...props} {...bind('name')} />}
            </FormField>
          </section>

          <section className="card">
            <h2>Carga</h2>
            <div className="field-row">
              <FormField label="Usuarios virtuales (VUs)" hint="El servidor admite hasta 500 por defecto." error={fieldErrors.vus}>
                {(props) => numberInput('vus', props)}
              </FormField>
              <FormField label="Duración (segundos)" hint="El servidor admite hasta 300 por defecto." error={fieldErrors.durationSeconds}>
                {(props) => numberInput('durationSeconds', props)}
              </FormField>
            </div>

            <fieldset className="pattern-options">
              <legend>Patrón de carga</legend>
              <div className="segmented">
                {PATTERNS.map(({ value, label, description }) => (
                  <label key={value} className={form.patternType === value ? 'is-selected' : undefined}>
                    <input
                      type="radio"
                      name="patternType"
                      value={value}
                      checked={form.patternType === value}
                      onChange={() => setField('patternType', value)}
                    />
                    <strong>{label}</strong>
                    <span>{description}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <PatternFields form={form} errors={fieldErrors} numberInput={numberInput} />
          </section>

          <details className="card advanced">
            <summary>Opciones avanzadas</summary>

            <div className="field-row">
              <FormField label="Pausa entre peticiones (ms)" hint="Espera de cada VU tras recibir respuesta." error={fieldErrors.thinkTimeMs}>
                {(props) => numberInput('thinkTimeMs', props)}
              </FormField>
              <FormField label="Tiempo límite por petición (ms)" hint="De 100 a 60 000." error={fieldErrors.timeoutMs}>
                {(props) => numberInput('timeoutMs', props)}
              </FormField>
            </div>

            <div className="field">
              <span className="label-text">Headers</span>
              {form.headers.map((header, index) => (
                <div className="header-row" key={index}>
                  <input
                    type="text"
                    placeholder="Authorization"
                    aria-label={`Nombre del header ${index + 1}`}
                    autoComplete="off"
                    value={header.name}
                    onChange={(event) => setHeader(index, { name: event.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Valor"
                    aria-label={`Valor del header ${index + 1}`}
                    autoComplete="off"
                    value={header.value}
                    onChange={(event) => setHeader(index, { value: event.target.value })}
                  />
                  <button
                    type="button"
                    className="button button-ghost button-icon"
                    aria-label={`Quitar header ${index + 1}`}
                    onClick={() => setForm((current) => ({ ...current, headers: current.headers.filter((_, position) => position !== index) }))}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              ))}
              {fieldErrors.headers && <p className="field-error">{fieldErrors.headers}</p>}
              <button
                type="button"
                className="button button-secondary button-small"
                onClick={() => setForm((current) => ({ ...current, headers: [...current.headers, { name: '', value: '' }] }))}
              >
                <Plus size={15} aria-hidden="true" /> Agregar header
              </button>
              <p className="field-hint">El backend oculta las credenciales antes de guardar la prueba.</p>
            </div>

            {methodAllowsBody(form.method) && (
              <FormField label="Cuerpo" hint="Hasta 64 KB. Un JSON se envía con su Content-Type. No se guarda en el historial." error={fieldErrors.body}>
                {(props) => <textarea rows={5} spellCheck={false} placeholder='{ "clave": "valor" }' {...props} {...bind('body')} />}
              </FormField>
            )}
          </details>
        </div>

        <aside className="new-test-side">
          <section className="card">
            <h2>Forma de la carga</h2>
            <PatternPreview vus={payloadPreview.vus} durationSeconds={payloadPreview.durationSeconds} pattern={payloadPreview.pattern} />
          </section>

          {submitError && (
            <ErrorNotice error={submitError}>
              {TARGET_ERROR_CODES.has(submitError.code) && (
                <p>
                  <Link to={`/targets${hostname ? `?hostname=${encodeURIComponent(hostname)}` : ''}`}>Verificar este dominio</Link>
                </p>
              )}
            </ErrorNotice>
          )}

          <button type="submit" className="button button-primary button-large" disabled={submitting}>
            <Play size={17} aria-hidden="true" /> {submitting ? 'Iniciando…' : 'Iniciar prueba'}
          </button>

          <p className="side-note">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>
              Prueba solo sistemas que controlas. Los dominios públicos requieren <Link to="/targets">verificar su propiedad</Link>; las redes internas están bloqueadas.
            </span>
          </p>
        </aside>
      </form>
    </>
  );
}
