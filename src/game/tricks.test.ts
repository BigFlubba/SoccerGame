import { describe, expect, it } from 'vitest';
import { BALL_R } from '../art/ball';
import { DIFFICULTY } from './ai';
import { BALL_REST_Y } from './ball';
import { KEEP_OUT_X } from './contact';
import { DOG_DIFFICULTY } from './dog';
import { BACKYARD, inGoalBox } from './field';
import { NO_INTENT, NORMAL_HANDLING, type PlayerIntent } from './player';
import { POWERED_S, type PowerKit } from './power';
import { BASE_STATS, runSpeed, type Stats } from './stats';
import { FOOT_SPOT } from './steal';
import { FLICK, STEPOVER, TRICK_COOLDOWN_S, TRICK_DIFFICULTY, type TrickSetup } from './tricks';
import { fireWave } from './wave';
import { createWorld, stepWorld, type World } from './world';

const STEP = 1 / 60;
const ticks = (s: number) => Math.round(s / STEP);
const SETUP: TrickSetup = { profile: TRICK_DIFFICULTY.normal, scale: { stepover: 1, flick: 1 } };
const RB: PlayerIntent = { ...NO_INTENT, skill: true };
const FLICK_PRESS: PlayerIntent = { ...RB, moveZ: 0.6 };
const run = (moveX: number): PlayerIntent => ({ ...NO_INTENT, moveX });
const TUNING: Stats = { speed: 7, power: 5, jump: 4, control: 5 };

interface Stage {
  x?: number;
  z?: number;
  facing?: 1 | -1;
  /** The ball's x; at his feet (FOOT_SPOT ahead) when absent. */
  bx?: number;
  max?: number;
  tricks?: TrickSetup | null;
  stats?: Stats;
  kit?: PowerKit;
  dog?: boolean;
}

/** A world in play: Harrison at (x, z) with the ball at his feet, Max (or the dog) out of the way. */
function stage(o: Stage = {}): World {
  const tricks = o.tricks === undefined ? SETUP : o.tricks;
  const w = createWorld(o.stats ?? BASE_STATS, BASE_STATS, 1, { home: 0, away: 0 }, o.kit ?? null, o.dog ? DOG_DIFFICULTY.normal : null, DIFFICULTY.normal, NORMAL_HANDLING, tricks);
  w.match.phase = 'playing';
  const mid = w.field.depth / 2;
  const [x, facing] = [o.x ?? 300, o.facing ?? 1];
  Object.assign(w.home, { x, z: o.z ?? mid, facing });
  Object.assign(w.away, { x: o.max ?? 60, z: mid });
  Object.assign(w.ball, { x: o.bx ?? x + facing * FOOT_SPOT, y: BALL_REST_Y, z: o.z ?? mid, vx: 0, vy: 0, vz: 0 });
  return w;
}

const ballLegal = (w: World): boolean =>
  !w.field.goals.some(g => inGoalBox(g, w.ball.x, w.ball.z, 0) && Math.abs(w.ball.x - g.lineX) > BALL_R) &&
  w.ball.x >= w.field.fenceL + BALL_R - 1e-9 &&
  w.ball.x <= w.field.fenceR - BALL_R + 1e-9;

/** Steps until the flick lets the ball go; returns Harrison's x on that tick. */
function toRelease(w: World): number {
  for (let i = 0; i < 60 && !w.events.trick.released; i++) stepWorld(w, NO_INTENT, NO_INTENT, STEP);
  expect(w.events.trick.released).toBe(true);
  return w.home.x;
}

