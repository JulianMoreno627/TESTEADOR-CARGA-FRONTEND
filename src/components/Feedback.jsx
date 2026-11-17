import { AlertTriangle, ArrowLeftRight, Ban, CheckCircle2, CircleHelp, Loader2, Minus, XCircle } from 'lucide-react';

const RUN_STATUS = {
  running: { label: 'En ejecución', tone: 'info', Icon: Loader2, spin: true },
  completed: { label: 'Completada', tone: 'good', Icon: CheckCircle2 },
  stopped: { label: 'Detenida', tone: 'warning', Icon: Ban },
  failed: { label: 'Fallida', tone: 'critical', Icon: XCircle },
};

const VERDICTS = {
  improved: { label: 'Mejoró', tone: 'good', Icon: CheckCircle2 },
  regressed: { label: 'Empeoró', tone: 'critical', Icon: AlertTriangle },
  mixed: { label: 'Mixto', tone: 'warning', Icon: ArrowLeftRight },
  unchanged: { label: 'Sin cambios', tone: 'neutral', Icon: Minus },
  unknown: { label: 'Sin datos', tone: 'neutral', Icon: CircleHelp },
};

/** El estado siempre lleva icono y texto: nunca depende solo del color. */
function Badge({ label, tone, Icon, spin }) {
  return (
    <span className={`badge tone-${tone}`}>
      <Icon size={14} aria-hidden="true" className={spin ? 'spin' : undefined} />
      {label}
    </span>
  );
}

export const StatusBadge = ({ status }) => <Badge {...(RUN_STATUS[status] ?? RUN_STATUS.failed)} />;

export const VerdictBadge = ({ verdict }) => <Badge {...(VERDICTS[verdict] ?? VERDICTS.unknown)} />;

export function ErrorNotice({ error, children }) {
  if (!error && !children) return null;
  return (
    <div className="notice notice-error" role="alert">
      <AlertTriangle size={18} aria-hidden="true" />
      <div>
        {error && <p>{error.message ?? String(error)}</p>}
        {children}
      </div>
    </div>
  );
}

export const Loading = ({ children = 'Cargando…' }) => (
  <p className="muted loading">
    <Loader2 size={16} className="spin" aria-hidden="true" /> {children}
  </p>
);
