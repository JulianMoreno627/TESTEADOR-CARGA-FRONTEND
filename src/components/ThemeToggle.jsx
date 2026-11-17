import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { applyTheme, readStoredTheme, THEMES } from '../lib/theme.js';

/** Cambia entre modo claro (predeterminado) y oscuro, y recuerda la elección. */
export default function ThemeToggle() {
  const [theme, setTheme] = useState(readStoredTheme);
  const isDark = theme === THEMES.DARK;

  const toggle = () => setTheme(applyTheme(isDark ? THEMES.LIGHT : THEMES.DARK));

  return (
    <button
      type="button"
      className="button button-ghost button-icon theme-toggle"
      onClick={toggle}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
    >
      {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}
