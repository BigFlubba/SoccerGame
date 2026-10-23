import { DIFFICULTY, type Difficulty } from '../game/ai';

/** Player settings, versioned so a later build can always read them. */
export interface Settings {
  version: 1;
  difficulty: Difficulty;
}

/** Game-specific, so it never clashes with other pages on the same site. */
export const SETTINGS_KEY = 'harrisons-road-to-the-cup/settings';
const VERSION = 1;
export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({ version: VERSION, difficulty: 'normal' });

/** The parts of localStorage settings need; injectable for tests and for browsers without it. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** The stored settings, parsed; null if missing or unreadable. */
function readStored(store: KeyValueStore | null): unknown {
  try {
    const raw = store?.getItem(SETTINGS_KEY);
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
/** Saved by a newer build than this one: left alone, so a rollback never loses it. */
const isNewer = (v: unknown): boolean => isRecord(v) && typeof v.version === 'number' && v.version > VERSION;

/** Loads settings, falling back to the defaults for anything missing, broken or from a newer build. */
export function loadSettings(store: KeyValueStore | null): Settings {
  const v = readStored(store);
  if (!isRecord(v) || v.version !== VERSION || typeof v.difficulty !== 'string' || !Object.hasOwn(DIFFICULTY, v.difficulty)) {
    return { ...DEFAULT_SETTINGS };
  }
  return { version: VERSION, difficulty: v.difficulty as Difficulty };
}

/** Saves settings. Never throws (private browsing can refuse storage), and never overwrites a newer build's settings. */
export function saveSettings(store: KeyValueStore | null, s: Settings): void {
  try {
    if (!store || isNewer(readStored(store))) return;
    store.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // Storage unavailable: the setting lasts until the page closes.
  }
}
