import { describe, expect, it } from 'vitest';
import { BALL_REST_Y } from './ball';
import { DOG_BACKPEDAL_SPEED, DOG_DIFFICULTY, JINK_S, TUNING_STATS, parkBall, type DogProfile } from './dog';
import { createDogBrain, dogThink, type DogBrain } from './dogAi';
import { NO_INTENT, type PlayerIntent } from './player';
import { POWERED_S } from './power';
import { createWorld, stepWorld, type World } from './world';

const STEP = 1 / 60;
const ERR = { home: 0, away: 0 };
const AWAY_STATS = { speed: 1, power: 1, jump: 1, control: 1 };
/** Max backs off to at least this far from the ball when he gets it right (ai.ts BACK_OFF_GAP.from). */
const GOOD_GAP = 110;

/** A boss world in play with Harrison, the ball and the dog placed by hand; `kit` gives Harrison a full meter. */
function scene(opts: { dog: number; home: number; ball: number; z?: number; kit?: boolean; profile?: DogProfile; seed?: number }): World {
  const z = opts.z ?? 32;
  const w = createWorld(TUNING_STATS, AWAY_STATS, opts.seed ?? 5, ERR, opts.kit ? { golden: false } : null, opts.profile ?? DOG_DIFFICULTY.normal);
  w.match.phase = 'playing';
  if (w.power) w.power.meter = 1;
  Object.assign(w.home, { x: opts.home, z, facing: 1 });
  Object.assign(w.away, { x: opts.dog, z, facing: -1 });
  Object.assign(w.ball, { x: opts.ball, y: BALL_REST_Y, z, vx: 0, vy: 0, vz: 0 });
  return w;
}
const carrying = (w: World): World => {
  w.dog!.carrying = true;
  parkBall(w);
  return w;
};
const stepper = (w: World, brain: DogBrain) => (home: PlayerIntent = NO_INTENT) => stepWorld(w, home, dogThink(brain, w, STEP), STEP);
const sure = (p: DogProfile): DogProfile => ({ ...p, braceSense: 1 });

