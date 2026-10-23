import { BASE_STATS, MAX_STAT_LEVEL, MIN_STAT_LEVEL, STAT_NAMES, type Stats } from '../game/stats';
import { isRecord, readStored, writeUnlessNewer, type KeyValueStore } from './storage';

/** Running totals, kept for the Trophy Room. */
export interface Totals {
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  styleGoals: number;
  xpEarned: number;
}

/** Harrison's progress, versioned so every later build can read it. */
export interface Profile {
  version: 1;
  coins: number;
  /** Stored, never worked out from XP, so a change to the curve can't take a level away. */
  level: number;
  /** XP toward the next level. */
  xp: number;
  stats: Stats;
  /** Backyard Ladder matches beaten, 0–LADDER_MATCHES. */
  ladderWins: number;
  /** The local date ('YYYY-MM-DD') of his last first-win-of-the-day bonus. */
  dailyWinDate: string | null;
  totals: Totals;
}

/** Game-specific, so it never clashes with other pages on the same site. */
export const PROFILE_KEY = 'harrisons-road-to-the-cup/profile';
const VERSION = 1;
export const LADDER_MATCHES = 10;

const TOTAL_NAMES: readonly (keyof Totals)[] = ['matches', 'wins', 'draws', 'losses', 'goalsFor', 'goalsAgainst', 'styleGoals', 'xpEarned'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function newProfile(): Profile {
  return {
    version: VERSION,
    coins: 0,
    level: 1,
    xp: 0,
    stats: { ...BASE_STATS },
    ladderWins: 0,
    dailyWinDate: null,
    totals: { matches: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, styleGoals: 0, xpEarned: 0 },
  };
}

/** A whole number from `min` (clamped to `max`, if given); anything that isn't a number is the default. */
const wholeOr = (v: unknown, d: number, min: number, max = Infinity): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(Math.max(Math.floor(v), min), max) : d;

function statsFrom(v: unknown): Stats {
  const r = isRecord(v) ? v : {};
  const s = { ...BASE_STATS };
  for (const k of STAT_NAMES) s[k] = wholeOr(r[k], BASE_STATS[k], MIN_STAT_LEVEL, MAX_STAT_LEVEL);
  return s;
}

function totalsFrom(v: unknown): Totals {
  const r = isRecord(v) ? v : {};
  const t = newProfile().totals;
  for (const k of TOTAL_NAMES) t[k] = wholeOr(r[k], 0, 0);
  return t;
}

/**
 * Loads the profile field by field, so one bad value falls back to its own
 * default and the rest load. A newer build's save is read as best it can be.
 * Anything that isn't a save at all is a new profile.
 */
export function loadProfile(store: KeyValueStore | null): Profile {
  const v = readStored(store, PROFILE_KEY);
  const d = newProfile();
  if (!isRecord(v) || typeof v.version !== 'number' || !(v.version >= VERSION)) return d;
  return {
    version: VERSION,
    coins: wholeOr(v.coins, d.coins, 0),
    level: wholeOr(v.level, d.level, 1),
    xp: wholeOr(v.xp, d.xp, 0),
    stats: statsFrom(v.stats),
    ladderWins: wholeOr(v.ladderWins, d.ladderWins, 0, LADDER_MATCHES),
    dailyWinDate: typeof v.dailyWinDate === 'string' && DATE.test(v.dailyWinDate) ? v.dailyWinDate : null,
    totals: totalsFrom(v.totals),
  };
}

/**
 * Calls `apply` with the stored profile whenever another tab saves it, so a
 * tab left open never writes stale progress over a newer one.
 */
export function followProfile(
  target: { addEventListener(type: 'storage', cb: (e: { key: string | null }) => void): void },
  store: KeyValueStore | null,
  apply: (p: Profile) => void,
): void {
  target.addEventListener('storage', e => {
    if (e.key === PROFILE_KEY) apply(loadProfile(store));
  });
}

/** Saves at once. Never throws, and never writes over a newer build's save. */
export function saveProfile(store: KeyValueStore | null, p: Profile): void {
  writeUnlessNewer(store, PROFILE_KEY, p);
}
