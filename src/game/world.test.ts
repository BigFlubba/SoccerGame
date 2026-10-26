import { seeded } from '../engine/random';
import { describe, expect, it } from 'vitest';
import { inGoalBox } from './field';
import { NO_INTENT, PLAYER_R, type PlayerIntent } from './player';
import { BASE_STATS } from './stats';
import { BALL_REST_Y } from './ball';
import { POWER_UP_S } from './player';
import { createWorld, placeForKickoff, stepWorld, type World } from './world';

const STEP = 1 / 60;
const ERR = { home: 4, away: 6 };
const move = (moveX: number): PlayerIntent => ({ ...NO_INTENT, moveX });

describe('world', () => {
  it('places players for kickoff: home kicks off from beside the ball', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    expect([w.ball.x, w.ball.y]).toEqual([320, BALL_REST_Y]);
    expect([w.home.x, w.home.facing]).toEqual([308, 1]);
    expect([w.away.x, w.away.facing]).toEqual([390, -1]);
  });

  it('when away kicks off, away stands by the ball and home drops back', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    w.match.kickoffTeam = 'away';
    placeForKickoff(w);
    expect([w.away.x, w.away.facing]).toEqual([332, -1]);
    expect([w.home.x, w.home.facing]).toEqual([250, 1]);
  });

  it('stepWorld ignores intents outside play and places players for kickoff', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    stepWorld(w, move(1), move(-1), STEP);
    expect(w.match.phase).toBe('kickoff');
    expect(w.home.x).toBe(308);
    expect([w.ball.x, w.ball.y]).toEqual([320, BALL_REST_Y]);
  });

  it('follows intents once play starts', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    w.match.phase = 'playing';
    stepWorld(w, move(-1), NO_INTENT, STEP);
    expect(w.home.x).toBeLessThan(308);
  });

  it('a ball into the right goal is a home goal, then everyone resets for kickoff', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    w.match.phase = 'playing';
    Object.assign(w.ball, { x: 600, y: 5, vx: 300, vy: 0 });
    let goal = null;
    for (let i = 0; i < 30 && !goal; i++) {
      stepWorld(w, NO_INTENT, NO_INTENT, STEP);
      goal = w.events.goal;
    }
    expect(goal).toBe('home');
    expect(w.match.score).toEqual({ home: 1, away: 0 });
    for (let i = 0; i < 2.1 * 60; i++) stepWorld(w, NO_INTENT, NO_INTENT, STEP);
    expect(w.match.phase).toBe('kickoff');
    expect([w.ball.x, w.ball.y, w.ball.vx]).toEqual([320, BALL_REST_Y, 0]);
    expect(w.away.x).toBe(332);
  });

  it('reports kicks in the world events', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    w.match.phase = 'playing';
    stepWorld(w, { ...NO_INTENT, shootHeld: true }, NO_INTENT, STEP);
    stepWorld(w, NO_INTENT, NO_INTENT, STEP);
    expect(w.events.kicks.some(k => k.kicked === 'shot')).toBe(true);
    expect(w.ball.vx).toBeGreaterThan(100);
  });

  it('a ball contested from both sides squirts out to either side of them, not always to whoever resolves last', () => {
    const sides = new Set<number>();
    for (let seed = 1; seed <= 8; seed++) {
      const w = createWorld(BASE_STATS, BASE_STATS, seed, ERR);
      w.match.phase = 'playing';
      Object.assign(w.home, { x: 300, vx: 95 });
      Object.assign(w.away, { x: 316, vx: -95, facing: -1 });
      Object.assign(w.ball, { x: 308, y: BALL_REST_Y });
      for (let i = 0; i < 30; i++) stepWorld(w, move(1), move(-1), STEP);
      // Head-on along x, the sides are in depth.
      sides.add(Math.sign(w.ball.z - (w.home.z + w.away.z) / 2));
    }
    expect(sides).toEqual(new Set([-1, 1]));
  });

  it('players are solid: running head-on, neither passes through the other', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    w.match.phase = 'playing';
    Object.assign(w.ball, { x: 100 });
    Object.assign(w.home, { x: 300 });
    Object.assign(w.away, { x: 330 });
    for (let i = 0; i < 60; i++) stepWorld(w, move(1), move(-1), STEP);
    expect(w.away.x - w.home.x).toBeGreaterThanOrEqual(2 * PLAYER_R - 0.01);
  });

  it('players a little apart in depth go round each other', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    w.match.phase = 'playing';
    Object.assign(w.ball, { x: 100 });
    Object.assign(w.home, { x: 300, z: 30 });
    Object.assign(w.away, { x: 330, z: 34 });
    for (let i = 0; i < 60; i++) stepWorld(w, move(1), move(-1), STEP);
    expect(w.home.x).toBeGreaterThan(w.away.x + 40);
  });

  it('kickoff puts everyone on the centre line in depth', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    Object.assign(w.home, { z: 10 });
    Object.assign(w.away, { z: 50 });
    Object.assign(w.ball, { z: 5, vz: 40 });
    placeForKickoff(w);
    expect([w.ball.z, w.ball.vz, w.home.z, w.away.z, w.home.vz]).toEqual([32, 0, 32, 32, 0]);
  });

  it('a shot held through the kickoff needs a fresh press', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    const held = { ...NO_INTENT, shootHeld: true, chipHeld: true };
    while (w.match.phase === 'kickoff') stepWorld(w, held, held, STEP);
    stepWorld(w, held, held, STEP);
    expect([w.home.state, w.home.charge]).toEqual(['ground', 0]);
    expect(w.away.state).toBe('ground');
    stepWorld(w, NO_INTENT, NO_INTENT, STEP);
    stepWorld(w, held, NO_INTENT, STEP);
    expect(w.home.state).toBe('charging');
  });

  it.each([604, 606, 608, 610, 612, 618, 624])('a ball resting on the net roof comes down past a player standing at x %i', x => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    w.match.phase = 'playing';
    Object.assign(w.home, { x });
    Object.assign(w.away, { x: 100 });
    Object.assign(w.ball, { x: 620, y: 33 });
    for (let i = 0; i < 5 * 60; i++) stepWorld(w, NO_INTENT, NO_INTENT, STEP);
    expect(w.ball.y).toBeLessThan(28);
  });

  it('two players under a roof ball do not pin it there', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    w.match.phase = 'playing';
    Object.assign(w.home, { x: 616 });
    Object.assign(w.away, { x: 622 });
    Object.assign(w.ball, { x: 619, y: 33 });
    for (let i = 0; i < 5 * 60; i++) stepWorld(w, NO_INTENT, NO_INTENT, STEP);
    expect(w.ball.y).toBe(BALL_REST_Y);
  });

  it('nobody can run into a goal', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    w.match.phase = 'playing';
    Object.assign(w.away, { z: 40 });
    for (let i = 0; i < 10 * 60; i++) stepWorld(w, move(1), move(-1), STEP);
    for (const p of [w.home, w.away]) for (const g of w.field.goals) expect(inGoalBox(g, p.x, p.z, PLAYER_R - 0.01)).toBe(false);
  });

  it('knows when the ball is at a player’s feet so B chips', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    w.match.phase = 'playing';
    stepWorld(w, { ...NO_INTENT, chipHeld: true }, NO_INTENT, STEP);
    expect(w.home.state).toBe('chipping');
  });

  it('clearing a ball out of the corner beside your own goal is never an own goal', () => {
    for (const sprint of [false, true]) {
      const w = createWorld(BASE_STATS, BASE_STATS, 3, ERR);
      w.match.phase = 'playing';
      Object.assign(w.ball, { x: 9, y: BALL_REST_Y, z: 9, vx: 0, vy: 0, vz: 0 });
      Object.assign(w.home, { x: 19, z: 5 });
      Object.assign(w.away, { x: 320, z: 32 });
      for (let i = 0; i < 3 * 60; i++) {
        const [dx, dz] = [w.ball.x - w.home.x, w.ball.z - w.home.z];
        const d = Math.hypot(dx, dz) || 1;
        stepWorld(w, { ...NO_INTENT, moveX: dx / d, moveZ: dz / d, sprint }, NO_INTENT, STEP);
      }
      expect(w.match.score, `sprint ${sprint}`).toEqual({ home: 0, away: 0 });
    }
  });

  it('a body push beside the far side netting is never a goal', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 3, ERR);
    w.match.phase = 'playing';
    Object.assign(w.ball, { x: 629.73, y: 7.68, z: 49, vx: -59, vy: 129, vz: -3 });
    Object.assign(w.home, { x: 626.2, z: 51, vz: -19 });
    Object.assign(w.away, { x: 320, z: 32 });
    for (let i = 0; i < 60; i++) stepWorld(w, NO_INTENT, NO_INTENT, STEP);
    expect(w.match.score).toEqual({ home: 0, away: 0 });
  });

  it('every goal goes in through the mouth: bodies pushing balls about beside both goals', () => {
    const rng = seeded(77);
    for (let trial = 0; trial < 400; trial++) {
      const w = createWorld(BASE_STATS, BASE_STATS, trial, ERR);
      w.match.phase = 'playing';
      const g = w.field.goals[trial % 2]!;
      const toField = g.side === 'right' ? -1 : 1;
      const far = rng() < 0.5;
      const bx = g.lineX - toField * (2 + rng() * 20);
      const bz = far ? g.z1 + 2 + rng() * 14 : g.z0 - 2 - rng() * 14;
      Object.assign(w.ball, { x: bx, y: BALL_REST_Y + rng() * 12, z: bz, vx: (rng() - 0.5) * 200, vy: rng() * 150, vz: (rng() - 0.5) * 200 });
      Object.assign(w.home, { x: bx + toField * (6 + rng() * 20), z: far ? 60 - rng() * 6 : 4 + rng() * 6 });
      Object.assign(w.away, { x: 320, z: 32 });
      let mouth = false;
      for (let i = 0; i < 90 && w.match.phase === 'playing'; i++) {
        const before = { x: w.ball.x, z: w.ball.z };
        const [dx, dz] = [w.ball.x - w.home.x, w.ball.z - w.home.z];
        const d = Math.hypot(dx, dz) || 1;
        stepWorld(w, { ...NO_INTENT, moveX: dx / d, moveZ: dz / d, sprint: trial % 3 === 0 }, NO_INTENT, STEP);
        const b = w.ball;
        if ((before.x - g.lineX) * toField > 0 && (b.x - g.lineX) * toField <= 0) {
          const z = before.z + ((g.lineX - before.x) / (b.x - before.x)) * (b.z - before.z);
          if (z >= g.z0 && z <= g.z1) mouth = true;
        }
      }
      if (w.match.score.home + w.match.score.away > 0) expect(mouth, `trial ${trial}: a goal that never crossed the goal mouth`).toBe(true);
    }
  });
});

