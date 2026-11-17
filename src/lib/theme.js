export const THEMES = Object.freeze({ LIGHT: 'light', DARK: 'dark' });
export const THEME_STORAGE_KEY = 'theme';

/**
 * El modo claro es el predeterminado: solo se usa el oscuro si el usuario lo eligió.
 * No se sigue la preferencia del sistema operativo a propósito.
 */
export function resolveTheme(stored) {
  return stored === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;
}

export function readStoredTheme(storage = globalThis.localStorage) {
  try {
    return resolveTheme(storage?.getItem(THEME_STORAGE_KEY));
  } catch {
    // Navegación privada o almacenamiento bloqueado: se queda en claro.
    return THEMES.LIGHT;
  }
}

export function applyTheme(theme, { root = globalThis.document?.documentElement, storage = globalThis.localStorage } = {}) {
  const resolved = resolveTheme(theme);
  if (root) {
    if (resolved === THEMES.DARK) root.dataset.theme = THEMES.DARK;
    else delete root.dataset.theme;
  }
  try {
    storage?.setItem(THEME_STORAGE_KEY, resolved);
  } catch {
    // Si no se puede guardar, el tema igual cambia durante esta visita.
  }
  return resolved;
}
