import { allBeaten, careerStars, grantRungStars, isBeaten, starsAt, type CareerMatch } from './career';
import { POWER_MOVES, grantForms, moveStatus } from './catalog';
import { LEVEL_UP_COINS, addXp, matchLines, matchXp, type MatchSummary, type RewardLine } from './economy';
import { isChampion, nextMatch } from './ladder';
import { milestonesDue, type Milestone } from './milestones';
import { BONUSES, starsFor } from './objectives';
import type { Career, Profile } from './profile';

/** Where his coins, level and XP stood. */
export interface Standing {
  coins: number;
  level: number;
  xp: number;
}

/** Something a level-up just made available, announced on Results. */
export type Unlock = 'energyWave' | 'goldenForm';

/** What one career match did to his career. */
export interface CareerResult {
  match: CareerMatch;
  /** Earned this match, 0..3. */
  stars: number;
  bestBefore: number;
  /** stars > bestBefore: the save's entry rose. */
  improved: boolean;
  bonusDone: boolean;
  /** This win beat the match for the first time. */
  firstWin: boolean;
  /** He is Backyard Champion now: ladderWins reached 10 this match. */
  champion: boolean;
  /** Every open career match is beaten after this result. */
  allBeaten: boolean;
  /** Paid at this Results, in order. */
  milestones: readonly Milestone[];
}

/** Everything the Results screen shows about one match. */
export interface MatchReward {
  summary: MatchSummary;
  lines: RewardLine[];
  /** LEVEL_UP_COINS per level gained. */
  levelBonus: number;
  /** Every coin added: the lines, the level bonus and any milestones. */
  coins: number;
  xp: number;
  before: Standing;
  after: Standing;
  career: CareerResult;
  /** What this match's level-ups unlocked, in the order to announce them. */
  unlocked: Unlock[];
}

const standing = (p: Profile): Standing => ({ coins: p.coins, level: p.level, xp: p.xp });

/** The career after a match: a win's stars can only raise the entry; a win clears the loss streak, a loss adds to it, a draw leaves it. */
function careerAfter(c: Career, s: MatchSummary, match: CareerMatch, stars: number): Career {
  const entries = { ...c.stars };
  const best = Math.max(entries[match.id] ?? 0, stars);
  if (best > 0) entries[match.id] = best;
  const lossStreaks = { ...c.lossStreaks };
  if (s.result === 'win') delete lossStreaks[match.id];
  else if (s.result === 'lose') lossStreaks[match.id] = (lossStreaks[match.id] ?? 0) + 1;
  return { ...c, stars: entries, lossStreaks };
}

/** The profile after a finished career match, and the reward that explains it. Never changes `p`. */
export function applyMatch(p: Profile, s: MatchSummary, match: CareerMatch, today: string): { profile: Profile; reward: MatchReward } {
  const win = s.result === 'win';
  const dailyWin = win && p.dailyWinDate !== today;
  const lines = matchLines(s, dailyWin);
  const xp = matchXp(lines);
  const levels = addXp(p.level, p.xp, xp);
  const levelBonus = levels.levelsGained * LEVEL_UP_COINS;
  const matchCoins = lines.reduce((sum, l) => sum + l.coins, 0) + levelBonus;
  const advanced = win && match.kind === 'rung' && match.rung === nextMatch(p.ladderWins) && !isChampion(p.ladderWins);
  const ladderWins = advanced ? p.ladderWins + 1 : p.ladderWins;
  const stars = starsFor(s, match.bonus);
  const bestBefore = starsAt(p, match.id);
  const t = p.totals;
  const scored: Profile = grantRungStars(
    grantForms({
      ...p,
      coins: p.coins + matchCoins,
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
      career: careerAfter(p.career, s, match, stars),
    }),
  );
  // Every milestone the total has reached and nobody has paid yet is paid here, visibly.
  const milestones = milestonesDue(careerStars(scored), p.career.milestonesPaid);
  const milestoneCoins = milestones.reduce((sum, m) => sum + m.coins, 0);
  const profile: Profile = {
    ...scored,
    coins: scored.coins + milestoneCoins,
    career: { ...scored.career, milestonesPaid: p.career.milestonesPaid + milestones.length },
  };
  const unlocked: Unlock[] = [];
  const waveLevel = POWER_MOVES.energyWave.unlockLevel;
  if (p.level < waveLevel && profile.level >= waveLevel && moveStatus(p, 'energyWave') !== 'owned') unlocked.push('energyWave');
  if (!p.powerForms.owned.includes('golden') && profile.powerForms.owned.includes('golden')) unlocked.push('goldenForm');
  return {
    profile,
    reward: {
      summary: s,
      lines,
      levelBonus,
      coins: matchCoins + milestoneCoins,
      xp,
      before: standing(p),
      after: standing(profile),
      career: {
        match,
        stars,
        bestBefore,
        improved: stars > bestBefore,
        bonusDone: BONUSES[match.bonus].done({ goalsFor: s.goalsFor, goalsAgainst: s.goalsAgainst, goals: s.goals, result: s.result, steals: s.steals }),
        firstWin: win && !isBeaten(p, match),
        champion: advanced && isChampion(ladderWins),
        allBeaten: allBeaten(profile),
        milestones,
      },
      unlocked,
    },
  };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** The computer's local calendar date, as 'YYYY-MM-DD'. */
export function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
