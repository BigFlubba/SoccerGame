import { describe, expect, it } from 'vitest';
import { maxStats } from '../meta/ladder';
import { harrisonIntent, harrisonStats, maxMatch, scriptMemo } from './maxScripts';
import { createWorld } from './world';

describe('the scripted Harrison against Max', () => {
  it('harrisonStats is one level above Max on every stat', () => {
    expect(harrisonStats(10)).toEqual({ speed: 5, power: 5, jump: 3, control: 4 });
    expect(harrisonStats(1)).toEqual({ speed: 2, power: 2, jump: 2, control: 2 });
  });

  it('takes the kickoff shot: holding shoot at his kickoff with the ball on the spot', () => {
    const w = createWorld(harrisonStats(10), maxStats(10), 1, { home: 0, away: 0 });
    w.match.phase = 'playing';
    const intent = harrisonIntent(w, 0, 1 / 60, scriptMemo(1));
    expect(intent.shootHeld).toBe(true);
    expect(intent.faceX).toBe(1);
  });

  it('every scripted match ends with a result and the ball never sits still for long', () => {
    for (const d of ['easy', 'normal', 'hard'] as const)
      for (const seed of [1, 2, 3, 4]) {
        const m = maxMatch(d, seed);
        expect(m.result, `${d} ${seed}`).not.toBeNull();
        expect(m.longestStillS, `${d} ${seed}`).toBeLessThanOrEqual(4);
      }
  });
});