describe('world: the power-up', () => {
  const hold: PlayerIntent = { ...NO_INTENT, powerHeld: true };
  const ticks = (s: number) => Math.round(s / STEP);

  /** Play on, a full meter, Harrison on his feet with the ball at his feet, facing Max's goal; Max far away. */
  function ready(): World {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR, { golden: false });
    w.match.phase = 'playing';
    w.power!.meter = 1;
    Object.assign(w.home, { x: 300, z: 32, facing: 1 });
    Object.assign(w.away, { x: 100, z: 10 });
    Object.assign(w.ball, { x: 308, y: BALL_REST_Y, z: 32, vx: 0, vy: 0, vz: 0 });
    return w;
  }

  it('without a kit, power is null and holding Y changes nothing', () => {
    const plain = createWorld(BASE_STATS, BASE_STATS, 7, ERR);
    const holding = createWorld(BASE_STATS, BASE_STATS, 7, ERR);
    expect(plain.power).toBeNull();
    const rng = seeded(3);
    for (let i = 0; i < 600; i++) {
      const i1: PlayerIntent = { ...NO_INTENT, moveX: rng() * 2 - 1, moveZ: rng() * 2 - 1, shootHeld: rng() < 0.3 };
      const i2: PlayerIntent = { ...NO_INTENT, moveX: rng() * 2 - 1 };
      stepWorld(plain, i1, i2, STEP);
      stepWorld(holding, { ...i1, powerHeld: true }, i2, STEP);
      expect(holding.events.power).toEqual({ started: false, cancelled: false, fired: false, braced: false, blown: false });
    }
    expect([holding.home.x, holding.home.z, holding.ball.x, holding.ball.z]).toEqual([plain.home.x, plain.home.z, plain.ball.x, plain.ball.z]);
    expect(holding.match.score).toEqual(plain.match.score);
  });

  it('a power press reports started and plants him with the ball', () => {
    const w = ready();
    Object.assign(w.home, { vx: 90 });
    Object.assign(w.ball, { vx: 60 });
    stepWorld(w, hold, NO_INTENT, STEP);
    expect(w.events.power.started).toBe(true);
    expect(w.home.state).toBe('poweringUp');
    expect([w.home.vx, w.ball.vx]).toEqual([0, 0]);
    stepWorld(w, hold, NO_INTENT, STEP);
    expect(w.events.power.started).toBe(false);
  });

  it('letting go early reports cancelled and keeps the meter', () => {
    const w = ready();
    for (let i = 0; i < ticks(0.5); i++) stepWorld(w, hold, NO_INTENT, STEP);
    stepWorld(w, NO_INTENT, NO_INTENT, STEP);
    expect(w.events.power.cancelled).toBe(true);
    expect(w.home.state).toBe('ground');
    expect(w.power?.meter).toBe(1);
  });

  it('a full charge at full time cancels and keeps the meter', () => {
    const w = ready();
    for (let i = 0; i < ticks(POWER_UP_S + 0.5); i++) stepWorld(w, hold, NO_INTENT, STEP);
    expect([w.home.state, w.home.charge]).toEqual(['poweringUp', 1]);
    w.match.phase = 'fullTime';
    stepWorld(w, hold, NO_INTENT, STEP);
    expect(w.events.power).toMatchObject({ cancelled: true, fired: false });
    expect(w.home.state).toBe('ground');
    expect(w.wave).toBeNull();
    expect(w.power?.meter).toBe(1);
  });

  it('the ball leaving his feet cancels the power-up and keeps the meter', () => {
    const w = ready();
    for (let i = 0; i < ticks(0.5); i++) stepWorld(w, hold, NO_INTENT, STEP);
    w.ball.vx = 200;
    let cancelled = 0;
    for (let i = 0; i < 10; i++) {
      stepWorld(w, hold, NO_INTENT, STEP);
      if (w.events.power.cancelled) cancelled++;
    }
    expect(cancelled).toBe(1);
    expect(w.home.state).toBe('ground');
    expect(w.power?.meter).toBe(1);
  });

  it('firing spends the meter and reports fired once', () => {
    const w = ready();
    for (let i = 0; i < ticks(POWER_UP_S + 0.1); i++) stepWorld(w, hold, NO_INTENT, STEP);
    stepWorld(w, NO_INTENT, NO_INTENT, STEP);
    expect(w.events.power).toMatchObject({ fired: true, cancelled: false });
    expect(w.power?.meter).toBe(0);
    expect(w.wave?.live).toBe(true);
    let fires = 0;
    for (let i = 0; i < 30; i++) {
      stepWorld(w, NO_INTENT, NO_INTENT, STEP);
      if (w.events.power.fired) fires++;
    }
    expect(fires).toBe(0);
    expect(w.events.goal === 'home' || w.match.score.home === 1).toBe(true);
  });

  it('a wave goal is a style goal: it credits the meter and clears the kick', () => {
    const w = ready();
    for (let i = 0; i < ticks(POWER_UP_S + 0.1); i++) stepWorld(w, hold, NO_INTENT, STEP);
    stepWorld(w, NO_INTENT, NO_INTENT, STEP);
    for (let i = 0; i < 30 && w.match.score.home === 0; i++) stepWorld(w, NO_INTENT, NO_INTENT, STEP);
    expect(w.match.score.home).toBe(1);
    expect(w.power?.meter).toBeGreaterThan(0);
    expect(w.power?.lastKind).toBeNull();
  });

  it('his dribble touches fill the meter', () => {
    const w = ready();
    w.power!.meter = 0;
    for (let i = 0; i < ticks(3); i++) stepWorld(w, move(1), NO_INTENT, STEP);
    expect(w.power?.meter).toBeGreaterThan(0);
  });
});
