import { STAT_NAMES, type Stats } from '../game/stats';
import { STAT_INFO } from './economy';

/** The Backyard Ladder's rungs: ten matches against Max. */
export const LADDER_MATCHES = 10;

/**
 * Max's stats on each match of the Backyard Ladder (index 0 is match 1): he
 * starts as he is today and adds about one stat level a match, a level or so
 * behind what Harrison can afford by then.
 */
export const LADDER_STATS: readonly Readonly<Stats>[] = [
  { speed: 1, power: 1, jump: 1, control: 1 },
  { speed: 2, power: 1, jump: 1, control: 1 },
  { speed: 2, power: 2, jump: 1, control: 1 },
  { speed: 2, power: 2, jump: 1, control: 2 },
  { speed: 3, power: 2, jump: 1, control: 2 },
  { speed: 3, power: 3, jump: 1, control: 2 },
  { speed: 3, power: 3, jump: 2, control: 2 },
  { speed: 3, power: 3, jump: 2, control: 3 },
  { speed: 4, power: 3, jump: 2, control: 3 },
  { speed: 4, power: 4, jump: 2, control: 3 },
];

/** The ladder match he plays next: the one after his wins, or a rematch of the last once he's champion. */
export function nextMatch(ladderWins: number): number {
  return Math.min(ladderWins + 1, LADDER_MATCHES);
}

export function maxStats(match: number): Stats {
  return { ...LADDER_STATS[Math.min(Math.max(match, 1), LADDER_MATCHES) - 1]! };
}

export function isChampion(ladderWins: number): boolean {
  return ladderWins >= LADDER_MATCHES;
}

/** What Max has improved since the match before, e.g. MAX HAS BEEN TRAINING: POWER UP; null for match 1. */
export function trainingLine(match: number): string | null {
  if (match <= 1) return null;
  const now = maxStats(match);
  const before = maxStats(match - 1);
  const rose = STAT_NAMES.filter(k => now[k] > before[k]).map(k => STAT_INFO[k].label);
  return rose.length ? `MAX HAS BEEN TRAINING: ${rose.join(' AND ')} UP` : null;
}

export function nextMatchLine(ladderWins: number): string {
  return isChampion(ladderWins) ? 'CHAMPION! REMATCH: MAX' : `NEXT: MAX - MATCH ${nextMatch(ladderWins)}/${LADDER_MATCHES}`;
}
