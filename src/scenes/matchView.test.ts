import { describe, expect, it } from 'vitest';
import { BASE_STATS } from '../game/stats';
import { createWorld } from '../game/world';
import type { GameArt } from './art';
import { pitchDrawables } from './matchView';

/** Building the list never touches the art; only drawing does. */
const NO_ART = {} as GameArt;

describe('pitchDrawables', () => {
  it('puts both players and the ball at their depths, and every post at its own', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, { home: 4, away: 6 });
    Object.assign(w.home, { z: 10 });
    Object.assign(w.away, { z: 50 });
    Object.assign(w.ball, { z: 27 });
    const zs = pitchDrawables(w, { x: 0 }, NO_ART).map(d => d.z);
    expect(zs).toEqual(expect.arrayContaining([10, 50, 27, 18, 46, 18, 46]));
    expect(zs).toHaveLength(7);
  });
});
