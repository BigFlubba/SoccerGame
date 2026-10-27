import { describe, expect, it } from 'vitest';
import { BALL_R } from '../art/ball';
import { MUZZLE } from '../art/opponents/biscuit';
import { BALL_REST_Y } from './ball';
import { DOG_CATCH_SPEED, DOG_DIFFICULTY, DOG_SPEED, DWELL_PER_CONTROL, JINK_S, PANT_S, TRAPPED_S, TUNING_STATS, canGrab, dropBall, dwellFor, parkBall } from './dog';
import { createDogBrain, dogThink } from './dogAi';
import { BACKYARD, goalScored, inGoalBox } from './field';
import { BLOWN_DOWN_S, BRACE_S, NO_INTENT, PLAYER_R, type PlayerIntent } from './player';
import { SPRINT_MULTIPLIER, runSpeed } from './stats';
import { WAVE_SPEED } from './wave';
import { createWorld, placeForKickoff, stepWorld, type World } from './world';

const STEP = 1 / 60;
const ERR = { home: 4, away: 6 };
const still = NO_INTENT;
const run = (moveX: number, moveZ = 0, sprint = false): PlayerIntent => ({ ...NO_INTENT, moveX, moveZ, sprint });
const slide: PlayerIntent = { ...NO_INTENT, chipHeld: true };
const LEFT_GOAL = BACKYARD.goals[0];

