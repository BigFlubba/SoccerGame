import { describe, expect, it } from 'vitest';
import { BALL_R } from '../art/ball';
import { DIFFICULTY, type AiProfile } from './ai';
import { BALL_REST_Y } from './ball';
import { NO_INTENT, createPlayer, stepPlayer, type Player } from './player';
import { BACKYARD } from './field';
import { STEAL_COOLDOWN_S, STUMBLE_S, resolveSteal } from './steal';
import { BASE_STATS } from './stats';
import { createWorld, stepWorld, type World } from './world';
import { ballAtFeet, ballInBody } from './zones';

const STEP = 1 / 60;
const TAP = { ...NO_INTENT, steal: true };

/**
 * A world in play on the centre line: Max at `max` with the ball at `ball`,
 * Harrison at `home`. Both run at `vx` (facing that way, left when still),
 * unless `homeVx` says otherwise.
 */
function stage(o: { max: number; ball: number; home: number; vx: number; profile: AiProfile; seed: number; homeVx?: number }): World {
  const w = createWorld(BASE_STATS, BASE_STATS, o.seed, { home: 0, away: 0 }, null, null, o.profile);
  w.match.phase = 'playing';
  const homeVx = o.homeVx ?? o.vx;
  Object.assign(w.away, { x: o.max, vx: o.vx, facing: o.vx > 0 ? 1 : -1 });
  Object.assign(w.home, { x: o.home, vx: homeVx, facing: homeVx > 0 ? 1 : -1 });
  Object.assign(w.ball, { x: o.ball, y: BALL_REST_Y, vx: o.vx, vy: 0, vz: 0 });
  return w;
}

/** Harrison catching Max from behind, both running at his own goal: Max with the ball 8 px ahead, Harrison's body against Max's. */
const fromBehind = (profile: AiProfile, seed: number) => stage({ max: 300, ball: 292, home: 310, vx: -150, profile, seed });

describe('the steal button', () => {
  it('a steal tap with Max dribbling in reach takes the ball cleanly on Easy', () => {
    const w = fromBehind(DIFFICULTY.easy, 3);
    expect(resolveSteal(w, TAP)).toBe('stole');
    expect(ballAtFeet(w.home, w.ball)).toBe(true);
    expect(ballInBody(w.away, w.ball, BALL_R)).toBe(false);
    expect(Math.abs(w.ball.vx)).toBeLessThanOrEqual(Math.abs(w.home.vx) + 1);
  });

  it('on Easy it takes it cleanly about nine times in ten', () => {
    let clean = 0;
    for (let seed = 1; seed <= 400; seed++) if (resolveSteal(fromBehind(DIFFICULTY.easy, seed), TAP) === 'stole') clean++;
    expect(clean / 400).toBeGreaterThan(0.85);
    expect(clean / 400).toBeLessThan(0.95);
  });

  it("pokes it loose about as often as Hard's odds say", () => {
    let poked = 0;
    for (let seed = 1; seed <= 400; seed++) if (resolveSteal(fromBehind(DIFFICULTY.hard, seed), TAP) === 'poked') poked++;
    expect(poked / 400).toBeGreaterThan(0.33);
    expect(poked / 400).toBeLessThan(0.5);
  });

  it('a poke squirts the ball on along his run, faster than he runs', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const w = fromBehind(DIFFICULTY.hard, seed);
      if (resolveSteal(w, TAP) !== 'poked') continue;
      expect(w.ball.vx).toBeLessThan(w.home.vx);
      return;
    }
    throw new Error('no poke in 40 seeds');
  });

  it('a tap with nothing in reach is a whiff: a stumble and a wait', () => {
    const w = stage({ max: 300, ball: 240, home: 310, vx: -150, profile: DIFFICULTY.easy, seed: 1 });
    expect(resolveSteal(w, TAP)).toBe('whiff');
    expect(w.home.stumbleS).toBe(STUMBLE_S);
    expect(w.home.stealCooldownS).toBe(STEAL_COOLDOWN_S);
    w.home.stumbleS = 0;
    expect(resolveSteal(w, TAP)).toBeNull();
  });

  it('a tap on a loose ball in reach traps it, always', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const w = stage({ max: 400, ball: 312, home: 320, vx: 80, profile: DIFFICULTY.hard, seed, homeVx: 80 });
      Object.assign(w.home, { x: 304 });
      w.away.facing = -1;
      expect(resolveSteal(w, TAP), `seed ${seed}`).toBe('trapped');
      expect(ballAtFeet(w.home, w.ball)).toBe(true);
    }
  });

  it('a tap does nothing while charging, in the air, sliding, fallen, powered up or outside play', () => {
    const cases: ((w: World) => void)[] = [
      w => (w.home.state = 'charging'),
      w => Object.assign(w.home, { state: 'air', y: 10 }),
      w => (w.home.state = 'sliding'),
      w => (w.home.state = 'fallen'),
      w => (w.match.phase = 'kickoff'),
    ];
    for (const set of cases) {
      const w = fromBehind(DIFFICULTY.easy, 3);
      set(w);
      expect(resolveSteal(w, TAP)).toBeNull();
      expect([w.home.stumbleS, w.home.stealCooldownS]).toEqual([0, 0]);
    }
    const powered = createWorld(BASE_STATS, BASE_STATS, 3, { home: 0, away: 0 }, { golden: false }, null, DIFFICULTY.easy);
    Object.assign(powered, { match: fromBehind(DIFFICULTY.easy, 3).match });
    Object.assign(powered.away, { x: 300, vx: -150 });
    Object.assign(powered.home, { x: 310, vx: -150, facing: -1 });
    Object.assign(powered.ball, { x: 292, vx: -150 });
    powered.power!.activeS = 1;
    expect(resolveSteal(powered, TAP)).toBeNull();
    expect([powered.home.stumbleS, powered.home.stealCooldownS]).toEqual([0, 0]);
  });

  it('a clean steal of a ball squeezed between both bodies ends at his feet after the whole tick', () => {
    // Head on: Max dribbling at Harrison, the ball between their bodies.
    const w = stage({ max: 300, ball: 295, home: 290, vx: -150, profile: DIFFICULTY.easy, seed: 3, homeVx: 1 });
    w.home.vx = 0;
    expect(() => stepWorld(w, TAP, NO_INTENT, STEP)).not.toThrow();
    expect(w.events.steal).toBe('stole');
    expect(ballAtFeet(w.home, w.ball)).toBe(true);
  });

  it('while stumbling he can neither move nor act', () => {
    const p: Player = createPlayer('home', BASE_STATS, 300, 1);
    p.vx = 100;
    p.stumbleS = STUMBLE_S;
    stepPlayer(p, { ...NO_INTENT, moveX: 1, shootHeld: true, jump: true }, STEP, BACKYARD, true);
    expect(p.state).toBe('ground');
    expect(p.vx).toBeLessThan(100);
  });
});
