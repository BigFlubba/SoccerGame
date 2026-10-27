import { describe, expect, it } from 'vitest';
import { addXp } from './economy';
import { LADDER_MATCHES, MAX_LOADED, PROFILE_KEY, followProfile, loadProfile, newProfile, saveProfile, type Profile } from './profile';
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
  version: 3,
  coins: 420,
  level: 3,
  xp: 35,
  stats: { speed: 3, power: 2, jump: 1, control: 4 },
  ladderWins: 4,
  dailyWinDate: '2026-10-22',
  totals: { matches: 9, wins: 5, draws: 1, losses: 3, goalsFor: 17, goalsAgainst: 9, styleGoals: 4, xpEarned: 610 },
  powerMoves: { owned: ['energyWave'], equipped: 'energyWave' },
  powerForms: { owned: [], equipped: null },
  career: { stars: { 'backyard-1': 1, 'backyard-2': 1, 'backyard-3': 2, 'backyard-4': 3 }, milestonesPaid: 0, lossStreaks: { 'backyard-boss': 2 } },
};

const NO_POWER = { owned: [], equipped: null };
const NO_CAREER = { stars: {}, milestonesPaid: 0, lossStreaks: {} };
/** The retro stars for four ladder wins. */
const FOUR_RETRO = { 'backyard-1': 1, 'backyard-2': 1, 'backyard-3': 1, 'backyard-4': 1 };

