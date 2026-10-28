import { describe, expect, it } from 'vitest';
import { DIFFICULTY } from './ai';
import { BALL_REST_Y } from './ball';
import { maxMatch } from './maxScripts';
import { NORMAL_HANDLING } from './player';
import { BASE_STATS } from './stats';
import { FOOT_SPOT } from './steal';
import { trickMatch, trickIntent, trickMemo } from './trickScripts';
import { trickSetup } from './opponents';
import { createWorld, type World } from './world';

const STEP = 1 / 60;

/** Harrison on the ball at x 300; Max `gap` px ahead in his lane, facing him. */
function facing(gap: number): World {
  const w = createWorld(BASE_STATS, BASE_STATS, 1, { home: 0, away: 0 }, null, null, DIFFICULTY.normal, NORMAL_HANDLING, trickSetup('normal', 'max'));
  w.match.phase = 'playing';
  Object.assign(w.home, { x: 300, z: 32, facing: 1 });
  Object.assign(w.away, { x: 300 + gap, z: 32, facing: -1 });
  Object.assign(w.ball, { x: 300 + FOOT_SPOT, y: BALL_REST_Y, z: 32, vx: 0, vy: 0, vz: 0 });
  return w;
}

describe('the trickster', () => {
  it('presses once the defender is inside his trigger gap, and not before', () => {
    const memo = trickMemo(1, 'trickster');
    Object.assign(memo, { gap: 40, kind: 'stepover' });
    expect(trickIntent(facing(60), 0, STEP, memo).skill).toBeFalsy();
    const press = trickIntent(facing(38), 0, STEP, memo);
    expect(press.skill).toBe(true);
    expect(press.moveZ).toBeLessThan(0.5);
  });

  it('presses at most once an exchange', () => {
    const memo = trickMemo(1, 'trickster');
    Object.assign(memo, { gap: 40, kind: 'flick' });
    expect(trickIntent(facing(38), 0, STEP, memo)).toMatchObject({ skill: true, moveZ: 1 });
    expect(trickIntent(facing(30), STEP, STEP, memo).skill).toBeFalsy();
  });

  it('draws a new gap and trick for the next exchange, once the other side has had the ball', () => {
    const memo = trickMemo(1, 'trickster');
    Object.assign(memo, { gap: 40, kind: 'stepover' });
    trickIntent(facing(38), 0, STEP, memo);
    const lost = facing(38);
    lost.ball.x = lost.away.x - FOOT_SPOT;
    trickIntent(lost, STEP, STEP, memo);
    expect(memo.pressed).toBe(false);
    expect(memo.gap).toBeGreaterThanOrEqual(10);
    expect(memo.gap).toBeLessThanOrEqual(70);
  });

  it('never presses with the defender facing away or out of his lane', () => {
    const memo = trickMemo(1, 'trickster');
    Object.assign(memo, { gap: 40, kind: 'stepover' });
    const away = facing(30);
    away.away.facing = 1;
    expect(trickIntent(away, 0, STEP, memo).skill).toBeFalsy();
    const wide = facing(30);
    wide.away.z += 20;
    expect(trickIntent(wide, 0, STEP, memo).skill).toBeFalsy();
  });
});

describe('the spammer', () => {
  it('presses whenever a trick could start, and not otherwise', () => {
    const memo = trickMemo(1, 'spammer');
    expect(trickIntent(facing(200), 0, STEP, memo).skill).toBe(true);
    const cooling = facing(200);
    cooling.home.trickCooldownS = 0.5;
    expect(trickIntent(cooling, 0, STEP, memo).skill).toBeFalsy();
    const loose = facing(200);
    loose.ball.x += 60;
    expect(trickIntent(loose, 0, STEP, memo).skill).toBeFalsy();
  });
});

describe('the plain script', () => {
  it('never presses RB', () => {
    const memo = trickMemo(1, 'plain');
    expect(trickIntent(facing(30), 0, STEP, memo).skill).toBeFalsy();
    expect(trickMatch('max', 'normal', 100, 'plain').trickStats.tricks).toBe(0);
  });

  it("plays exactly as maxMatch's scripted Harrison on seeds 100-103", () => {
    for (let seed = 100; seed < 104; seed++) {
      const pick = ({ result, score, longestStillS }: { result: unknown; score: unknown; longestStillS: number }) => ({ result, score, longestStillS });
      expect(pick(trickMatch('max', 'normal', seed, 'plain')), `seed ${seed}`).toEqual(pick(maxMatch('normal', seed)));
    }
  });
});