/** A boss world in play, with the dog and Harrison where the test wants them and the ball at (bx, bz). */
function boss(opts: { dog: [number, number]; home: [number, number]; ball: [number, number]; control?: number; d?: 'easy' | 'normal' | 'hard'; kit?: boolean }): World {
  const kit = opts.kit ? { golden: false } : null;
  const w = createWorld({ ...TUNING_STATS, control: opts.control ?? TUNING_STATS.control }, { speed: 1, power: 1, jump: 1, control: 1 }, 7, ERR, kit, DOG_DIFFICULTY[opts.d ?? 'normal']);
  if (w.power) w.power.meter = 1;
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
    expect(w.dog!.carryS).toBe(0);
    ticks(w, 10, still, run(-1));
    expect(w.dog!.carryS).toBeCloseTo(10 * STEP);
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

  it('pressing into Harrison with the ball between them is no 50/50: the dwell decides', () => {
    // The ball at Harrison's feet and inside both bodies: against Max it would squirt up and out.
    const w = boss({ dog: [111, 32], home: [100, 32], ball: [106, 32] });
    ticks(w, 3, still, run(-1));
    expect(w.ball.y).toBe(BALL_REST_Y);
    expect(w.dog!.carrying).toBe(false);
    expect(w.dog!.dwellS).toBeGreaterThan(0);
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

  it('a kickoff rests him: a full stamina budget and no jink cooldown', () => {
    const w = boss({ dog: [300, 32], home: [100, 32], ball: [500, 32] });
    Object.assign(w.dog!, { runS: DOG_DIFFICULTY.normal.staminaS - 0.1, jinkCooldownS: 0.5 });
    placeForKickoff(w);
    expect([w.dog!.runS, w.dog!.jinkCooldownS]).toEqual([0, 0]);
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
      expect(w.dog!.jinkS, 'losing the ball ends the jink').toBe(0);
      expect(w.ball.vy).toBeGreaterThan(0);
      expect(w.ball.vx).toBeGreaterThan(0); // ahead of Harrison's slide, which runs to the right
    }
  });

  it('pinned in a corner with the ball, he sets it down', () => {
    // Beside the right goal's near post, the boards below him and Harrison in front.
    const w = boss({ dog: [617, 5], home: [607, 5], ball: [607, 5] });
    w.dog!.carrying = true;
    parkBall(w);
    ticks(w, Math.round(TRAPPED_S / STEP) - 5, still, run(-1, -1, true));
    expect(w.dog!.carrying).toBe(true);
    ticks(w, 10, still, run(-1, -1, true));
    expect(w.dog!.carrying).toBe(false);
    expect(w.ball.y).toBe(BALL_REST_Y);
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

describe('the wave and the dog', () => {
  /** Harrison on the ball at x 200 with a full meter and the dog at dogX facing him; Harrison powers up and waits for the wave. */
  function readyToFire(dogX: number, homeX = 200): World {
    const w = boss({ dog: [dogX, 32], home: [homeX, 32], ball: [homeX + 8, 32], kit: true });
    ticks(w, 1, { ...NO_INTENT, powerHeld: true });
    expect(w.events.power.started).toBe(true);
    for (let i = 0; i < 120 && !w.events.power.ready; i++) ticks(w, 1);
    return w;
  }
  const fire = (w: World) => ticks(w, 1, { ...NO_INTENT, shootHeld: true });
  /** Once the brace ends he reacts and runs the skidded-off ball down within this long. */
  const RUN_DOWN_S = 0.5;

  it('braced from range: he digs in, the ball dies in front of him, and he takes it once the brace ends', () => {
    const w = readyToFire(358);
    fire(w);
    let braced = false;
    for (let i = 0; i < 20 && !braced; i++) {
      ticks(w, 1);
      braced = w.events.power.braced;
    }
    expect(braced).toBe(true);
    expect(w.away.state).toBe('bracing');
    expect([w.ball.vx, w.ball.vz]).toEqual([0, 0]);
    expect(canGrab(w)).toBe(false);
    // He skids back on the brace, as Max does, then runs the dead ball down: a turnover.
    const brain = createDogBrain(w.dog!.profile);
    for (let i = 0; i < Math.ceil((BRACE_S + RUN_DOWN_S) / STEP) && !w.dog!.carrying; i++) stepWorld(w, still, dogThink(brain, w, STEP), STEP);
    expect(w.dog!.carrying).toBe(true);
  });

  it('fired from close: he is blown away, lands inside the field on his feet, and the ball runs on', () => {
    for (const [dogX, homeX] of [[248, 200], [572, 524]] as const) {
      const w = readyToFire(dogX, homeX);
      fire(w);
      let blown = false;
      for (let i = 0; i < 10 && !blown; i++) {
        ticks(w, 1);
        blown = w.events.power.blown;
      }
      expect(blown, `from ${dogX}`).toBe(true);
      // The ball runs on at wave speed (less the tick of friction its own step takes off).
      expect(w.ball.vx).toBeGreaterThan(WAVE_SPEED * w.wave!.dirX * 0.99);
      let downS = 0;
      while (w.away.state === 'blown') {
        expect(canGrab(w)).toBe(false);
        ticks(w, 1);
        downS += STEP;
      }
      expect(downS).toBeCloseTo(BLOWN_DOWN_S, 1);
      expect(w.dog!.carrying).toBe(false);
      expect([w.away.state, w.away.y]).toEqual(['ground', 0]);
      expect(w.away.x).toBeGreaterThanOrEqual(w.field.fenceL + PLAYER_R);
      expect(w.away.x).toBeLessThanOrEqual(w.field.fenceR - PLAYER_R);
      for (const g of w.field.goals) expect(inGoalBox(g, w.away.x, w.away.z)).toBe(false);
    }
  });

  it('a dwell that would finish on the tick the wave fires loses: the wave takes the ball', () => {
    const w = readyToFire(420);
    // He arrives at Harrison's feet with the snatch one tick from done just as Harrison fires.
    Object.assign(w.away, { x: 216, z: 32, facing: -1, vx: 0, vz: 0 });
    w.dog!.dwellS = dwellFor(w.dog!.profile, w.home.stats.control) - STEP / 2;
    fire(w);
    expect(w.events.power.fired).toBe(true);
    expect(w.events.dog.grabbed).toBe(false);
    expect(w.dog!.carrying).toBe(false);
    expect(Math.abs(w.ball.vx)).toBeGreaterThan(DOG_CATCH_SPEED);
  });

  it('a wave never fires while he carries, because Harrison has no ball', () => {
    const w = boss({ dog: [300, 32], home: [270, 32], ball: [290, 32], kit: true });
    w.dog!.carrying = true;
    parkBall(w);
    ticks(w, 1, { ...NO_INTENT, powerHeld: true });
    expect(w.events.power.started).toBe(false);
    expect(w.power!.meter).toBe(1);
  });
});
