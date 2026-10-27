import { describe, expect, it } from 'vitest';
import type { Difficulty } from './ai';
import { maxMatch, type MaxMatch } from './maxScripts';

/**
 * Hard's win rate for the scripted Harrison before the fair-Max changes
 * (docs/superpowers/specs/2026-10-27-fair-max-design.md, "5. Retuning
 * Max"): Hard must stay as tough as it was.
 */
const HARD_BASELINE = 0;
/** 64 seeds: each match's Harrison reacts at his own pace, so this many make a steady measure. */
const SEEDS = [...Array(64)].map((_, i) => 100 + i);
/** The first-rung check plays the first 32 of them at both rungs. */
const FIRST_RUNG_SEEDS = SEEDS.slice(0, 32);
/** Each match is played once and shared between the tests that read it. */
const played = new Map<string, MaxMatch>();
const play = (d: Difficulty, seed: number, rung = 10): MaxMatch => {
  const key = `${d}/${rung}/${seed}`;
  if (!played.has(key)) played.set(key, maxMatch(d, seed, rung));
  return played.get(key)!;
};
const rate = (d: Difficulty, rung = 10, seeds = SEEDS) => seeds.filter(s => play(d, s, rung).result === 'win').length / seeds.length;

describe('Max stays fair on Easy and Normal, and Hard holds', () => {
  it('Easy: the scripted Harrison wins about 80%', () => {
    expect(rate('easy')).toBeGreaterThanOrEqual(0.7);
    expect(rate('easy')).toBeLessThanOrEqual(0.9);
  });

  it('Normal: about 60%', () => {
    expect(rate('normal')).toBeGreaterThanOrEqual(0.5);
    expect(rate('normal')).toBeLessThanOrEqual(0.7);
  });

  it('Hard: as tough as before this plan', () => {
    expect(Math.abs(rate('hard') - HARD_BASELINE)).toBeLessThanOrEqual(0.06);
  });

  it('Easy is kinder than Normal and Normal than Hard', () => {
    expect(rate('easy')).toBeGreaterThanOrEqual(rate('normal'));
    expect(rate('normal')).toBeGreaterThanOrEqual(rate('hard'));
  });

  it('at the first rung, Easy and Normal are at least as winnable', () => {
    for (const d of ['easy', 'normal'] as const) expect(rate(d, 1, FIRST_RUNG_SEEDS), d).toBeGreaterThanOrEqual(rate(d, 10, FIRST_RUNG_SEEDS));
  });

  it('every match ends with a result and nothing stuck', () => {
    for (const d of ['easy', 'normal', 'hard'] as const)
      for (const seed of SEEDS) {
        const m = play(d, seed);
        expect(m.result, `${d} ${seed}`).not.toBeNull();
        expect(m.longestStillS, `${d} ${seed}: the ball sat still`).toBeLessThanOrEqual(4);
      }
  });
});
