import { describe, expect, it } from 'vitest';
import { BALL_R } from '../art/ball';
import { MUZZLE } from '../art/opponents/biscuit';
import { BALL_REST_Y } from './ball';
import { DOG_CATCH_SPEED, DOG_DIFFICULTY, DOG_SPEED, DWELL_PER_CONTROL, JINK_S, PANT_S, TUNING_STATS, dropBall, dwellFor } from './dog';
import { BACKYARD, goalScored, inGoalBox } from './field';
import { NO_INTENT, type PlayerIntent } from './player';
import { SPRINT_MULTIPLIER, runSpeed } from './stats';
import { createWorld, stepWorld, type World } from './world';

const STEP = 1 / 60;
const ERR = { home: 4, away: 6 };
const still = NO_INTENT;
const run = (moveX: number, moveZ = 0, sprint = false): PlayerIntent => ({ ...NO_INTENT, moveX, moveZ, sprint });
const slide: PlayerIntent = { ...NO_INTENT, chipHeld: true };
const LEFT_GOAL = BACKYARD.goals[0];

/** A boss world in play, with the dog and Harrison where the test wants them and the ball at (bx, bz). */
function boss(opts: { dog: [number, number]; home: [number, number]; ball: [number, number]; control?: number; d?: 'easy' | 'normal' | 'hard' }): World {
  const w = createWorld({ ...TUNING_STATS, control: opts.control ?? TUNING_STATS.control }, { speed: 1, power: 1, jump: 1, control: 1 }, 7, ERR, null, DOG_DIFFICULTY[opts.d ?? 'normal']);
  w.match.phase = 'playing';
  [w.away.x, w.away.z] = opts.dog;
  [w.home.x, w.home.z] = opts.home;
  Object.assign(w.ball, { x: opts.ball[0], z: opts.ball[1], y: BALL_REST_Y, vx: 0, vy: 0, vz: 0 });
  return w;
}
const ticks = (w: World, n: number, home = still, dog = still) => {
  for (let i = 0; i < n; i++) stepWorld(w, home, dog, STEP);
};

