import { AlertTriangle, CheckCircle2, Info, Sparkles, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { analysis as analysisApi } from '../api/client.js';
import { formatDateTime, formatMs } from '../lib/format.js';
import { ErrorNotice, Loading } from './Feedback.jsx';

const VERDICTS = {
  healthy: { label: 'Saludable', tone: 'good', Icon: CheckCircle2 },
  degraded: { label: 'Degradada', tone: 'warning', Icon: AlertTriangle },
  critical: { label: 'Crítica', tone: 'critical', Icon: XCircle },
};

const SEVERITIES = {
  info: { label: 'Información', tone: 'info', Icon: Info },
  warning: { label: 'Advertencia', tone: 'warning', Icon: AlertTriangle },
  critical: { label: 'Crítico', tone: 'critical', Icon: XCircle },
};

const PROVIDERS = { gemini: 'Gemini', groq: 'Groq' };

function Tag({ label, tone, Icon }) {
  return (
    <span className={`badge tone-${tone}`}>
      <Icon size={14} aria-hidden="true" /> {label}
    </span>
  );
}

function AnalysisResult({ analysis }) {
  const { content } = analysis;
  return (
    <>
      <p>
        <Tag {...VERDICTS[content.verdict]} />
      </p>
      <p className="ai-summary">{content.summary}</p>

      {content.findings.length > 0 && (
        <>
          <h3>Hallazgos</h3>
          <ul className="ai-findings">
            {content.findings.map((finding) => (
              <li key={finding.title}>
                <Tag {...SEVERITIES[finding.severity]} />
                <div>
                  <strong>{finding.title}</strong>
                  <p>{finding.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {content.recommendations.length > 0 && (
        <>
          <h3>Recomendaciones</h3>
          <ol className="ai-recommendations">
            {content.recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </>
      )}

      <p className="field-hint">
        Generado por {PROVIDERS[analysis.provider]} ({analysis.model}) en {formatMs(analysis.durationMs)}
        {analysis.fallbackUsed && ', como respaldo porque Gemini no estaba disponible'} · {formatDateTime(analysis.generatedAt)}.
        La IA puede equivocarse: contrasta sus conclusiones con las métricas.
      </p>
    </>
  );
}

/**
 * Análisis con IA de una prueba terminada. Primero consulta si ya existe (GET) y
 * solo lo genera (POST) cuando el usuario lo pide, para no gastar la cuota gratuita.
 */
export default function AiAnalysisPanel({ testId }) {
  const [state, setState] = useState({ status: 'loading', analysis: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    analysisApi
      .get(testId, { signal: controller.signal })
      .then((analysis) => setState({ status: 'ready', analysis, error: null }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        if (error.code === 'ANALYSIS_NOT_FOUND') setState({ status: 'empty', analysis: null, error: null });
        else setState({ status: 'empty', analysis: null, error });
      });
    return () => controller.abort();
  }, [testId]);

  const generate = async () => {
    setState({ status: 'generating', analysis: null, error: null });
    try {
      setState({ status: 'ready', analysis: await analysisApi.create(testId), error: null });
    } catch (error) {
      setState({ status: 'empty', analysis: null, error });
    }
  };

  return (
    <section className="card ai-panel" aria-labelledby="ai-title" aria-busy={state.status === 'generating'}>
      <h2 id="ai-title">
        <Sparkles size={18} aria-hidden="true" /> Análisis con IA
      </h2>

      {state.status === 'loading' && <Loading>Buscando un análisis previo…</Loading>}
      {state.status === 'generating' && <Loading>La IA está analizando los resultados…</Loading>}
      {state.status === 'ready' && <AnalysisResult analysis={state.analysis} />}

      {state.status === 'empty' && (
        <>
          <p className="muted">
            Gemini revisa las métricas de esta prueba y explica qué pasó, dónde empezó a degradarse la API y qué
            podrías mejorar. Si Gemini no responde, lo hace Groq.
          </p>
          <ErrorNotice error={state.error} />
          <button type="button" className="button button-primary" onClick={generate}>
            <Sparkles size={16} aria-hidden="true" /> Analizar con IA
          </button>
        </>
      )}
    </section>
  );
}
