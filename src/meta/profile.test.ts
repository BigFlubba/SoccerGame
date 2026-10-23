import { describe, expect, it } from 'vitest';
import { LADDER_MATCHES, PROFILE_KEY, loadProfile, newProfile, saveProfile, type Profile } from './profile';
import type { KeyValueStore } from './storage';

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

const stored = (v: unknown) => memoryStore({ [PROFILE_KEY]: JSON.stringify(v) });

const ZERO_TOTALS = { matches: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, styleGoals: 0, xpEarned: 0 };

/** A save with something in every field. */
const SOME: Profile = {
  version: 1,
  coins: 420,
  level: 3,
  xp: 35,
  stats: { speed: 3, power: 2, jump: 1, control: 4 },
  ladderWins: 4,
  dailyWinDate: '2026-10-22',
  totals: { matches: 9, wins: 5, draws: 1, losses: 3, goalsFor: 17, goalsAgainst: 9, styleGoals: 4, xpEarned: 610 },
};

describe('profile', () => {
  it('a missing save is a new profile under a game-specific key', () => {
    expect(loadProfile(memoryStore())).toEqual(newProfile());
    expect(newProfile()).toEqual({
      version: 1,
      coins: 0,
      level: 1,
      xp: 0,
      stats: { speed: 1, power: 1, jump: 1, control: 1 },
      ladderWins: 0,
      dailyWinDate: null,
      totals: ZERO_TOTALS,
    });
    expect(PROFILE_KEY.startsWith('harrisons-road-to-the-cup/')).toBe(true);
    expect(LADDER_MATCHES).toBe(10);
  });

  it('round-trips every field', () => {
    const store = memoryStore();
    saveProfile(store, SOME);
    expect(loadProfile(store)).toEqual(SOME);
  });

  it('each bad field falls back alone', () => {
    const store = stored({
      ...SOME,
      coins: -5,
      level: 0,
      xp: 'x',
      stats: { speed: '3', power: 4, control: 12 },
      ladderWins: 99,
      dailyWinDate: 7,
      totals: null,
    });
    expect(loadProfile(store)).toEqual({
      version: 1,
      coins: 0,
      level: 1,
      xp: 0,
      stats: { speed: 1, power: 4, jump: 1, control: 10 },
      ladderWins: 10,
      dailyWinDate: null,
      totals: ZERO_TOTALS,
    });
  });

  it('a bad total falls back alone too', () => {
    const p = loadProfile(stored({ ...SOME, totals: { ...SOME.totals, wins: 'many', goalsFor: -1 } }));
    expect(p.totals).toEqual({ ...SOME.totals, wins: 0, goalsFor: 0 });
  });

  it('counts are whole numbers', () => {
    const p = loadProfile(stored({ ...SOME, coins: 12.7, level: 2.5, stats: { ...SOME.stats, speed: 3.9 } }));
    expect(p.coins).toBe(12);
    expect(p.level).toBe(2);
    expect(p.stats.speed).toBe(3);
  });

  it('a newer save is read best-effort and never written over', () => {
    const store = stored({ ...SOME, version: 2, coins: 300, gems: 5 });
    const before = store.data[PROFILE_KEY];
    expect(loadProfile(store).coins).toBe(300);
    saveProfile(store, { ...newProfile(), coins: 0 });
    expect(store.data[PROFILE_KEY]).toBe(before);
  });

  it('not a save at all loads a new profile', () => {
    for (const raw of ['[]', 'null', '{"version":"1"}', '{"version":0,"coins":50}', '{"coins":', '"hello"']) {
      expect(loadProfile(memoryStore({ [PROFILE_KEY]: raw })), raw).toEqual(newProfile());
    }
  });

  it('survives a store that throws', () => {
    expect(loadProfile(throwing)).toEqual(newProfile());
    expect(() => saveProfile(throwing, SOME)).not.toThrow();
    expect(loadProfile(null)).toEqual(newProfile());
    expect(() => saveProfile(null, SOME)).not.toThrow();
  });

  it('returns a fresh copy', () => {
    const store = stored(SOME);
    const a = loadProfile(store);
    a.stats.speed = 9;
    a.totals.wins = 99;
    expect(loadProfile(store)).toEqual(SOME);
    const n = newProfile();
    n.stats.power = 7;
    n.totals.matches = 3;
    expect(newProfile().stats.power).toBe(1);
    expect(newProfile().totals.matches).toBe(0);
  });
});
