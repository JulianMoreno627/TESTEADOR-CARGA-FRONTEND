import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="card empty">
      <h1>Página no encontrada</h1>
      <Link to="/" className="button button-primary">Ir a nueva prueba</Link>
    </div>
  );
}
