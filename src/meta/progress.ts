import { LEVEL_UP_COINS, addXp, matchLines, matchXp, type MatchSummary, type RewardLine } from './economy';
import { isChampion, nextMatch } from './ladder';
import type { Profile } from './profile';

/** Where his coins, level and XP stood. */
export interface Standing {
  coins: number;
  level: number;
  xp: number;
}

/** Everything the Results screen shows about one match. */
export interface MatchReward {
  summary: MatchSummary;
  lines: RewardLine[];
  /** LEVEL_UP_COINS per level gained. */
  levelBonus: number;
  /** Every coin added: the lines plus the level bonus. */
  coins: number;
  xp: number;
  before: Standing;
  after: Standing;
  /** The ladder match played, whether this result beat it, and whether he's champion now. */
  ladder: { match: number; beaten: boolean; champion: boolean };
}

const standing = (p: Profile): Standing => ({ coins: p.coins, level: p.level, xp: p.xp });

/** The profile after a finished ladder match, and the reward that explains it. Never changes `p`. */
export function applyMatch(p: Profile, s: MatchSummary, match: number, today: string): { profile: Profile; reward: MatchReward } {
  const win = s.result === 'win';
  const dailyWin = win && p.dailyWinDate !== today;
  const lines = matchLines(s, dailyWin);
  const xp = matchXp(lines);
  const levels = addXp(p.level, p.xp, xp);
  const levelBonus = levels.levelsGained * LEVEL_UP_COINS;
  const coins = lines.reduce((sum, l) => sum + l.coins, 0) + levelBonus;
  const beaten = win && match === nextMatch(p.ladderWins) && !isChampion(p.ladderWins);
  const ladderWins = beaten ? p.ladderWins + 1 : p.ladderWins;
  const t = p.totals;
  const profile: Profile = {
    ...p,
    coins: p.coins + coins,
    level: levels.level,
    xp: levels.xp,
    stats: { ...p.stats },
    ladderWins,
    dailyWinDate: dailyWin ? today : p.dailyWinDate,
    totals: {
      matches: t.matches + 1,
      wins: t.wins + (win ? 1 : 0),
      draws: t.draws + (s.result === 'draw' ? 1 : 0),
      losses: t.losses + (s.result === 'lose' ? 1 : 0),
      goalsFor: t.goalsFor + s.goalsFor,
      goalsAgainst: t.goalsAgainst + s.goalsAgainst,
      styleGoals: t.styleGoals + s.styleGoals.length,
      xpEarned: t.xpEarned + xp,
    },
  };
  return {
    profile,
    reward: {
      summary: s,
      lines,
      levelBonus,
      coins,
      xp,
      before: standing(p),
      after: standing(profile),
      ladder: { match, beaten, champion: isChampion(ladderWins) },
    },
  };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** The computer's local calendar date, as 'YYYY-MM-DD'. */
export function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
