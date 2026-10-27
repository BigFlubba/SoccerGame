import { describe, expect, it } from 'vitest';
import { DIFFICULTY } from './ai';
import { BALL_REST_Y } from './ball';
import { CREW_PROFILES, CREW_STATS } from './crew';
import { BLOCKER, CHARGE_MIN_S, SHOOTER_CHARGE, chargeHold, defendSpot, pressSprint } from './styles';
import { BASE_STATS } from './stats';
import { createWorld, type World } from './world';

/** Harrison on the ball at (x, 20), running right at the away goal; Brick (away) defends it. */
function attacking(x: number): World {
  const w = createWorld(BASE_STATS, CREW_STATS.brick, 1, { home: 0, away: 0 }, null, null, CREW_PROFILES.brick.normal);
  w.match.phase = 'playing';
  Object.assign(w.home, { x: x - 8, z: 20, vx: 120, facing: 1 });
  Object.assign(w.ball, { x, y: BALL_REST_Y, z: 20, vx: 120, vy: 0, vz: 0 });
  Object.assign(w.away, { x: x + 120, z: 32, facing: -1 });
  return w;
}
const ownGoal = (w: World) => w.field.goals.find(g => g.side === 'right')!;
const centreZ = (w: World) => (ownGoal(w).z0 + ownGoal(w).z1) / 2;

describe('defendSpot', () => {
  it("allRound is Max's spot: just goal-side of the ball and a third of the way across to his goal's centre", () => {
    const w = attacking(400);
    expect(defendSpot('allRound', w, w.away, ownGoal(w))).toEqual({ x: 420, z: 20 + (centreZ(w) - 20) / 3 });
  });

  it('the blocker sits at least 30 px deeper than Max, and off his goal line', () => {
    const w = attacking(400);
    const [max, brick] = [defendSpot('allRound', w, w.away, ownGoal(w)), defendSpot('blocker', w, w.away, ownGoal(w))];
    expect(brick.x - max.x).toBeGreaterThanOrEqual(30);
    expect(ownGoal(w).lineX - brick.x).toBeGreaterThanOrEqual(BLOCKER.offLine);
    expect(brick.x - w.ball.x).toBeGreaterThanOrEqual(BLOCKER.minAhead);
  });

  it("the blocker stands in the shot's lane: on the line from the ball to his goal's centre", () => {
    for (const z of [6, 20, 50]) {
      const w = attacking(400);
      w.ball.z = z;
      const spot = defendSpot('blocker', w, w.away, ownGoal(w));
      const t = (spot.x - w.ball.x) / (ownGoal(w).lineX - w.ball.x);
      expect(Math.abs(spot.z - (z + (centreZ(w) - z) * t)), `z ${z}`).toBeLessThanOrEqual(1);
    }
  });

  it('with the ball close to his goal he still keeps off the line, room for a chip behind him', () => {
    const w = attacking(0);
    w.ball.x = ownGoal(w).lineX - 40;
    expect(ownGoal(w).lineX - defendSpot('blocker', w, w.away, ownGoal(w)).x).toBeCloseTo(BLOCKER.offLine, 6);
  });

  it("Max's defend spot is unchanged by the crew's styles", () => {
    expect(DIFFICULTY.normal.style).toBe('allRound');
  });
});

describe('chargeHold', () => {
  it("allRound winds up as Max always has; the shooter winds up fully", () => {
    expect(chargeHold('allRound', () => 0)).toBe(CHARGE_MIN_S);
    expect(chargeHold('shooter', () => 0)).toBe(0.55);
    expect(chargeHold('shooter', () => 1)).toBeCloseTo(SHOOTER_CHARGE.from + SHOOTER_CHARGE.spread, 9);
  });

  it('each draws exactly one random number', () => {
    for (const style of ['allRound', 'shooter'] as const) {
      let draws = 0;
      chargeHold(style, () => (draws++, 0.5));
      expect(draws, style).toBe(1);
    }
  });
});

describe('the presser', () => {
  it("goes straight at the ball: his spot is the ball itself", () => {
    const w = attacking(ownGoal(attacking(0)).lineX - 200);
    const spot = defendSpot('presser', w, w.away, ownGoal(w));
    expect(Math.hypot(spot.x - w.ball.x, spot.z - w.ball.z)).toBeLessThanOrEqual(8);
  });

  it('sprints at any distance while he has the legs; allRound only from far off', () => {
    expect(pressSprint('presser', 30, 0.9)).toBe(true);
    expect(pressSprint('presser', 30, 0.2)).toBe(false);
    expect(pressSprint('allRound', 30, 0.9)).toBe(false);
    expect(pressSprint('allRound', 130, 0.9)).toBe(true);
  });
});
