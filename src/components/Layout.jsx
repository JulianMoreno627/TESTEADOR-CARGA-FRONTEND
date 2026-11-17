import { Activity, Wifi, WifiOff } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useSocketConnected } from '../realtime/socket.js';

const NAV_ITEMS = [
  { to: '/', label: 'Nueva prueba', end: true },
  { to: '/history', label: 'Historial' },
  { to: '/compare', label: 'Comparar' },
  { to: '/targets', label: 'Dominios' },
  { to: '/system', label: 'Sistema' },
  { to: '/rendering', label: 'Renderizado' },
];

export default function Layout() {
  const connected = useSocketConnected();

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <Activity size={20} aria-hidden="true" />
            <span>Testeador de Carga</span>
          </Link>
          <nav className="nav" aria-label="Principal">
            {NAV_ITEMS.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className="nav-link">
                {label}
              </NavLink>
            ))}
          </nav>
          <span className={`connection ${connected ? 'is-online' : 'is-offline'}`} role="status">
            {connected ? <Wifi size={15} aria-hidden="true" /> : <WifiOff size={15} aria-hidden="true" />}
            {connected ? 'En vivo' : 'Sin conexión'}
          </span>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}