describe('dogThink', () => {
  it('with the ball, runs at the left goal flat out', () => {
    const w = carrying(scene({ dog: 300, home: 500, ball: 290 }));
    const brain = createDogBrain(DOG_DIFFICULTY.normal);
    const intent = dogThink(brain, w, STEP);
    expect(intent.moveX).toBeLessThan(0);
    expect(intent.sprint).toBe(true);
    expect(brain.plan).toBe('carry');
  });

  it('jinks when Harrison blocks the lane, to the roomier side, then not again until the cooldown', () => {
    const w = carrying(scene({ dog: 200, home: 180, ball: 190 }));
    const brain = createDogBrain(DOG_DIFFICULTY.normal);
    const intent = dogThink(brain, w, STEP);
    expect(w.dog!.jinkS).toBe(JINK_S);
    expect(brain.plan).toBe('jink');
    expect(intent.moveZ).toBe(w.dog!.jinkSide);
    expect(intent.moveX).toBeLessThan(0);
    stepWorld(w, NO_INTENT, intent, STEP);
    expect(w.events.dog.jinked).toBe(true);
    // Harrison steps out of the way, so the jink runs its course with the ball.
    w.home.z = 60;
    const step = stepper(w, brain);
    while (w.dog!.jinkS > 0) step();
    expect(w.dog!.jinkCooldownS).toBeGreaterThan(0);
    expect(w.dog!.carrying).toBe(true);
    // Harrison steps back into his lane: no jink until the cooldown is over.
    Object.assign(w.home, { x: w.away.x - 16, z: w.away.z, vx: 0, vz: 0 });
    dogThink(brain, w, STEP);
    expect(w.dog!.jinkS).toBe(0);
    while (w.dog!.jinkCooldownS > 0) w.dog!.jinkCooldownS = Math.max(0, w.dog!.jinkCooldownS - STEP);
    dogThink(brain, w, STEP);
    expect(w.dog!.jinkS).toBe(JINK_S);
  });

  it('jinks toward open grass, away from a Harrison off his line', () => {
    const w = carrying(scene({ dog: 200, home: 182, ball: 190, z: 32 }));
    w.home.z = 36;
    const brain = createDogBrain(DOG_DIFFICULTY.normal);
    dogThink(brain, w, STEP);
    expect(w.dog!.jinkSide).toBe(-1);
  });

  it('dodges a Harrison charging at him at full speed: no jink, no window', () => {
    const w = carrying(scene({ dog: 200, home: 178, ball: 190 }));
    w.home.vx = 150;
    const brain = createDogBrain(DOG_DIFFICULTY.normal);
    const intent = dogThink(brain, w, STEP);
    expect(w.dog!.jinkS).toBe(0);
    expect(intent.sprint).toBe(true);
    expect(intent.moveX).toBeLessThan(0);
    expect(intent.moveZ).not.toBe(0);
    expect(brain.plan).toBe('carry');
  });

  it('never jinks into a goal: beside its post he cuts the other way', () => {
    const w = carrying(scene({ dog: 612, home: 594, ball: 602 }));
    [w.away.z, w.home.z] = [52, 52];
    const brain = createDogBrain(DOG_DIFFICULTY.normal);
    dogThink(brain, w, STEP);
    expect(w.dog!.jinkS).toBe(JINK_S);
    expect(w.dog!.jinkSide).toBe(1);
  });

  it('does not jink for a fallen Harrison or one off the lane', () => {
    const fallen = carrying(scene({ dog: 200, home: 180, ball: 190 }));
    fallen.home.state = 'fallen';
    dogThink(createDogBrain(DOG_DIFFICULTY.normal), fallen, STEP);
    expect(fallen.dog!.jinkS).toBe(0);
    const wide = carrying(scene({ dog: 200, home: 180, ball: 190 }));
    wide.home.z = 50;
    dogThink(createDogBrain(DOG_DIFFICULTY.normal), wide, STEP);
    expect(wide.dog!.jinkS).toBe(0);
  });

  it('knocked off the ball, he stands shaking it off until he can grab again', () => {
    const w = scene({ dog: 300, home: 240, ball: 330 });
    w.dog!.regrabS = 0.5;
    const brain = createDogBrain(DOG_DIFFICULTY.normal);
    const intent = dogThink(brain, w, STEP);
    expect(brain.plan).toBe('dazed');
    expect([intent.moveX, intent.moveZ]).toEqual([0, 0]);
    // Shaken off, he goes for the loose ball after his reaction time, as Max would.
    w.dog!.regrabS = 0;
    let ticks = 0;
    while (dogThink(brain, w, STEP).moveX === 0 && ticks < 60) ticks++;
    expect(brain.plan).toBe('chase');
    expect(ticks * STEP).toBeCloseTo(DOG_DIFFICULTY.normal.reactionS, 1);
  });

  it("chases a loose ball and a ball at Harrison's feet", () => {
    const loose = scene({ dog: 400, home: 100, ball: 250 });
    const brain = createDogBrain(DOG_DIFFICULTY.normal);
    const intent = dogThink(brain, loose, STEP);
    expect(brain.plan).toBe('chase');
    expect(intent.moveX).toBeLessThan(0);
    expect(intent.sprint).toBe(true);
    const atFeet = scene({ dog: 400, home: 200, ball: 208 });
    const brain2 = createDogBrain(DOG_DIFFICULTY.normal);
    expect(dogThink(brain2, atFeet, STEP).moveX).toBeLessThan(0);
    expect(brain2.plan).toBe('chase');
  });

  it('goes round Harrison to reach a ball on his far side', () => {
    const w = scene({ dog: 260, home: 230, ball: 210 });
    w.home.facing = -1;
    const brain = createDogBrain(DOG_DIFFICULTY.normal);
    const step = stepper(w, brain);
    for (let i = 0; i < 90 && !w.dog!.carrying; i++) step();
    expect(w.dog!.carrying).toBe(true);
  });

  it('never sidesteps into a goal: beside it, he still reaches a ball in the corner', () => {
    const w = scene({ dog: 607, home: 615, ball: 614 });
    [w.away.z, w.home.z] = [25, 13];
    Object.assign(w.ball, { z: 5 });
    const brain = createDogBrain(DOG_DIFFICULTY.hard);
    const step = stepper(w, brain);
    for (let i = 0; i < 120 && !w.dog!.carrying; i++) step();
    expect(w.dog!.carrying).toBe(true);
  });

  it('from beside a goal, he goes round its post to a ball in its mouth', () => {
    const w = scene({ dog: 25, home: 200, ball: 25.5 });
    [w.away.z, w.ball.z] = [51, 37];
    const brain = createDogBrain(DOG_DIFFICULTY.normal);
    const step = stepper(w, brain);
    for (let i = 0; i < 120 && !w.dog!.carrying; i++) step();
    expect(w.dog!.carrying).toBe(true);
  });

  it("when Harrison powers up, backs off at Max's pace, facing him, and never closes", () => {
    for (let seed = 1; seed <= 6; seed++) {
      const w = scene({ dog: 260, home: 200, ball: 208, kit: true, profile: sure(DOG_DIFFICULTY.normal), seed });
      const brain = createDogBrain(w.dog!.profile);
      const step = stepper(w, brain);
      step({ ...NO_INTENT, powerHeld: true });
      expect(w.events.power.started).toBe(true);
      let gap = Math.hypot(w.away.x - w.ball.x, w.away.z - w.ball.z);
      for (let i = 0; i < 120; i++) {
        step();
        const now = Math.hypot(w.away.x - w.ball.x, w.away.z - w.ball.z);
        expect(now, `seed ${seed} tick ${i}`).toBeGreaterThanOrEqual(gap - 1e-9);
        expect(Math.hypot(w.away.vx, w.away.vz)).toBeLessThanOrEqual(DOG_BACKPEDAL_SPEED + 1);
        gap = now;
      }
      expect(brain.plan).toBe('backOff');
      expect(w.away.facing).toBe(-1);
      expect(w.away.x - w.ball.x).toBeGreaterThan(GOOD_GAP - 5);
    }
  });

  it("gets it wrong at Max's odds", () => {
    for (const d of ['easy', 'normal', 'hard'] as const) {
      const profile = DOG_DIFFICULTY[d];
      let wrong = 0;
      const N = 400;
      for (let seed = 1; seed <= N; seed++) {
        const w = scene({ dog: 260, home: 200, ball: 208, kit: true, profile, seed });
        w.power!.activeS = POWERED_S;
        const brain = createDogBrain(profile);
        dogThink(brain, w, STEP);
        const b = brain.backOff;
        if (b === 'stay' || b === null || b.inS > profile.reactionS || b.gap < GOOD_GAP) wrong++;
      }
      expect(Math.abs(wrong / N - (1 - profile.braceSense)), d).toBeLessThanOrEqual(0.08);
    }
  });

  it('a live wave: he holds the lane', () => {
    const w = scene({ dog: 420, home: 200, ball: 208, kit: true, profile: sure(DOG_DIFFICULTY.normal) });
    const brain = createDogBrain(w.dog!.profile);
    const step = stepper(w, brain);
    step({ ...NO_INTENT, powerHeld: true });
    for (let i = 0; i < 120 && !w.events.power.ready; i++) step();
    step({ ...NO_INTENT, shootHeld: true });
    expect(w.events.power.fired).toBe(true);
    dogThink(brain, w, STEP);
    expect(brain.plan).toBe('faceWave');
  });
});
