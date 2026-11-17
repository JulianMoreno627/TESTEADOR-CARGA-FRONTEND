import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

const RESET_MS = 1500;

export default function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), RESET_MS);
  };

  return (
    <button type="button" className="button button-ghost button-icon" onClick={copy} aria-label={`Copiar ${label}`} title={`Copiar ${label}`}>
      {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
    </button>
  );
}
