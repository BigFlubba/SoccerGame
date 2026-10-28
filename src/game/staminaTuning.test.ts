import { describe, expect, it } from 'vitest';
import type { Difficulty } from './ai';
import { TUNING_STATS } from './dog';
import { bossMatch, type BossMatch } from './dogScripts';
import { SAM_TUNING_STATS, samMatch, type SamMatch, type SamScript } from './samScripts';

/**
 * A maxed Stamina mustn't undo a boss's lesson: at Stamina 10, with the
 * tuning stats otherwise, the bars the boss tuning tests set still hold.
 *
 * Measured at Stamina 10 (win rates, Easy / Normal / Hard):
 * - Biscuit: chaser 0 / 0 / 0; blocker .844 / .688 / .281.
 * - Sam: racer .203 / .141 / .156; matador .984 / .781 / .547, so the
 *   matador leads by .781 / .641 / .391.
 *
 * For information, not guarded (Speed 10 and Stamina 10, the most a real
 * Harrison can buy): chaser 0 / 0 / .031 against Biscuit; racer
 * .516 / .313 / .203 against Sam.
 *
 * At Stamina 1 the same runs give today's numbers: chaser 0 / 0 / 0,
 * blocker .875 / .594 / .219; racer .188 / .094 / .109, matador
 * .922 / .609 / .422.
 */

/** The same seeds as the boss tuning tests. */
const DOG_SEEDS = [...Array(32)].map((_, i) => 100 + i);
const SAM_SEEDS = [...Array(64)].map((_, i) => 100 + i);
const DIFFS: readonly Difficulty[] = ['easy', 'normal', 'hard'];
const DOG_TUNING_10 = { ...TUNING_STATS, stamina: 10 };
const SAM_TUNING_10 = { ...SAM_TUNING_STATS, stamina: 10 };

/** Each match is played once and shared between the tests that read it. */
const played = new Map<string, BossMatch | SamMatch>();
const once = <T extends BossMatch | SamMatch>(key: string, run: () => T): T => {
  if (!played.has(key)) played.set(key, run());
  return played.get(key) as T;
};
const chaserWins = (d: Difficulty) =>
  DOG_SEEDS.filter(s => once(`dog/${d}/${s}`, () => bossMatch(d, s, 'chaser', DOG_TUNING_10)).result === 'win').length / DOG_SEEDS.length;
const samWins = (d: Difficulty, who: SamScript) =>
  SAM_SEEDS.filter(s => once(`sam/${d}/${who}/${s}`, () => samMatch(d, s, who, SAM_TUNING_10)).result === 'win').length / SAM_SEEDS.length;

describe("Stamina 10 keeps the bosses' lessons", () => {
  it('at Stamina 10 a chaser still loses nearly every match against Biscuit on Normal', () => {
    expect(chaserWins('normal')).toBeLessThanOrEqual(0.15);
  });

  it('at Stamina 10 a racer still loses nearly every match against Sam on Normal', () => {
    expect(samWins('normal', 'racer')).toBeLessThanOrEqual(0.15);
  });

  it('at Stamina 10 the matador still beats the racer by at least 0.3 on every difficulty', () => {
    for (const d of DIFFS) expect(samWins(d, 'matador') - samWins(d, 'racer'), d).toBeGreaterThanOrEqual(0.3);
  });
});
