import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, SETTINGS_KEY, VOLUME_MAX, loadSettings, saveSettings } from './settings';
import { memoryStore, throwingStore as throwing } from './testStore';

describe('settings', () => {
  it('defaults to normal difficulty, music 6, sfx 8 and rumble on at version 2, under a game-specific key', () => {
    expect(DEFAULT_SETTINGS).toEqual({ version: 2, difficulty: 'normal', musicVolume: 6, sfxVolume: 8, rumble: true });
    expect(VOLUME_MAX).toBe(10);
    expect(SETTINGS_KEY).toBe('harrisons-road-to-the-cup/settings');
  });

  it('round-trips every setting', () => {
    const store = memoryStore();
    const s = { version: 2, difficulty: 'hard', musicVolume: 0, sfxVolume: 10, rumble: false } as const;
    saveSettings(store, s);
    expect(loadSettings(store)).toEqual(s);
  });

  it('a v1 save keeps its difficulty and takes the new defaults', () => {
    const store = memoryStore({ [SETTINGS_KEY]: JSON.stringify({ version: 1, difficulty: 'hard' }) });
    expect(loadSettings(store)).toEqual({ ...DEFAULT_SETTINGS, difficulty: 'hard' });
  });

  it('a bad volume falls back to its default, not the whole save', () => {
    const load = (extra: object) =>
      loadSettings(memoryStore({ [SETTINGS_KEY]: JSON.stringify({ version: 2, difficulty: 'easy', musicVolume: 3, sfxVolume: 4, rumble: false, ...extra }) }));
    expect(load({ musicVolume: 99 })).toEqual({ version: 2, difficulty: 'easy', musicVolume: 6, sfxVolume: 4, rumble: false });
    expect(load({ sfxVolume: '7' })).toEqual({ version: 2, difficulty: 'easy', musicVolume: 3, sfxVolume: 8, rumble: false });
    expect(load({ rumble: 'yes' })).toEqual({ version: 2, difficulty: 'easy', musicVolume: 3, sfxVolume: 4, rumble: true });
  });

  it('volumes are whole numbers 0–10', () => {
    const load = (musicVolume: number) => loadSettings(memoryStore({ [SETTINGS_KEY]: JSON.stringify({ ...DEFAULT_SETTINGS, musicVolume }) })).musicVolume;
    expect(load(3.6)).toBe(4);
    expect(load(-1)).toBe(6);
    expect(load(0)).toBe(0);
    expect(load(10)).toBe(10);
  });

  it('falls back to defaults for missing or corrupt data', () => {
    expect(loadSettings(memoryStore())).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
    for (const bad of ['{', 'null', '42', '"hard"', '[]', '{"version":1,"difficulty":"insane"}', '{"version":1}', '{"difficulty":"easy"}', '{"version":1,"difficulty":"toString"}']) {
      expect(loadSettings(memoryStore({ [SETTINGS_KEY]: bad })), bad).toEqual(DEFAULT_SETTINGS);
    }
  });

  it('ignores and preserves settings from a newer version', () => {
    const newer = JSON.stringify({ version: 3, difficulty: 'easy', volume: 3 });
    const store = memoryStore({ [SETTINGS_KEY]: newer });
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);
    saveSettings(store, { ...DEFAULT_SETTINGS, difficulty: 'hard' });
    expect(store.data[SETTINGS_KEY]).toBe(newer);
  });

  it('survives a store that throws', () => {
    expect(loadSettings(throwing)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(throwing, { ...DEFAULT_SETTINGS })).not.toThrow();
    expect(() => saveSettings(null, { ...DEFAULT_SETTINGS })).not.toThrow();
  });

  it('returns a fresh copy, so callers can change it', () => {
    const a = loadSettings(null);
    a.difficulty = 'hard';
    expect(loadSettings(null).difficulty).toBe('normal');
  });
});
