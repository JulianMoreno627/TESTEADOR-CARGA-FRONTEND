import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyTheme, readStoredTheme, resolveTheme, THEMES } from './theme.js';

const memoryStorage = (initial = {}) => {
  const data = { ...initial };
  return { getItem: (key) => data[key] ?? null, setItem: (key, value) => (data[key] = value), data };
};

test('el modo claro es el predeterminado', () => {
  assert.equal(resolveTheme(null), THEMES.LIGHT);
  assert.equal(resolveTheme('cualquier-cosa'), THEMES.LIGHT);
  assert.equal(readStoredTheme(memoryStorage()), THEMES.LIGHT);
});

test('recuerda el modo oscuro si el usuario lo eligió', () => {
  assert.equal(readStoredTheme(memoryStorage({ theme: 'dark' })), THEMES.DARK);
});

test('si el almacenamiento falla, se queda en claro', () => {
  const broken = { getItem() { throw new Error('bloqueado'); } };
  assert.equal(readStoredTheme(broken), THEMES.LIGHT);
});

test('aplicar el tema cambia el atributo de la página y lo guarda', () => {
  const root = { dataset: {} };
  const storage = memoryStorage();

  applyTheme(THEMES.DARK, { root, storage });
  assert.equal(root.dataset.theme, 'dark');
  assert.equal(storage.data.theme, 'dark');

  applyTheme(THEMES.LIGHT, { root, storage });
  assert.equal('theme' in root.dataset, false);
  assert.equal(storage.data.theme, 'light');
});