describe('starting a trick', () => {
  it('RB with the ball at his feet starts a stepover', () => {
    const w = stage();
    stepWorld(w, RB, NO_INTENT, STEP);
    expect(w.events.trick.started).toBe('stepover');
    expect(w.home.trick?.kind).toBe('stepover');
  });

  it('RB with the stick up starts a rainbow flick', () => {
    const w = stage();
    stepWorld(w, FLICK_PRESS, NO_INTENT, STEP);
    expect(w.events.trick.started).toBe('flick');
  });

  it('the stick only half up is still a stepover', () => {
    const w = stage();
    stepWorld(w, { ...RB, moveZ: 0.4 }, NO_INTENT, STEP);
    expect(w.events.trick.started).toBe('stepover');
  });

  it("facing his own goal inside the keep-out zone, stick up + RB does a stepover", () => {
    const own = BACKYARD.goals[0];
    const w = stage({ x: own.lineX + KEEP_OUT_X - 20, facing: -1, max: 400 });
    stepWorld(w, FLICK_PRESS, NO_INTENT, STEP);
    expect(w.events.trick.started).toBe('stepover');
  });

  it('outside the keep-out zone, or facing upfield inside it, stick up + RB flicks', () => {
    const own = BACKYARD.goals[0];
    for (const s of [{ x: own.lineX + KEEP_OUT_X + 20, facing: -1 as const }, { x: own.lineX + 60, facing: 1 as const }]) {
      const w = stage({ ...s, max: 400 });
      stepWorld(w, FLICK_PRESS, NO_INTENT, STEP);
      expect(w.events.trick.started).toBe('flick');
    }
  });
});

describe('the stepover', () => {
  it('keeps the ball at his feet for the whole trick, his own touches quiet', () => {
    const w = stage();
    stepWorld(w, RB, NO_INTENT, STEP);
    for (let i = 1; i < ticks(STEPOVER.durationS); i++) {
      expect(Math.abs((w.ball.x - w.home.x) * w.home.facing - FOOT_SPOT), `tick ${i}`).toBeLessThanOrEqual(3);
      expect(w.events.kicks[0]!.touched || w.events.kicks[0]!.kicked !== null).toBe(false);
      stepWorld(w, run(1), NO_INTENT, STEP);
    }
  });

  it('eases him forward at half his run whatever the stick says, then frees him', () => {
    for (const stick of [NO_INTENT, run(-1), { ...NO_INTENT, moveX: 1, moveZ: -1 }]) {
      const w = stage();
      const z = w.home.z;
      stepWorld(w, { ...stick, skill: true }, NO_INTENT, STEP);
      for (let i = 2; i < ticks(STEPOVER.durationS); i++) stepWorld(w, stick, NO_INTENT, STEP);
      expect(w.home.vx).toBeCloseTo(STEPOVER.pace * runSpeed(BASE_STATS), 0);
      expect(w.home.z).toBe(z);
      stepWorld(w, stick, NO_INTENT, STEP);
      expect(w.home.trick).toBeNull();
    }
  });
});

describe('the rainbow flick', () => {
  it('rides the ball up behind his heel to rideY before the sell', () => {
    const w = stage();
    stepWorld(w, FLICK_PRESS, NO_INTENT, STEP);
    for (let i = 1; i < ticks(FLICK.sellS) - 1; i++) stepWorld(w, NO_INTENT, NO_INTENT, STEP);
    expect(w.events.trick.released).toBe(false);
    expect((w.ball.x - w.home.x) * w.home.facing).toBeLessThan(0);
    expect(w.ball.y).toBeGreaterThan(FLICK.rideY * 0.8);
  });

  it('launches it at the sell, up and forward', () => {
    const w = stage();
    stepWorld(w, FLICK_PRESS, NO_INTENT, STEP);
    let n = 1;
    for (; n < 60 && !w.events.trick.released; n++) stepWorld(w, NO_INTENT, NO_INTENT, STEP);
    expect(n * STEP).toBeCloseTo(FLICK.sellS, 1);
    expect(w.ball.vy).toBeGreaterThan(0);
    expect(w.ball.vx * w.home.facing).toBeGreaterThan(0);
  });

  it("clears a standing player's head everywhere 12-56 px ahead of where it left his heel", () => {
    const w = stage();
    stepWorld(w, FLICK_PRESS, NO_INTENT, STEP);
    const from = toRelease(w);
    for (let i = 0; i < 90; i++) {
      const ahead = w.ball.x - from;
      if (ahead >= 12 && ahead <= 56) expect(w.ball.y, `${ahead.toFixed(1)} px ahead`).toBeGreaterThanOrEqual(45);
      stepWorld(w, run(1), NO_INTENT, STEP);
    }
  });

  it.each([
    ['level 1 speed', BASE_STATS],
    ['the tuning stats', TUNING],
  ])('lands 60-100 px ahead, Harrison (%s) running on just behind it', (_, stats) => {
    const w = stage({ stats });
    stepWorld(w, FLICK_PRESS, NO_INTENT, STEP);
    const from = toRelease(w);
    let landed: { ahead: number; behind: number } | null = null;
    for (let i = 0; i < 120 && landed === null; i++) {
      stepWorld(w, run(1), NO_INTENT, STEP);
      if (w.events.ball.bounced) landed = { ahead: w.ball.x - from, behind: w.ball.x - w.home.x };
    }
    expect(landed!.ahead).toBeGreaterThanOrEqual(60);
    expect(landed!.ahead).toBeLessThanOrEqual(100);
    expect(landed!.behind).toBeGreaterThanOrEqual(0);
    expect(landed!.behind).toBeLessThanOrEqual(40);
  });
});

