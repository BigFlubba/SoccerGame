import { describe, expect, it } from 'vitest';
import type { Difficulty } from './ai';
import { samMatch, type SamMatch, type SamScript } from './samScripts';

/** 64 seeds: each match's matador draws his own timing every exchange, so this many make a steady measure. */
const SEEDS = [...Array(64)].map((_, i) => 100 + i);
const DIFFS: readonly Difficulty[] = ['easy', 'normal', 'hard'];
/** Each match is played once and shared between the tests that read it. */
const played = new Map<string, SamMatch>();
const play = (d: Difficulty, seed: number, who: SamScript): SamMatch => {
  const key = `${d}/${who}/${seed}`;
  if (!played.has(key)) played.set(key, samMatch(d, seed, who));
  return played.get(key)!;
};
const wins = (d: Difficulty, who: SamScript) => SEEDS.filter(s => play(d, s, who).result === 'win').length / SEEDS.length;

describe("Speedy Sam stays tuned to his lesson: don't race him, make him overshoot", () => {
  it('a racer loses nearly every match on Normal', () => {
    expect(wins('normal', 'racer')).toBeLessThanOrEqual(0.15);
  });

  it('a matador wins about half on Normal', () => {
    const r = wins('normal', 'matador');
    expect(r).toBeGreaterThanOrEqual(0.4);
    expect(r).toBeLessThanOrEqual(0.65);
  });

  it('a matador wins about 0.8 on Easy and 0.3 on Hard', () => {
    const [e, h] = [wins('easy', 'matador'), wins('hard', 'matador')];
    expect(e).toBeGreaterThanOrEqual(0.65);
    expect(e).toBeLessThanOrEqual(0.95);
    expect(h).toBeGreaterThanOrEqual(0.15);
    expect(h).toBeLessThanOrEqual(0.45);
  });

  it('the matador beats the racer by at least 0.3 on every difficulty', () => {
    for (const d of DIFFS) expect(wins(d, 'matador') - wins(d, 'racer'), d).toBeGreaterThanOrEqual(0.3);
  });

  it('every match ends with a result and the ball never sits still for long', () => {
    for (const d of DIFFS)
      for (const who of ['racer', 'matador'] as const)
        for (const seed of SEEDS) {
          const m = play(d, seed, who);
          expect(m.result, `${d} ${who} ${seed}`).not.toBeNull();
          expect(m.longestStillS, `${d} ${who} ${seed}: the ball sat still`).toBeLessThanOrEqual(4);
        }
  });

  it("Sam isn't beaten by his own brakes: his own goals are under a tenth of Harrison's", () => {
    for (const d of DIFFS)
      for (const who of ['racer', 'matador'] as const) {
        const ms = SEEDS.map(s => play(d, s, who));
        const goals = ms.reduce((n, m) => n + m.score.home, 0);
        const own = ms.reduce((n, m) => n + m.ownGoals, 0);
        expect(own, `${d} ${who}: ${own} of ${goals}`).toBeLessThan(0.1 * Math.max(goals, 1));
      }
  });
});
