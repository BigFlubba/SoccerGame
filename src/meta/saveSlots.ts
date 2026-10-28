import type { Difficulty } from '../game/ai';
import { PROFILE_KEY, PROFILE_VERSION, isSave, profileFrom, type Profile } from './profile';
import { isRecord, readStored, removeUnlessNewer, writeUnlessNewer, type KeyValueStore } from './storage';

export const SLOT_COUNT = 5;
/** Its own small key, not a settings field: a settings version bump would make older builds load default settings. */
export const LAST_SAVE_KEY = 'harrisons-road-to-the-cup/last-save';
const LAST_SAVE_VERSION = 1;

/** Slot 1 is today's key, so his live save never moves; 2–5 add -2 to -5. */
export function slotKey(slot: number): string {
  return slot === 1 ? PROFILE_KEY : `${PROFILE_KEY}-${slot}`;
}

/** The part of window that tells a tab when another tab stores something. */
export interface StorageEvents {
  addEventListener(type: 'storage', cb: (e: { key: string | null }) => void): void;
}

export interface SaveSlots {
  /** The save in `slot`, read fresh; null when it's empty. */
  read(slot: number): Profile | null;
  /** Every slot, read fresh; index 0 is slot 1. */
  list(): (Profile | null)[];
  /** Stores at once; never throws; never over a newer build's save. */
  write(slot: number, p: Profile): void;
  /** Empties `slot`; false, leaving it, when it holds a newer build's save. */
  remove(slot: number): boolean;
  lastPlayed(): number | null;
  setLastPlayed(slot: number): void;
  /** Calls `apply` when another tab stores a save under the slot `slot()` names. A removed key or junk is ignored. */
  follow(target: StorageEvents, slot: () => number, apply: (p: Profile) => void): void;
}

/** Whether `key` now holds exactly `value`, as writeUnlessNewer stores it. */
function holds(store: KeyValueStore | null, key: string, value: unknown): boolean {
  try {
    return store?.getItem(key) === JSON.stringify(value);
  } catch {
    return false;
  }
}

const isSlot = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= SLOT_COUNT;

/**
 * The save slots in `store`, read fresh every time so another tab's saves
 * show up. A save storage didn't take (none, refused, or full) is kept in
 * memory for the session, ahead of any older copy the slot still holds, and
 * so is the last save played.
 */
export function createSaveSlots(store: KeyValueStore | null, fallbackDifficulty: Difficulty): SaveSlots {
  const unstored = new Map<number, Profile>();
  let unstoredLast: number | null = null;
  const stored = (slot: number): Profile | null => {
    const v = readStored(store, slotKey(slot));
    return isSave(v) ? profileFrom(v, fallbackDifficulty) : null;
  };
  const read = (slot: number): Profile | null => {
    const kept = unstored.get(slot);
    return kept ? structuredClone(kept) : stored(slot);
  };
  return {
    read,
    list: () => Array.from({ length: SLOT_COUNT }, (_, i) => read(i + 1)),
    write(slot, p) {
      writeUnlessNewer(store, slotKey(slot), p);
      if (holds(store, slotKey(slot), p)) unstored.delete(slot);
      else unstored.set(slot, structuredClone(p));
    },
    remove(slot) {
      if (!removeUnlessNewer(store, slotKey(slot), PROFILE_VERSION)) return false;
      unstored.delete(slot);
      return true;
    },
    lastPlayed() {
      if (unstoredLast !== null) return unstoredLast;
      const v = readStored(store, LAST_SAVE_KEY);
      return isRecord(v) && isSlot(v.slot) ? v.slot : null;
    },
    setLastPlayed(slot) {
      const value = { version: LAST_SAVE_VERSION, slot };
      writeUnlessNewer(store, LAST_SAVE_KEY, value);
      unstoredLast = holds(store, LAST_SAVE_KEY, value) ? null : slot;
    },
    follow(target, slot, apply) {
      target.addEventListener('storage', e => {
        if (e.key !== slotKey(slot())) return;
        const p = stored(slot());
        if (p) apply(p);
      });
    },
  };
}
