/** The parts of localStorage the saves need; injectable for tests and for browsers without it. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** The value stored under `key`, parsed; null if missing, unreadable or refused. */
export function readStored(store: KeyValueStore | null, key: string): unknown {
  try {
    const raw = store?.getItem(key);
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const isNewer = (old: unknown, version: number): boolean => isRecord(old) && typeof old.version === 'number' && old.version > version;

/**
 * Saves `value` under `key`. Never throws (private browsing can refuse
 * storage), and leaves a save from a newer build alone, so a rollback never
 * loses it.
 */
export function writeUnlessNewer(store: KeyValueStore | null, key: string, value: { version: number }): void {
  try {
    if (!store) return;
    if (isNewer(readStored(store, key), value.version)) return;
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: it lasts until the page closes.
  }
}

/** Removes `key`; false, leaving it, when it holds a record whose version is above `version`. Never throws. */
export function removeUnlessNewer(store: KeyValueStore | null, key: string, version: number): boolean {
  if (isNewer(readStored(store, key), version)) return false;
  try {
    store?.removeItem(key);
  } catch {
    // Storage unavailable: there's nothing stored to remove.
  }
  return true;
}
