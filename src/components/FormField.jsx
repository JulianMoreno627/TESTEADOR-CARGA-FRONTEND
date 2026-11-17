import { useId } from 'react';

/** Etiqueta, control, ayuda y error de un campo. `children` recibe las props de accesibilidad. */
export default function FormField({ label, hint, error, children }) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': message ? messageId : undefined })}
      {message && (
        <p id={messageId} className={error ? 'field-error' : 'field-hint'}>
          {message}
        </p>
      )}
    </div>
  );
}
