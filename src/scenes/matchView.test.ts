import { describe, expect, it } from 'vitest';
import { createPlayer } from '../game/player';
import { BASE_STATS } from '../game/stats';
import { CROSSING_DEPTH_PX, crossingDepth } from './matchView';

const at = (homeX: number, awayX: number) =>
  crossingDepth(createPlayer('home', BASE_STATS, homeX, 1), createPlayer('away', BASE_STATS, awayX, -1));

describe('crossingDepth', () => {
  it('is 0 while the players are apart', () => {
    expect(at(100, 200)).toBe(0);
  });

  it('steps Max fully behind Harrison when they overlap', () => {
    expect(at(300, 300)).toBe(CROSSING_DEPTH_PX);
  });

  it('eases in as they close', () => {
    const depths = [30, 20, 15, 10, 5, 0].map(gap => at(300, 300 + gap));
    expect(depths).toEqual([...depths].sort((a, b) => a - b));
    expect(new Set(depths).size).toBeGreaterThan(2);
  });
});
