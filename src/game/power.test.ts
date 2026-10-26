import { describe, expect, it } from 'vitest';
import { BALL_REST_Y } from './ball';
import { BACKYARD } from './field';
import { POST_INSET } from './kick';
import { METER_MIN_REFILL_S, TOUCH_CEILING, addMeter, canStartPower, createPower, onTarget, powerHint, tickPower, waveTarget, type PowerState } from './power';
import { BASE_STATS } from './stats';
import { createWorld, type World } from './world';

const STEP = 1 / 60;
const MAX_GOAL = BACKYARD.goals[1];
const plain = () => createPower({ golden: false });

describe('the super meter', () => {
  it('starts empty, and touches fill a little, but never past half', () => {
    const s = plain();
    expect(s.meter).toBe(0);
    for (let i = 0; i < 10; i++) addMeter(s, 'touch');
    expect(s.meter).toBeCloseTo(0.1);
    for (let i = 0; i < 100; i++) addMeter(s, 'touch');
    expect(s.meter).toBe(TOUCH_CEILING);
  });

  it('tackles, shots on target and style goals fill more', () => {
    const gain = (e: 'tackle' | 'onTarget' | 'styleGoal') => {
      const s = plain();
      addMeter(s, e);
      return s.meter;
    };
    expect([gain('tackle'), gain('onTarget'), gain('styleGoal')]).toEqual([0.15, 0.2, 0.4]);
  });

  it('Golden Form gains are 10% bigger', () => {
    const s = createPower({ golden: true });
    addMeter(s, 'tackle');
    expect(s.meter).toBeCloseTo(0.165);
  });

  it('stops at full', () => {
    const s = plain();
    for (let i = 0; i < 5; i++) addMeter(s, 'styleGoal');
    expect(s.meter).toBe(1);
    expect(s.sinceFullS).toBe(0);
  });

  it('after filling, it cannot fill again within 20 s', () => {
    const s = plain();
    for (let i = 0; i < 3; i++) addMeter(s, 'styleGoal');
    expect(s.meter).toBe(1);
    s.meter = 0;
    const ticks = Math.round(19 / STEP);
    for (let t = 0; t < ticks; t++) {
      tickPower(s, STEP);
      if (t % 60 === 0) addMeter(s, 'styleGoal');
    }
    expect(s.meter).toBeLessThan(1);
    expect(s.meter).toBeGreaterThan(0.9);
    for (let t = 0; t < Math.round((METER_MIN_REFILL_S - 19) / STEP) + 1; t++) tickPower(s, STEP);
    addMeter(s, 'tackle');
    expect(s.meter).toBe(1);
  });
});

describe('onTarget', () => {
  const ball = (v: { vx: number; vy?: number; vz?: number }) => ({ x: 500, y: BALL_REST_Y, z: 32, vy: 0, vz: 0, ...v });

  it('a low shot at the mouth is on target; wide, over the bar and away from goal are not', () => {
    expect(onTarget(ball({ vx: 300 }), MAX_GOAL)).toBe(true);
    expect(onTarget(ball({ vx: 300, vz: 100 }), MAX_GOAL)).toBe(false);
    expect(onTarget(ball({ vx: 300, vy: 300 }), MAX_GOAL)).toBe(false);
    expect(onTarget(ball({ vx: -300 }), MAX_GOAL)).toBe(false);
    expect(onTarget(ball({ vx: 0 }), MAX_GOAL)).toBe(false);
  });

  it('a shot heading for a post counts, as hitting the frame', () => {
    expect(onTarget(ball({ vx: 300, vz: (MAX_GOAL.z1 - 32) / (112 / 300) }), MAX_GOAL)).toBe(true);
  });
});

describe('waveTarget', () => {
  it('waveTarget aims at the inset posts and the middle', () => {
    expect(waveTarget(MAX_GOAL, 'far')).toBe(MAX_GOAL.z1 - POST_INSET);
    expect(waveTarget(MAX_GOAL, 'near')).toBe(MAX_GOAL.z0 + POST_INSET);
    expect(waveTarget(MAX_GOAL, 'straight')).toBe((MAX_GOAL.z0 + MAX_GOAL.z1) / 2);
  });
});

/** A world where every start condition holds: a full meter, play on, Harrison on his feet facing Max's goal with the ball. */
function ready(x = 400): { w: World; power: PowerState } {
  const w = createWorld(BASE_STATS, BASE_STATS, 1, { home: 0, away: 0 });
  const power = { ...plain(), meter: 1 };
  w.power = power;
  w.match.phase = 'playing';
  Object.assign(w.home, { x, z: 32, facing: 1, state: 'ground' });
  Object.assign(w.away, { x: 150, z: 10 });
  Object.assign(w.ball, { x: x + 8, y: BALL_REST_Y, z: 32, vx: 0, vy: 0, vz: 0 });
  return { w, power };
}

/** Turns him to face his own goal, with the ball still at his feet. */
const faceOwnGoal = (w: World) => {
  w.home.facing = -1;
  w.ball.x = w.home.x - 8;
};

describe('starting a power-up', () => {
  it('can start when every condition holds', () => {
    expect(canStartPower(ready().w)).toBe(true);
  });

  it.each<[string, (w: World, power: PowerState) => void]>([
    ['without the move', w => (w.power = null)],
    ['with the meter short of full', (_, power) => (power.meter = 0.99)],
    ['outside play', w => (w.match.phase = 'goal')],
    ['in the air', w => (w.home.state = 'air')],
    ['charging a shot', w => (w.home.state = 'charging')],
    ['facing his own goal', faceOwnGoal],
    ['without the ball', w => (w.ball.x = w.home.x + 60)],
    ['beside the goal line', w => ((w.home.x = MAX_GOAL.lineX - 12), (w.ball.x = MAX_GOAL.lineX - 4))],
  ])('canStartPower needs every condition: not %s', (_, spoil) => {
    const { w, power } = ready();
    spoil(w, power);
    expect(canStartPower(w)).toBe(false);
  });
});

describe('powerHint', () => {
  it('powerHint is dim with the ball at his feet beside the goal line, lit in open play, none when not full', () => {
    expect(powerHint(ready().w)).toBe('lit');
    expect(powerHint(ready(MAX_GOAL.lineX - 12).w)).toBe('dim');
    const away = ready().w;
    faceOwnGoal(away);
    expect(powerHint(away)).toBe('dim');
    const loose = ready().w;
    loose.ball.x += 60;
    expect(powerHint(loose)).toBe('lit');
    const short = ready();
    short.power.meter = 0.5;
    expect(powerHint(short.w)).toBe('none');
    const without = ready().w;
    without.power = null;
    expect(powerHint(without)).toBe('none');
  });
});
