import { describe, expect, it } from 'vitest';
import { BALL_REST_Y } from './ball';
import { BACKYARD, inGoalBox } from './field';
import { BALL_R } from '../art/ball';
import { DIFFICULTY } from './ai';
import { TURN_S, startDragBack } from './dragBack';
import { NO_INTENT, type PlayerIntent } from './player';
import { BASE_STATS } from './stats';
import { createWorld, stepWorld, type World } from './world';
import { ballAtFeet } from './zones';

const STEP = 1 / 60;
/** As in contact.test: touched about 14 px ahead, a Control 1 touch rolls the ball on by up to about 11 px. */
const DRIBBLE_RANGE = 26;
const run = (moveX: number): PlayerIntent => ({ ...NO_INTENT, moveX });

/** A world in play: Harrison at (x, z) facing `facing`, the ball at (bx, bz) at rest, Max out of the way. */
function stage(o: { x: number; z?: number; facing: 1 | -1; bx: number; bz?: number; max?: number }): World {
  const w = createWorld(BASE_STATS, BASE_STATS, 1, { home: 0, away: 0 }, null, null, DIFFICULTY.normal);
  w.match.phase = 'playing';
  const z = w.field.depth / 2;
  Object.assign(w.home, { x: o.x, z: o.z ?? z, facing: o.facing });
  Object.assign(w.away, { x: o.max ?? 60, z });
  Object.assign(w.ball, { x: o.bx, y: BALL_REST_Y, z: o.bz ?? z, vx: 0, vy: 0, vz: 0 });
  return w;
}

const ballLegal = (w: World): boolean =>
  !w.field.goals.some(g => inGoalBox(g, w.ball.x, w.ball.z, 0) && Math.abs(w.ball.x - g.lineX) > BALL_R) &&
  w.ball.x >= w.field.fenceL + BALL_R - 1e-9 &&
  w.ball.x <= w.field.fenceR - BALL_R + 1e-9;

describe('the drag-back', () => {
  it('dribbling at a run and reversing comes away the other way with the ball', () => {
    const w = stage({ x: 300, facing: 1, bx: 310 });
    for (let i = 0; i < 60; i++) stepWorld(w, run(1), NO_INTENT, STEP);
    expect(w.ball.x).toBeGreaterThan(w.home.x);
    for (let i = 0; i < 18; i++) stepWorld(w, run(-1), NO_INTENT, STEP);
    // Then he dribbles it away: between touches a Control 1 touch rolls it up to DRIBBLE_RANGE ahead.
    for (let i = 0; i < 18; i++) {
      stepWorld(w, run(-1), NO_INTENT, STEP);
      const ahead = w.home.x - w.ball.x;
      expect(ballAtFeet(w.home, w.ball) || (ahead >= 0 && ahead <= DRIBBLE_RANGE), `ball ${ahead.toFixed(1)} px ahead`).toBe(true);
    }
    expect(w.home.vx).toBeLessThan(0);
    expect(w.home.facing).toBe(-1);
    expect(w.ball.vx).toBeLessThan(0);
  });

  it('turns him at once and takes about TURN_S', () => {
    const w = stage({ x: 300, facing: 1, bx: 310 });
    expect(startDragBack(w, run(-1))).toBe(true);
    expect([w.home.facing, w.home.turnS]).toEqual([-1, TURN_S]);
    expect([w.ball.vx, w.ball.vz]).toEqual([0, 0]);
  });

  it('at a run or a sprint, reversing at any moment between touches turns him with the ball', () => {
    for (const sprint of [false, true])
      for (let k = 40; k < 100; k++) {
        const w = stage({ x: 300, facing: 1, bx: 310 });
        for (let i = 0; i < k; i++) stepWorld(w, { ...run(1), sprint }, NO_INTENT, STEP);
        const ahead = (w.ball.x - w.home.x).toFixed(1);
        expect(startDragBack(w, run(-1)), `${sprint ? 'sprint' : 'run'} after ${k} ticks, ball ${ahead} px ahead`).toBe(true);
      }
  });

  it('a ball knocked well ahead is not his to turn', () => {
    expect(startDragBack(stage({ x: 300, facing: 1, bx: 340 }), run(-1))).toBe(false);
  });

  it("a ball at Max's feet is not his to drag back", () => {
    const w = stage({ x: 300, facing: 1, bx: 312, max: 320 });
    w.away.facing = -1;
    expect(startDragBack(w, run(-1))).toBe(false);
  });

  it('only a firm push back the other way starts it, on the ground, in play', () => {
    expect(startDragBack(stage({ x: 300, facing: 1, bx: 310 }), run(-0.3))).toBe(false);
    expect(startDragBack(stage({ x: 300, facing: 1, bx: 310 }), run(1))).toBe(false);
    const charging = stage({ x: 300, facing: 1, bx: 310 });
    charging.home.state = 'charging';
    expect(startDragBack(charging, run(-1))).toBe(false);
    const kickoff = stage({ x: 300, facing: 1, bx: 310 });
    kickoff.match.phase = 'kickoff';
    expect(startDragBack(kickoff, run(-1))).toBe(false);
  });

  it('beside a post or the fence the ball is never put inside a goal or through the fence', () => {
    const right = BACKYARD.goals[1];
    const cases = [
      // Against the end fence behind the goal's side: his new front is past the fence.
      stage({ x: 630, z: 56, facing: -1, bx: 620, bz: 56 }),
      // Beside the goal, the ball in front of the line: pulling it round would go through the post and side net.
      stage({ x: right.lineX + 4, z: right.z1 + 7, facing: -1, bx: right.lineX - 8, bz: right.z1 - 2 }),
    ];
    for (const w of cases) {
      expect(startDragBack(w, run(1))).toBe(true);
      for (let i = 0; i < Math.ceil(TURN_S / STEP) + 2; i++) {
        stepWorld(w, run(1), NO_INTENT, STEP);
        expect(ballLegal(w), `ball at (${w.ball.x.toFixed(1)}, ${w.ball.z.toFixed(1)})`).toBe(true);
      }
    }
  });

  it('Max is still a real opponent during the turn', () => {
    // Harrison dribbling at Max drags it back; Max lunges in after it.
    const w = stage({ x: 300, facing: 1, bx: 310, max: 330 });
    w.away.facing = -1;
    stepWorld(w, run(-1), NO_INTENT, STEP);
    expect(w.home.turnS).toBeGreaterThan(0);
    let won = false;
    for (let i = 0; i < 12 && !won; i++) {
      stepWorld(w, run(-1), i === 0 ? { ...NO_INTENT, chipHeld: true } : NO_INTENT, STEP);
      won = w.events.kicks[1]!.tackledBall;
    }
    expect(won).toBe(true);
  });

  it('knocked down mid-turn, the drag-back ends and the ball stays where it is', () => {
    // Max slides in from behind Harrison and takes his feet before the ball comes round.
    const w = stage({ x: 300, facing: 1, bx: 310, max: 280 });
    w.away.facing = 1;
    stepWorld(w, run(-1), NO_INTENT, STEP);
    for (let i = 0; i < 12 && w.home.state !== 'fallen'; i++) stepWorld(w, run(-1), i === 0 ? { ...NO_INTENT, chipHeld: true } : NO_INTENT, STEP);
    expect(w.home.state).toBe('fallen');
    const at = w.ball.x;
    stepWorld(w, run(-1), NO_INTENT, STEP);
    expect(w.home.turnS).toBe(0);
    expect(w.ball.x).toBe(at);
  });
});