describe('committed to a trick', () => {
  it('a shot pressed during a trick waits for it to end', () => {
    const w = stage();
    const shoot: PlayerIntent = { ...NO_INTENT, shootHeld: true };
    stepWorld(w, RB, NO_INTENT, STEP);
    for (let i = 1; i < ticks(STEPOVER.durationS); i++) {
      stepWorld(w, shoot, NO_INTENT, STEP);
      expect(w.home.state).toBe('ground');
    }
    stepWorld(w, shoot, NO_INTENT, STEP);
    stepWorld(w, shoot, NO_INTENT, STEP);
    expect(w.home.state).toBe('charging');
  });

  it('a steal pressed during a trick does nothing', () => {
    const w = stage();
    stepWorld(w, RB, NO_INTENT, STEP);
    stepWorld(w, { ...NO_INTENT, steal: true }, NO_INTENT, STEP);
    expect(w.events.steal).toBeNull();
    expect([w.home.stealCooldownS, w.home.stumbleS]).toEqual([0, 0]);
  });

  it('a trick ends a power-up and keeps the meter', () => {
    const w = stage({ kit: { golden: false } });
    Object.assign(w.power!, { meter: 1, activeS: POWERED_S });
    stepWorld(w, RB, NO_INTENT, STEP);
    expect(w.events.trick.started).toBe('stepover');
    expect(w.power!.activeS).toBe(0);
    expect(w.events.power.cancelled).toBe(true);
    expect(w.power!.meter).toBe(1);
  });
});

describe('the cooldown', () => {
  it('starts as a trick ends', () => {
    const w = stage();
    stepWorld(w, RB, NO_INTENT, STEP);
    for (let i = 1; i < ticks(STEPOVER.durationS); i++) stepWorld(w, NO_INTENT, NO_INTENT, STEP);
    expect(w.home.trick).toBeNull();
    expect(w.home.trickCooldownS).toBeCloseTo(TRICK_COOLDOWN_S, 5);
  });

  it('RB during it does nothing, and the press is not saved for later', () => {
    const w = stage();
    stepWorld(w, RB, NO_INTENT, STEP);
    for (let i = 1; i < ticks(STEPOVER.durationS + TRICK_COOLDOWN_S / 2); i++) stepWorld(w, NO_INTENT, NO_INTENT, STEP);
    Object.assign(w.ball, { x: w.home.x + FOOT_SPOT, z: w.home.z, vx: 0, vz: 0 });
    stepWorld(w, RB, NO_INTENT, STEP);
    expect(w.events.trick.started).toBeNull();
    for (let i = 0; i < ticks(TRICK_COOLDOWN_S); i++) {
      stepWorld(w, NO_INTENT, NO_INTENT, STEP);
      expect(w.events.trick.started).toBeNull();
    }
    Object.assign(w.ball, { x: w.home.x + FOOT_SPOT, z: w.home.z, vx: 0, vz: 0 });
    stepWorld(w, RB, NO_INTENT, STEP);
    expect(w.events.trick.started).toBe('stepover');
  });
});

