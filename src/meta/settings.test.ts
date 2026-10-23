import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, SETTINGS_KEY, loadSettings, saveSettings, type KeyValueStore } from './settings';

/** An in-memory store, standing in for localStorage. */
function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: k => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
}

const throwing: KeyValueStore = {
  getItem: () => {
    throw new Error('denied');
  },
  setItem: () => {
    throw new Error('denied');
  },
};

describe('settings', () => {
  it('defaults to normal difficulty at version 1, under a game-specific key', () => {
    expect(DEFAULT_SETTINGS).toEqual({ version: 1, difficulty: 'normal' });
    expect(SETTINGS_KEY).toBe('harrisons-road-to-the-cup/settings');
  });

  it('round-trips a difficulty', () => {
    const store = memoryStore();
    saveSettings(store, { version: 1, difficulty: 'hard' });
    expect(loadSettings(store)).toEqual({ version: 1, difficulty: 'hard' });
  });

  it('falls back to defaults for missing or corrupt data', () => {
    expect(loadSettings(memoryStore())).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
    for (const bad of ['{', 'null', '42', '"hard"', '[]', '{"version":1,"difficulty":"insane"}', '{"version":1}', '{"difficulty":"easy"}', '{"version":1,"difficulty":"toString"}']) {
      expect(loadSettings(memoryStore({ [SETTINGS_KEY]: bad })), bad).toEqual(DEFAULT_SETTINGS);
    }
  });

  it('ignores and preserves settings from a newer version', () => {
    const newer = JSON.stringify({ version: 2, difficulty: 'easy', volume: 3 });
    const store = memoryStore({ [SETTINGS_KEY]: newer });
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);
    saveSettings(store, { version: 1, difficulty: 'hard' });
    expect(store.data[SETTINGS_KEY]).toBe(newer);
  });

  it('survives a store that throws', () => {
    expect(loadSettings(throwing)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(throwing, { version: 1, difficulty: 'easy' })).not.toThrow();
    expect(() => saveSettings(null, { version: 1, difficulty: 'easy' })).not.toThrow();
  });

  it('returns a fresh copy, so callers can change it', () => {
    const a = loadSettings(null);
    a.difficulty = 'hard';
    expect(loadSettings(null).difficulty).toBe('normal');
  });
});
