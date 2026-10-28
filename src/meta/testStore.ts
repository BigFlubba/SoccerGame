import type { KeyValueStore } from './storage';

/** An in-memory store, standing in for localStorage. */
export function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: k => data[k] ?? null,
    setItem: (k, v) => void (data[k] = v),
    removeItem: k => void delete data[k],
  };
}

/** A store that refuses everything, as some private modes do. */
export const throwingStore: KeyValueStore = {
  getItem: () => {
    throw new Error('denied');
  },
  setItem: () => {
    throw new Error('denied');
  },
  removeItem: () => {
    throw new Error('denied');
  },
};