describe('RB when no trick can start (Review Focus 5)', () => {
  const cases: [string, () => World][] = [
    ['without the ball', () => stage({ bx: 360 })],
    ['in the air', () => {
      const w = stage();
      Object.assign(w.home, { state: 'air', y: 10, vy: 50 });
      return w;
    }],
    ['mid-drag-back', () => {
      const w = stage();
      stepWorld(w, run(-1), NO_INTENT, STEP);
      expect(w.home.turnS).toBeGreaterThan(0);
      return w;
    }],
    ['stumbling', () => {
      const w = stage();
      w.home.stumbleS = 0.3;
      return w;
    }],
    ['with a live wave', () => {
      const w = stage();
      w.wave = fireWave(w);
      return w;
    }],
    ['while the dog carries the ball', () => {
      const w = stage({ dog: true });
      w.dog!.carrying = true;
      return w;
    }],
    ['without the tricks', () => stage({ tricks: null })],
  ];

  it.each(cases)('%s it starts nothing and no cooldown', (_, make) => {
    const w = make();
    stepWorld(w, RB, NO_INTENT, STEP);
    expect(w.events.trick.started).toBeNull();
    expect(w.home.trick).toBeNull();
    expect(w.home.trickCooldownS).toBe(0);
  });

  it('during the cooldown it starts nothing and leaves the cooldown running', () => {
    const w = stage();
    w.home.trickCooldownS = 0.5;
    stepWorld(w, RB, NO_INTENT, STEP);
    expect(w.home.trick).toBeNull();
    expect(w.home.trickCooldownS).toBeLessThan(0.5);
  });
});

describe('a trick beside a fence, a post or a net (Review Focus 1)', () => {
  const right = BACKYARD.goals[1];
  const spots: [string, Stage][] = [
    ['running at the end fence beside the goal', { x: 622, z: 56, facing: 1 }],
    ['running past the post', { x: right.lineX - 12, z: right.z1 + 2, facing: 1 }],
    ['backing onto the near fence', { x: 12, z: 56, facing: 1 }],
  ];

  it.each(spots)('%s, neither trick puts the ball through a fence or into a goal frame', (_, s) => {
    for (const press of [RB, FLICK_PRESS]) {
      const w = stage({ ...s, max: 300 });
      stepWorld(w, press, NO_INTENT, STEP);
      for (let i = 0; i < 90; i++) {
        stepWorld(w, run(s.facing ?? 1), NO_INTENT, STEP);
        expect(ballLegal(w), `${press.moveZ ? 'flick' : 'stepover'} tick ${i}: (${w.ball.x.toFixed(1)}, ${w.ball.z.toFixed(1)})`).toBe(true);
      }
    }
  });

  it('a flick from 30 px out drops onto the net roof or the boards, and scores nothing', () => {
    const w = stage({ x: right.lineX - 30, max: 300 });
    stepWorld(w, FLICK_PRESS, NO_INTENT, STEP);
    let overNet = false;
    for (let i = 0; i < ticks(3); i++) {
      stepWorld(w, NO_INTENT, NO_INTENT, STEP);
      if (w.ball.x > right.lineX && w.ball.y > right.barY) overNet = true;
      expect(w.events.goal).toBeNull();
    }
    expect(overNet).toBe(true);
    expect(w.match.score).toEqual({ home: 0, away: 0 });
  });
});

describe('play stopping mid-trick (Review Focus 2)', () => {
  it.each(['fullTime', 'goal'] as const)('on %s the trick ends at once and he stands still', phase => {
    const w = stage();
    stepWorld(w, RB, NO_INTENT, STEP);
    stepWorld(w, NO_INTENT, NO_INTENT, STEP);
    w.match.phase = phase;
    stepWorld(w, NO_INTENT, NO_INTENT, STEP);
    expect(w.home.trick).toBeNull();
    for (let i = 0; i < 10; i++) stepWorld(w, NO_INTENT, NO_INTENT, STEP);
    expect(Math.abs(w.home.vx)).toBeLessThan(1);
  });
});