describe('profile', () => {
  it('a missing save is a new profile under a game-specific key', () => {
    expect(loadProfile(memoryStore())).toEqual(newProfile());
    expect(newProfile()).toEqual({
      version: 3,
      coins: 0,
      level: 1,
      xp: 0,
      stats: { speed: 1, power: 1, jump: 1, control: 1 },
      ladderWins: 0,
      dailyWinDate: null,
      totals: ZERO_TOTALS,
      powerMoves: NO_POWER,
      powerForms: NO_POWER,
      career: NO_CAREER,
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
      coins: 'lots',
      level: 0,
      xp: 'x',
      stats: { speed: '3', power: 4, control: 12 },
      ladderWins: 99,
      dailyWinDate: 7,
      totals: null,
      powerMoves: 'all',
      powerForms: { owned: 'golden', equipped: 3 },
    });
    const tenRetro = Object.fromEntries([...Array(10)].map((_, i) => [`backyard-${i + 1}`, 1]));
    expect(loadProfile(store)).toEqual({
      version: 3,
      coins: 0,
      level: 1,
      xp: 0,
      stats: { speed: 1, power: 4, jump: 1, control: 10 },
      ladderWins: 10,
      dailyWinDate: null,
      totals: ZERO_TOTALS,
      powerMoves: NO_POWER,
      powerForms: NO_POWER,
      career: { ...SOME.career, stars: { ...tenRetro, ...SOME.career.stars } },
    });
  });

  it('negative coins fall back to 0', () => {
    expect(loadProfile(stored({ ...SOME, coins: -5 })).coins).toBe(0);
  });

  it('a full v1 save loads into v3 with every field kept', () => {
    const v1 = {
      version: 1,
      coins: 640,
      level: 4,
      xp: 30,
      stats: { speed: 3, power: 2, jump: 2, control: 1 },
      ladderWins: 4,
      dailyWinDate: '2026-10-24',
      totals: { matches: 12, wins: 7, draws: 2, losses: 3, goalsFor: 21, goalsAgainst: 11, styleGoals: 5, xpEarned: 480 },
    };
    expect(loadProfile(stored(v1))).toEqual({ ...v1, version: 3, powerMoves: NO_POWER, powerForms: NO_POWER, career: { ...NO_CAREER, stars: FOUR_RETRO } });
  });

  it('a v2 save loads into v3 with retro stars for its ladder wins', () => {
    const v2 = { ...SOME, version: 2, career: undefined };
    delete (v2 as { career?: unknown }).career;
    expect(loadProfile(stored(v2))).toEqual({ ...SOME, version: 3, career: { stars: FOUR_RETRO, milestonesPaid: 0, lossStreaks: {} } });
  });

  it("Harrison's champion save unlocks Biscuit with ten stars", () => {
    const champ = loadProfile(stored({ ...SOME, version: 2, ladderWins: 10, career: undefined }));
    expect(Object.keys(champ.career.stars)).toHaveLength(10);
    expect(Object.values(champ.career.stars).every(s => s === 1)).toBe(true);
    expect(champ.career.stars['backyard-boss']).toBeUndefined();
  });

  it('retro stars never lower a better star', () => {
    expect(loadProfile(stored(SOME)).career.stars['backyard-4']).toBe(3);
  });

  it('career junk falls back field by field: unknown ids drop, stars clamp to 3, streaks to 99, paid to 4', () => {
    const p = loadProfile(stored({ ...SOME, career: { stars: { 'backyard-2': 9, 'school-1': 2, 'backyard-boss': -1, nonsense: 3 }, milestonesPaid: 40, lossStreaks: { 'backyard-boss': 500, x: 1 } } }));
    expect(p.career).toEqual({ stars: { 'backyard-1': 1, 'backyard-2': 3, 'backyard-3': 1, 'backyard-4': 1 }, milestonesPaid: 4, lossStreaks: { 'backyard-boss': 99 } });
    expect(loadProfile(stored({ ...SOME, career: 'none' })).career).toEqual({ stars: FOUR_RETRO, milestonesPaid: 0, lossStreaks: {} });
    expect(MAX_LOADED).toMatchObject({ stars: 3, milestones: 4, streak: 99 });
  });

  it('a v1 save at level 5 or more loads with Golden Form owned and equipped', () => {
    const { powerMoves: _m, powerForms: _f, ...v1 } = { ...SOME, version: 1, level: 6 };
    const p = loadProfile(stored(v1));
    expect(p.powerForms).toEqual({ owned: ['golden'], equipped: 'golden' });
    expect(p.powerMoves).toEqual(NO_POWER);
  });

  it('unknown, duplicate and unowned power entries are dropped', () => {
    const p = loadProfile(
      stored({
        ...SOME,
        powerMoves: { owned: ['energyWave', 'energyWave', 'blazeShot'], equipped: 'blazeShot' },
        powerForms: { owned: ['storm'], equipped: 'golden' },
      }),
    );
    expect(p.powerMoves).toEqual({ owned: ['energyWave'], equipped: null });
    expect(p.powerForms).toEqual(NO_POWER);
  });

  it('absurd counts are capped so loading and levelling finish', () => {
    const p = loadProfile(stored({ ...SOME, xp: 1e300, coins: 1e300, level: 1e9, totals: { ...SOME.totals, goalsFor: 1e300 } }));
    expect(p.xp).toBe(MAX_LOADED.xp);
    expect(p.coins).toBe(MAX_LOADED.count);
    expect(p.level).toBe(MAX_LOADED.level);
    expect(p.totals.goalsFor).toBe(MAX_LOADED.count);
    expect(addXp(p.level, p.xp, 100).level).toBeGreaterThanOrEqual(p.level);
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
    const store = stored({ ...SOME, version: 4, coins: 300, gems: 5 });
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

describe('followProfile', () => {
  /** A stand-in for window: keeps the storage listener so a test can fire it. */
  function fakeWindow() {
    let listener: ((e: { key: string | null }) => void) | null = null;
    return {
      addEventListener: (_type: 'storage', cb: (e: { key: string | null }) => void) => void (listener = cb),
      fire: (key: string | null) => listener?.({ key }),
    };
  }

  it('another tab saving the profile reloads it here', () => {
    const store = memoryStore();
    const win = fakeWindow();
    const seen: Profile[] = [];
    followProfile(win, store, p => seen.push(p));
    saveProfile(store, SOME);
    win.fire(PROFILE_KEY);
    expect(seen).toEqual([SOME]);
  });

  it('ignores other keys and a cleared store', () => {
    const win = fakeWindow();
    const seen: Profile[] = [];
    followProfile(win, memoryStore(), p => seen.push(p));
    win.fire('harrisons-road-to-the-cup/settings');
    win.fire(null);
    expect(seen).toEqual([]);
  });
});
