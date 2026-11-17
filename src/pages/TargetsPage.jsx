import { CheckCircle2, Clock, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { targets as targetsApi } from '../api/client.js';
import CopyButton from '../components/CopyButton.jsx';
import { ErrorNotice, Loading } from '../components/Feedback.jsx';
import FormField from '../components/FormField.jsx';
import { formatDateTime } from '../lib/format.js';
import { fieldErrorsFrom } from '../lib/testForm.js';

function CopyableValue({ label, value }) {
  return (
    <div className="copyable">
      <span className="copyable-label">{label}</span>
      <div className="copyable-row">
        <code>{value}</code>
        <CopyButton text={value} label={label.toLowerCase()} />
      </div>
    </div>
  );
}

function VerificationOption({ title, description, children, busy, onVerify }) {
  return (
    <div className="verify-option">
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      {children}
      <button type="button" className="button button-secondary" disabled={busy} onClick={onVerify}>
        {busy ? 'Verificando…' : `Verificar por ${title}`}
      </button>
    </div>
  );
}

function TargetCard({ target, onChanged }) {
  const [pendingMethod, setPendingMethod] = useState(null);
  const [error, setError] = useState(null);
  const { http, dns } = target.instructions;

  const verify = async (method) => {
    setPendingMethod(method);
    setError(null);
    try {
      await targetsApi.verify(target.id, method);
      await onChanged();
    } catch (failure) {
      setError(failure);
    } finally {
      setPendingMethod(null);
    }
  };

  const remove = async () => {
    if (!window.confirm(`¿Eliminar ${target.hostname}? Tendrás que verificarlo de nuevo para probarlo.`)) return;
    try {
      await targetsApi.remove(target.id);
      await onChanged();
    } catch (failure) {
      setError(failure);
    }
  };

  return (
    <article className="card target-card">
      <header className="target-header">
        <div className="title-row">
          <h2>{target.hostname}</h2>
          {target.verified ? (
            <span className="badge tone-good">
              <CheckCircle2 size={14} aria-hidden="true" /> Verificado
            </span>
          ) : (
            <span className="badge tone-warning">
              <Clock size={14} aria-hidden="true" /> Pendiente
            </span>
          )}
        </div>
        <button type="button" className="button button-ghost button-icon" aria-label={`Eliminar ${target.hostname}`} title="Eliminar" onClick={remove}>
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </header>

      {target.verified ? (
        <p className="muted">
          Verificado por {target.method?.toUpperCase()} el {formatDateTime(target.verifiedAt)}.
        </p>
      ) : (
        <div className="verify-options">
          <VerificationOption
            title="HTTP"
            description="Publica un archivo en esta dirección con el token como único contenido."
            busy={pendingMethod === 'http'}
            onVerify={() => verify('http')}
          >
            <CopyableValue label="Archivo" value={http.url} />
            <CopyableValue label="Contenido" value={http.content} />
          </VerificationOption>
          <VerificationOption
            title="DNS"
            description="Crea un registro TXT. Puede tardar unos minutos en propagarse."
            busy={pendingMethod === 'dns'}
            onVerify={() => verify('dns')}
          >
            <CopyableValue label="Nombre" value={dns.name} />
            <CopyableValue label="Valor" value={dns.value} />
          </VerificationOption>
        </div>
      )}

      <ErrorNotice error={error} />
    </article>
  );
}

export default function TargetsPage() {
  const [params] = useSearchParams();
  const [hostname, setHostname] = useState(params.get('hostname') ?? '');
  const [items, setItems] = useState(null);
  const [listError, setListError] = useState(null);
  const [registerError, setRegisterError] = useState(null);
  const [registering, setRegistering] = useState(false);

  const load = useCallback(async (signal) => {
    try {
      setItems(await targetsApi.list({ signal }));
      setListError(null);
    } catch (failure) {
      if (failure.name !== 'AbortError') setListError(failure);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const handleRegister = async (event) => {
    event.preventDefault();
    setRegistering(true);
    setRegisterError(null);
    try {
      await targetsApi.register(hostname.trim());
      setHostname('');
      await load();
    } catch (failure) {
      setRegisterError(failure);
    } finally {
      setRegistering(false);
    }
  };

  const hostnameError = registerError?.code === 'VALIDATION_ERROR' ? fieldErrorsFrom(registerError.details).hostname : undefined;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dominios verificados</h1>
          <p className="muted">
            Antes de enviar carga a un dominio público, demuestra que lo controlas. Esto evita usar la herramienta contra sitios ajenos. <code>localhost</code> no lo necesita en desarrollo.
          </p>
        </div>
      </div>

      <form className="card register-form" onSubmit={handleRegister}>
        <FormField label="Dominio" error={hostnameError}>
          {(props) => (
            <input type="text" placeholder="api.midominio.com" autoComplete="off" value={hostname} onChange={(event) => setHostname(event.target.value)} {...props} />
          )}
        </FormField>
        <button type="submit" className="button button-primary" disabled={registering || hostname.trim() === ''}>
          <Plus size={15} aria-hidden="true" /> {registering ? 'Registrando…' : 'Registrar'}
        </button>
      </form>

      {registerError && !hostnameError && <ErrorNotice error={registerError} />}
      <ErrorNotice error={listError} />
      {!items && !listError && <Loading />}

      {items?.length === 0 && <p className="muted empty-text">Aún no has registrado dominios.</p>}
      {items?.map((target) => (
        <TargetCard key={target.id} target={target} onChanged={load} />
      ))}
    </>
  );
}
