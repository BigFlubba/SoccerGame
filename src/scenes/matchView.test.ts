import { describe, expect, it } from 'vitest';
import { BASE_STATS } from '../game/stats';
import { createWorld } from '../game/world';
import type { GameArt } from './art';
import { depthSorted } from './depthSort';
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
    expect(zs).toEqual(expect.arrayContaining([10, 50, 27]));
    expect(zs.filter(z => z === 18)).toHaveLength(4);
    expect(zs.filter(z => z === 46)).toHaveLength(4);
    expect(zs).toHaveLength(11);
  });

  it('a player behind a goal is drawn before its net and crossbar', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, { home: 4, away: 6 });
    const goal = w.field.goals.find(g => g.side === 'right')!;
    Object.assign(w.home, { x: goal.lineX, z: 52 });
    const sorted = depthSorted(pitchDrawables(w, { x: 0 }, NO_ART));
    const him = sorted.findIndex(d => d.z === 52);
    sorted.forEach((d, i) => {
      if (d.z === goal.z1) expect(him).toBeLessThan(i);
    });
  });
});
