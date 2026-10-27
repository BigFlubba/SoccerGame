import { describe, expect, it } from 'vitest';
import { DIFFICULTY, type Difficulty } from './ai';
import { CREW_STATS, type CrewId } from './crew';
import { opponentMatch, playMatchup, type OpponentMatch, type Traits } from './maxScripts';

/**
 * The Park crew measured like Max (maxTuning.test.ts): the scripted
 * Harrison, a level up on each kid's stats, on the same seeds. Easy about
 * 80%, Normal about 60%, Hard about as tough as Max's Hard. Each kid's
 * personality must also show against Max's brain at the same stats, so the
 * crew can't drift into four Maxes in different shirts.
 */
const SEEDS = [...Array(64)].map((_, i) => 100 + i);
/** Max's Hard measures 0.016 on these seeds; the crew's stays about as tough. */
const MAX_HARD_CEILING = 0.1;
const DIFFS: readonly Difficulty[] = ['easy', 'normal', 'hard'];

const played = new Map<string, OpponentMatch>();
const play = (id: CrewId, d: Difficulty, seed: number): OpponentMatch => {
  const key = `${id}/${d}/${seed}`;
  if (!played.has(key)) played.set(key, opponentMatch(id, d, seed));
  return played.get(key)!;
};
/** Max's Normal brain at the kid's stats, against the same scripted Harrison. */
const maxAs = (id: CrewId, seed: number): OpponentMatch => {
  const key = `max-as-${id}/${seed}`;
  if (!played.has(key)) played.set(key, playMatchup({ stats: CREW_STATS[id], profile: DIFFICULTY.normal }, seed));
  return played.get(key)!;
};
const rate = (id: CrewId, d: Difficulty) => SEEDS.filter(s => play(id, d, s).result === 'win').length / SEEDS.length;
const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
/** A trait over the Normal seeds: the kid's, then Max's at the kid's stats. */
const trait = (id: CrewId, f: (t: Traits) => number) => [mean(SEEDS.map(s => f(play(id, 'normal', s).traits))), mean(SEEDS.map(s => f(maxAs(id, s).traits)))] as const;

const PERSONALITY: Partial<Record<CrewId, { name: string; check: (id: CrewId) => void }>> = {
  brick: {
    name: 'defends deeper and slides far less',
    check: id => {
      const [depth, maxDepth] = trait(id, t => t.defendDepth);
      expect(maxDepth - depth).toBeGreaterThanOrEqual(30);
      const [slides, maxSlides] = trait(id, t => t.slides);
      expect(slides).toBeLessThanOrEqual(maxSlides / 2);
    },
  },
  leo: {
    name: 'shoots from much further out',
    check: id => {
      const [from, maxFrom] = trait(id, t => mean(t.shotsFrom));
      expect(from - maxFrom).toBeGreaterThanOrEqual(80);
    },
  },
};

describe.each(['brick', 'leo'] as const)('%s is fair on Easy and Normal, and Hard holds', id => {
  it('Easy: the scripted Harrison wins about 80%', () => {
    expect(rate(id, 'easy')).toBeGreaterThanOrEqual(0.7);
    expect(rate(id, 'easy')).toBeLessThanOrEqual(0.9);
  });

  it('Normal: about 60%', () => {
    expect(rate(id, 'normal')).toBeGreaterThanOrEqual(0.5);
    expect(rate(id, 'normal')).toBeLessThanOrEqual(0.7);
  });

  it("Hard: about as tough as Max's", () => {
    expect(rate(id, 'hard')).toBeLessThanOrEqual(MAX_HARD_CEILING);
  });

  it('Easy is kinder than Normal and Normal than Hard', () => {
    expect(rate(id, 'easy')).toBeGreaterThanOrEqual(rate(id, 'normal'));
    expect(rate(id, 'normal')).toBeGreaterThanOrEqual(rate(id, 'hard'));
  });

  it('every match ends with a result and nothing stuck', () => {
    for (const d of DIFFS)
      for (const seed of SEEDS) {
        const m = play(id, d, seed);
        expect(m.result, `${d} ${seed}`).not.toBeNull();
        expect(m.longestStillS, `${d} ${seed}: the ball sat still`).toBeLessThanOrEqual(4);
      }
  });

  it(`the personality shows: ${PERSONALITY[id]!.name}`, () => {
    PERSONALITY[id]!.check(id);
  });
});
