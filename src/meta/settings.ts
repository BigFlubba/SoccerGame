import { DIFFICULTY, type Difficulty } from '../game/ai';

/** Player settings, versioned so a later build can always read them. */
export interface Settings {
  version: 2;
  difficulty: Difficulty;
  /** 0–VOLUME_MAX. */
  musicVolume: number;
  /** 0–VOLUME_MAX. */
  sfxVolume: number;
  rumble: boolean;
}

/** Game-specific, so it never clashes with other pages on the same site. */
export const SETTINGS_KEY = 'harrisons-road-to-the-cup/settings';
const VERSION = 2;
export const VOLUME_MAX = 10;
export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({ version: VERSION, difficulty: 'normal', musicVolume: 6, sfxVolume: 8, rumble: true });

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

const difficultyOr = (v: unknown, d: Difficulty): Difficulty => (typeof v === 'string' && Object.hasOwn(DIFFICULTY, v) ? (v as Difficulty) : d);
/** A whole volume 0–VOLUME_MAX; anything else is the default. */
const volumeOr = (v: unknown, d: number): number => (typeof v === 'number' && v >= 0 && v <= VOLUME_MAX ? Math.round(v) : d);

/**
 * Loads settings field by field, so one bad value falls back to its own
 * default. A version 1 save keeps its difficulty. Missing, broken or newer
 * saves load the defaults.
 */
export function loadSettings(store: KeyValueStore | null): Settings {
  const v = readStored(store);
  const d = DEFAULT_SETTINGS;
  if (!isRecord(v) || (v.version !== 1 && v.version !== VERSION)) return { ...d };
  if (v.version === 1) return { ...d, difficulty: difficultyOr(v.difficulty, d.difficulty) };
  return {
    version: VERSION,
    difficulty: difficultyOr(v.difficulty, d.difficulty),
    musicVolume: volumeOr(v.musicVolume, d.musicVolume),
    sfxVolume: volumeOr(v.sfxVolume, d.sfxVolume),
    rumble: typeof v.rumble === 'boolean' ? v.rumble : d.rumble,
  };
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