describe('the dog', () => {
  it('is faster than the tuning Harrison can sprint, by 10 to 15 percent', () => {
    const sprint = runSpeed(TUNING_STATS) * SPRINT_MULTIPLIER;
    expect(DOG_SPEED / sprint).toBeGreaterThanOrEqual(1.1);
    expect(DOG_SPEED / sprint).toBeLessThanOrEqual(1.15);
  });

  it('takes a loose ball at once when his muzzle reaches it, and carries it', () => {
    const w = boss({ dog: [300, 32], home: [100, 32], ball: [310, 32] });
    ticks(w, 1, still, run(1));
    expect(w.dog!.carrying).toBe(true);
    expect(w.events.dog.grabbed).toBe(true);
    expect(w.events.kicks[1]?.touched).toBe(true);
    ticks(w, 10, still, run(-1));
    expect(w.ball.x).toBeCloseTo(w.away.x - MUZZLE.x, 0);
    expect(w.ball.y).toBe(-MUZZLE.y);
    expect([w.ball.vx, w.ball.vy, w.ball.vz]).toEqual([0, 0, 0]);
  });

  it('a hard shot passes him', () => {
    const w = boss({ dog: [300, 32], home: [100, 32], ball: [292, 32] });
    w.ball.vx = DOG_CATCH_SPEED + 50;
    ticks(w, 3);
    expect(w.dog!.carrying).toBe(false);
  });

  it("a ball at Harrison's feet needs a dwell that grows with Control and shrinks with difficulty", () => {
    expect(dwellFor(DOG_DIFFICULTY.normal, 4)).toBeCloseTo(DOG_DIFFICULTY.normal.dwellS + 3 * DWELL_PER_CONTROL);
    expect(dwellFor(DOG_DIFFICULTY.hard, 4)).toBeLessThan(dwellFor(DOG_DIFFICULTY.normal, 4));
    for (const control of [1, 10]) {
      const w = boss({ dog: [118, 32], home: [100, 32], ball: [108, 32], control }); // the ball at Harrison's foot, the dog's muzzle on it
      const need = dwellFor(DOG_DIFFICULTY.normal, control);
      ticks(w, Math.floor(need / STEP) - 2, still, run(-1));
      expect(w.dog!.carrying, `control ${control} early`).toBe(false);
      ticks(w, 4, still, run(-1));
      expect(w.dog!.carrying, `control ${control} after the dwell`).toBe(true);
    }
  });

  it('turning away resets the dwell', () => {
    const w = boss({ dog: [118, 32], home: [100, 32], ball: [108, 32] });
    ticks(w, 2);
    expect(w.dog!.dwellS).toBeCloseTo(2 * STEP);
    // Harrison takes the ball out of the dog's lane, then back into it.
    [w.home.z, w.ball.z] = [52, 52];
    ticks(w, 1);
    expect(w.dog!.dwellS).toBe(0);
    [w.home.z, w.ball.z] = [32, 32];
    ticks(w, 1);
    expect(w.dog!.dwellS).toBeCloseTo(STEP);
    expect(w.dog!.carrying).toBe(false);
  });

  it('a carried ball into the net is a goal for him, and the kickoff clears the carry', () => {
    const w = boss({ dog: [80, 32], home: [500, 32], ball: [78, 32] });
    ticks(w, 1, still, run(-1));
    expect(w.dog!.carrying).toBe(true);
    ticks(w, 90, still, run(-1));
    expect(w.match.score.away).toBe(1);
    expect(w.match.phase).toBe('goal');
    ticks(w, 200); // through the goal pause to the kickoff
    expect(w.dog!.carrying).toBe(false);
    expect(w.match.kickoffTeam).toBe('home');
    expect(w.ball.x).toBe(BACKYARD.width / 2);
  });

  it('pants after staminaS of running flat out: sets the ball down, cannot grab, then takes it again', () => {
    const w = boss({ dog: [620, 32], home: [100, 60], ball: [618, 32] });
    const flatOut = run(-1, 0, true);
    ticks(w, 1, still, flatOut);
    expect(w.dog!.carrying).toBe(true);
    let ranS = 0;
    while (w.dog!.pantS === 0 && ranS < 10) {
      ticks(w, 1, still, flatOut);
      ranS += STEP;
    }
    // A staminaS budget, plus the moment it takes him to reach full speed.
    expect(ranS).toBeGreaterThanOrEqual(DOG_DIFFICULTY.normal.staminaS);
    expect(ranS).toBeLessThanOrEqual(DOG_DIFFICULTY.normal.staminaS + 0.2);
    expect(w.events.dog.panted).toBe(true);
    expect(w.dog!.carrying).toBe(false);
    expect(w.ball.y).toBe(BALL_REST_Y);
    expect(w.match.score.away).toBe(0);
    ticks(w, Math.floor(PANT_S / STEP) - 2, still, flatOut);
    expect(w.dog!.carrying).toBe(false);
    ticks(w, 4, still, flatOut);
    expect(w.dog!.carrying).toBe(true);
  });

  it('a slide during a jink knocks the ball out ahead of the tackle; at full speed it misses', () => {
    for (const jinking of [true, false]) {
      const w = boss({ dog: [300, 32], home: [272, 32], ball: [298, 32] });
      ticks(w, 1);
      expect(w.dog!.carrying).toBe(true);
      if (jinking) w.dog!.jinkS = JINK_S;
      let tackled = false;
      for (let i = 0; i < 10 && !tackled; i++) {
        ticks(w, 1, slide);
        tackled = w.events.dog.dropped;
      }
      expect(tackled, `jinking ${jinking}`).toBe(jinking);
      expect(w.dog!.carrying).toBe(!jinking);
      if (!jinking) continue;
      expect(w.events.kicks[0]!.tackledBall).toBe(true);
      expect(w.ball.vy).toBeGreaterThan(0);
      expect(w.ball.vx).toBeGreaterThan(0); // ahead of Harrison's slide, which runs to the right
    }
  });

  it('Harrison is never tripped by sliding at the dog', () => {
    const w = boss({ dog: [300, 32], home: [284, 32], ball: [500, 32] });
    let tripped = false;
    for (let i = 0; i < 20; i++) {
      ticks(w, 1, slide);
      tripped ||= w.events.kicks[0]!.trippedOpponent;
      expect(w.away.state).toBe('ground');
    }
    expect(tripped).toBe(false);
  });

  it('a dropped ball beside the fence or a post lands somewhere it may be', () => {
    // At the end fence, beside the goal: his muzzle would be through the fence.
    const fence = boss({ dog: [12, 8], home: [200, 32], ball: [10, 8] });
    ticks(fence, 1, still, run(-1));
    expect(fence.dog!.carrying).toBe(true);
    dropBall(fence, true);
    for (let i = 0; i < 60; i++) {
      ticks(fence, 1);
      expect(fence.ball.x).toBeGreaterThanOrEqual(fence.field.fenceL + BALL_R);
    }
    // At the near post, facing the goal, with Harrison's tackle popping it at the net.
    const post = boss({ dog: [36, LEFT_GOAL.z0], home: [200, 32], ball: [34, LEFT_GOAL.z0] });
    ticks(post, 1, still, run(-1));
    expect(post.dog!.carrying).toBe(true);
    post.home.facing = -1;
    dropBall(post, true);
    for (let i = 0; i < 90; i++) {
      ticks(post, 1);
      const b = post.ball;
      if (inGoalBox(LEFT_GOAL, b.x, b.z)) expect(goalScored(post.field, b) ?? post.match.phase).not.toBe('playing');
    }
  });

  it('a pause freezes the dog: nothing moves or counts while play is not live', () => {
    const w = boss({ dog: [300, 32], home: [100, 32], ball: [298, 32] });
    ticks(w, 1, still, run(-1));
    const x = w.away.x;
    w.dog!.jinkS = JINK_S;
    w.match.phase = 'kickoff';
    ticks(w, 30, still, run(-1));
    expect(w.dog!.jinkS).toBe(JINK_S);
    expect(w.away.x).toBe(x);
  });

  it('a world without a dog has no dog events and steps as before', () => {
    const w = createWorld(TUNING_STATS, { speed: 1, power: 1, jump: 1, control: 1 }, 7, ERR);
    expect(w.dog).toBeNull();
    stepWorld(w, still, still, STEP);
    expect(w.events.dog).toEqual({ grabbed: false, dropped: false, jinked: false, panted: false });
  });
});
