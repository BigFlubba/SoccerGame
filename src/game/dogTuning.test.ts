import { describe, expect, it } from 'vitest';
import { bossMatch, type BossMatch, type ScriptedHarrison } from './dogScripts';
import type { Difficulty } from './dog';

/** 32 seeds: each match's blocker reacts at his own pace, so this many make a steady measure. */
const SEEDS = [...Array(32)].map((_, i) => 100 + i);
/** Each match is played once and shared between the tests that read it. */
const played = new Map<string, BossMatch>();
const play = (d: Difficulty, seed: number, who: ScriptedHarrison): BossMatch => {
  const key = `${d}/${who}/${seed}`;
  if (!played.has(key)) played.set(key, bossMatch(d, seed, who));
  return played.get(key)!;
};
const wins = (d: Difficulty, who: ScriptedHarrison) => SEEDS.filter(s => play(d, s, who).result === 'win').length / SEEDS.length;

describe('Biscuit stays tuned to his lesson', () => {
  it('a chaser loses nearly every match on Normal', () => {
    expect(wins('normal', 'chaser')).toBeLessThanOrEqual(0.15);
  });

  it('a Harrison who stands still on the ball loses nearly every match on Normal', () => {
    expect(wins('normal', 'freezer')).toBeLessThanOrEqual(0.15);
  });

  it('a blocker wins about half on Normal', () => {
    const r = wins('normal', 'blocker');
    expect(r).toBeGreaterThanOrEqual(0.35);
    expect(r).toBeLessThanOrEqual(0.65);
  });

  it('Easy is kinder and Hard is harsher to the blocker', () => {
    expect(wins('easy', 'blocker')).toBeGreaterThanOrEqual(wins('normal', 'blocker'));
    expect(wins('hard', 'blocker')).toBeLessThanOrEqual(wins('normal', 'blocker'));
  });

  it('every match ends with a result and nothing stuck', () => {
    for (const d of ['easy', 'normal', 'hard'] as const) {
      for (const who of d === 'normal' ? (['chaser', 'blocker', 'freezer'] as const) : (['blocker'] as const)) {
        for (const seed of SEEDS) {
          const m = play(d, seed, who);
          expect(m.result, `${d} ${who} ${seed}`).not.toBeNull();
          expect(m.longestStillS, `${d} ${who} ${seed}: the ball sat still`).toBeLessThanOrEqual(4);
        }
      }
    }
  });
});
