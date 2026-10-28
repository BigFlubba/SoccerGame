import { describe, expect, it } from 'vitest';
import type { Difficulty } from './ai';
import type { HumanOpponentId } from './opponents';
import { trickMatch, type TrickMatch, type TrickScript } from './trickScripts';

/** The tuning seeds: 64 for the measures against Max and Biscuit, the first 32 for the personalities. */
const SEEDS = Array.from({ length: 64 }, (_, i) => 100 + i);
const PERSONALITY_SEEDS = SEEDS.slice(0, 32);

const played = new Map<string, TrickMatch>();
function match(opponent: HumanOpponentId | 'biscuit', d: Difficulty, seed: number, script: TrickScript): TrickMatch {
  const key = `${opponent} ${d} ${seed} ${script}`;
  if (!played.has(key)) played.set(key, trickMatch(opponent, d, seed, script));
  return played.get(key)!;
}
const matches = (opponent: HumanOpponentId | 'biscuit', d: Difficulty, script: TrickScript, seeds = SEEDS) => seeds.map(s => match(opponent, d, s, script));
const winRate = (ms: TrickMatch[]) => ms.filter(m => m.result === 'win').length / ms.length;
const sum = (ms: TrickMatch[], f: (m: TrickMatch) => number) => ms.reduce((n, m) => n + f(m), 0);
/** Of the tricks that fooled him, the share that got Harrison past him with the ball. */
const beatShare = (ms: TrickMatch[], kinds: readonly ('stepover' | 'flick')[] = ['stepover', 'flick']) =>
  sum(ms, m => kinds.reduce((n, k) => n + m.trickStats.beats[k], 0)) / Math.max(1, sum(ms, m => kinds.reduce((n, k) => n + m.trickStats.fooled[k], 0)));
const meanPast = (ms: TrickMatch[]) => {
  const all = ms.flatMap(m => m.trickStats.pastPx);
  return all.reduce((a, b) => a + b, 0) / Math.max(1, all.length);
};

describe('timed right, a trick works (not too hard)', () => {
  it.each([
    ['easy', 0.8],
    ['normal', 0.7],
    ['hard', 0.55],
  ] as const)('against Max on %s, at least %f of fooling tricks get Harrison past him', (d, floor) => {
    const ms = matches('max', d, 'trickster');
    expect(sum(ms, m => m.trickStats.fooled.stepover + m.trickStats.fooled.flick)).toBeGreaterThan(20);
    expect(beatShare(ms)).toBeGreaterThanOrEqual(floor);
  });
});

describe('mashing RB does not work (not too easy)', () => {
  it("the spammer wins no more than 0.06 above the plain script against Max on Normal", () => {
    expect(winRate(matches('max', 'normal', 'spammer'))).toBeLessThanOrEqual(winRate(matches('max', 'normal', 'plain')) + 0.06);
  });
});

describe('the tricks are not a win button (not too easy)', () => {
  it("the trickster beats Max on Normal more than the plain script, by no more than 0.20", () => {
    const [tricks, plain] = [winRate(matches('max', 'normal', 'trickster')), winRate(matches('max', 'normal', 'plain'))];
    expect(tricks).toBeGreaterThan(plain);
    expect(tricks).toBeLessThanOrEqual(plain + 0.2);
  });

  it('the trickster wins no more than a quarter against Max on Hard', () => {
    expect(winRate(matches('max', 'hard', 'trickster'))).toBeLessThanOrEqual(0.25);
  });
});

describe('the personalities show (Normal, 32 seeds)', () => {
  const stepoverBeats = (id: HumanOpponentId) => beatShare(matches(id, 'normal', 'trickster', PERSONALITY_SEEDS), ['stepover']);

  it('of fooling stepovers, the share that beat him runs Max, Tia, Brick', () => {
    const [max, tia, brick] = (['max', 'tia', 'brick'] as const).map(stepoverBeats);
    expect(max).toBeGreaterThanOrEqual(tia);
    expect(tia).toBeGreaterThanOrEqual(brick);
  });

  // Fooled for 0.7 s or more nearly every stepover beats him, so the share can't rank Pete above Max (the parent's call,
  // 2026-10-28): Pete's own floor instead, over all 64 seeds, since only a handful of his stepovers fool him in 32.
  it("Pete's fooling stepovers beat him at least 0.7 of the time (64 seeds)", () => {
    expect(beatShare(matches('pete', 'normal', 'trickster'), ['stepover'])).toBeGreaterThanOrEqual(0.7);
  });

  it('a fooled Sam ends up at least twice as far past Harrison as a fooled Max', () => {
    expect(meanPast(matches('sam', 'normal', 'trickster', PERSONALITY_SEEDS))).toBeGreaterThanOrEqual(2 * meanPast(matches('max', 'normal', 'trickster', PERSONALITY_SEEDS)));
  });
});

describe("Biscuit isn't made easy (Normal)", () => {
  it('the trickster wins no more than 0.20 above the plain blocker, and the spammer no more than 0.06', () => {
    const plain = winRate(matches('biscuit', 'normal', 'plain'));
    expect(winRate(matches('biscuit', 'normal', 'trickster'))).toBeLessThanOrEqual(plain + 0.2);
    expect(winRate(matches('biscuit', 'normal', 'spammer'))).toBeLessThanOrEqual(plain + 0.06);
  });
});

describe('nothing gets stuck', () => {
  it('every match ends with a result, and the ball is never still for over 4 s', () => {
    for (const m of [...played.values()]) {
      expect(m.result).not.toBeNull();
      expect(m.longestStillS).toBeLessThanOrEqual(4);
    }
    expect(played.size).toBeGreaterThan(0);
  });
});
