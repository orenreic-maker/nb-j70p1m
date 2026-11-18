import { Preferences } from '@capacitor/preferences';
import { STORAGE_KEY } from './config.js';
import { blank, migrate } from './model.js';

export let st = blank();
let persist = true;

export function now() {
  return st.freezeNow || Date.now();
}

export async function load() {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (value) {
      st = migrate(JSON.parse(value));
      return;
    }
  } catch { /* web or empty */ }
  st = blank();
}

export async function save() {
  if (!persist) return;
  const copy = { ...st, freezeNow: undefined };
  const data = JSON.stringify(copy);
  try { await Preferences.set({ key: STORAGE_KEY, value: data }); } catch { /* quota */ }
}

export function useMemory(next) {
  st = next;
  persist = false;
}

export function canPersist() {
  return persist;
}
