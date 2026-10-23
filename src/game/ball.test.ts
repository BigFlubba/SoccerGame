import { describe, expect, it } from 'vitest';
import { BALL_R } from '../art/ball';
import { seeded } from '../engine/random';
import { BALL_REST_Y, stepBall, type Ball, type BallEvents } from './ball';
import { POST_R } from './constants';
import { BACKYARD, goalScored, inGoalBox, type Goal } from './field';

const STEP = 1 / 60;
const MID_Z = BACKYARD.depth / 2;
const EPS = 1e-6;

function ball(p: Partial<Ball>): Ball {
  return { x: 320, y: BALL_REST_Y, z: MID_Z, vx: 0, vy: 0, vz: 0, spin: 0, spinAngle: 0, ...p };
}

/** Steps the ball at 60 Hz against the Backyard; returns every tick's events. */
function run(b: Ball, seconds: number, each?: (b: Ball) => void): BallEvents[] {
  const events: BallEvents[] = [];
  for (let t = 0; t < Math.round(seconds / STEP); t++) {
    events.push(stepBall(b, STEP, BACKYARD));
    each?.(b);
  }
  return events;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** The x span a goal's solid parts cover: from its line back to the end fence. */
function goalSpan(g: Goal): [number, number] {
  return g.side === 'right' ? [g.lineX, BACKYARD.fenceR] : [BACKYARD.fenceL, g.lineX];
}

/** Names the solid the ball's centre is too close to, if any; geometry restated from the plan, not the code. */
function violation(b: Ball): string | null {
  if (b.x < BACKYARD.fenceL + BALL_R - EPS || b.x > BACKYARD.fenceR - BALL_R + EPS) return 'end fence';
  if (b.z < BALL_R - EPS || b.z > BACKYARD.depth - BALL_R + EPS) return 'near board or back fence';
  if (b.y < BALL_R - EPS) return 'ground';
  for (const g of BACKYARD.goals) {
    const top = g.barY + g.barThick;
    const [x0, x1] = goalSpan(g);
    for (const zp of [g.z0, g.z1]) {
      const d = Math.hypot(b.x - g.lineX, b.y - clamp(b.y, 0, top), b.z - zp);
      if (d < BALL_R + POST_R - EPS) return `${g.side} post at z ${zp}`;
      if (b.y < g.barY && b.x >= x0 && b.x <= x1 && Math.abs(b.z - zp) < BALL_R - EPS) return `${g.side} side net at z ${zp}`;
    }
    const box = Math.hypot(b.x - clamp(b.x, x0, x1), b.y - clamp(b.y, g.barY, top), b.z - clamp(b.z, g.z0, g.z1));
    if (box < BALL_R - EPS) return `${g.side} bar or roof`;
    if (b.y < g.barY && b.z >= g.z0 && b.z <= g.z1 && Math.abs(b.x - g.backX) < BALL_R - EPS) return `${g.side} net back`;
    const behindNet = g.side === 'right' ? b.x > g.backX : b.x < g.backX;
    if (behindNet && b.z > g.z0 && b.z < g.z1 && b.y < g.barY) return `${g.side} gap behind the net`;
  }
  return null;
}

describe('stepBall', () => {
  it('comes to rest sitting on the grass, its centre one radius up', () => {
    const b = ball({ y: 40 });
    run(b, 3);
    expect([b.y, b.vy]).toEqual([BALL_R, 0]);
  });

  it('falls and bounces lower each time', () => {
    const b = ball({ y: 60 });
    const peaks: number[] = [];
    let rising = false;
    run(b, 4, s => {
      if (rising && s.vy <= 0) peaks.push(s.y);
      rising = s.vy > 0;
    });
    expect(peaks.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < peaks.length; i++) expect(peaks[i]!).toBeLessThan(peaks[i - 1]!);
    expect([b.y, b.vy]).toEqual([BALL_REST_Y, 0]);
  });

  it('reports a bounce when it hits the ground', () => {
    expect(run(ball({ y: 30 }), 1).some(e => e.bounced)).toBe(true);
  });

  it('rolls to a stop on grass', () => {
    const b = ball({ vx: 200 });
    let reversed = false;
    run(b, 3, s => (reversed ||= s.vx < 0));
    expect(b.vx).toBe(0);
    expect(reversed).toBe(false);
  });

  it('rolls on a diagonal and stops without curving', () => {
    const b = ball({ x: 300, z: 10, vx: 150, vz: 80 });
    const directions: number[] = [];
    run(b, 3, s => {
      if (s.vx !== 0 || s.vz !== 0) directions.push(Math.atan2(s.vz, s.vx));
    });
    expect([b.vx, b.vz]).toEqual([0, 0]);
    const [dx, dz] = [b.x - 300, b.z - 10];
    expect(dx * 80 - dz * 150).toBeCloseTo(0, 6);
    for (const a of directions) expect(a).toBeCloseTo(Math.atan2(80, 150), 9);
  });

  it('bounces off the near board and the back fence', () => {
    const near = ball({ z: 10, vz: -200 });
    const back = ball({ z: 50, vz: 200 });
    const nearEvents = run(near, 0.2);
    const backEvents = run(back, 0.2);
    expect(near.vz).toBeGreaterThan(0);
    expect(near.z).toBeGreaterThanOrEqual(BALL_R);
    expect(back.vz).toBeLessThan(0);
    expect(back.z).toBeLessThanOrEqual(BACKYARD.depth - BALL_R);
    expect(nearEvents.some(e => e.hitWall) && backEvents.some(e => e.hitWall)).toBe(true);
  });

  it('topspin skips forward on a bounce and backspin checks up', () => {
    const top = ball({ y: 20, vx: 100, spin: 0.6 });
    const back = ball({ y: 20, vx: 100, spin: -0.8 });
    const flat = ball({ y: 20, vx: 100 });
    const vxAfterBounce = (b: Ball) => {
      for (;;) if (stepBall(b, STEP, BACKYARD).bounced) return b.vx;
    };
    const f = vxAfterBounce(flat);
    expect(vxAfterBounce(top)).toBeGreaterThan(f);
    expect(vxAfterBounce(back)).toBeLessThan(f);
  });

  it('topspin makes a shot dip', () => {
    const top = ball({ y: 40, vx: 300, vy: 100, spin: 0.6 });
    const flat = ball({ y: 40, vx: 300, vy: 100 });
    run(top, 0.2);
    run(flat, 0.2);
    expect(top.y).toBeLessThan(flat.y);
  });

  it('spin decays toward 0', () => {
    const b = ball({ spin: 0.6 });
    run(b, 0.5);
    expect(b.spin).toBeGreaterThan(0);
    expect(b.spin).toBeLessThan(0.6);
  });

  it('turns the rolling animation angle with the roll', () => {
    const b = ball({ vx: 60 });
    stepBall(b, STEP, BACKYARD);
    expect(b.spinAngle).toBeCloseTo((60 * STEP) / BALL_R, 1);
  });

  it('turns the rolling animation for a ball rolling in depth too', () => {
    const b = ball({ vz: 60 });
    stepBall(b, STEP, BACKYARD);
    expect(Math.abs(b.spinAngle)).toBeGreaterThan(0);
  });

  it('bounces off the fence', () => {
    const b = ball({ x: 630, y: 50, vx: 300 }); // above the bar
    const events = run(b, 0.2);
    expect(b.vx).toBeLessThan(0);
    expect(b.x).toBeLessThan(636);
    expect(events.some(e => e.hitWall)).toBe(true);
  });

  it('bounces off the left fence too', () => {
    const b = ball({ x: 40, y: 50, vx: -300 });
    run(b, 0.2);
    expect(b.vx).toBeGreaterThan(0);
    expect(b.x - BALL_R).toBeGreaterThanOrEqual(4);
  });

  it('never tunnels through the crossbar at full power', () => {
    const b = ball({ x: 560, y: 29, vx: 700, vy: 0 });
    const events = run(b, 0.3, s => expect(s.y > 28 - 3 && s.y < 30 + 3 && s.x > 612 - 3 + 1).toBe(false));
    expect(b.y < 28 - 3 || b.y > 30 + 3 || b.x < 612).toBe(true); // never inside the bar
    expect(events.some(e => e.hitBar)).toBe(true);
  });

  it('a shot over the bar comes back off the fence and never ends up behind the net', () => {
    const b = ball({ x: 560, y: 45, vx: 700, vy: 50 });
    run(b, 4);
    expect(b.x).toBeLessThan(612);
    expect([b.y, b.vy]).toEqual([BALL_REST_Y, 0]);
  });

  it('a shot under the bar between the posts is caught by the net', () => {
    const b = ball({ x: 560, y: 8, vx: 700 });
    const events = run(b, 0.5);
    expect(b.x).toBeLessThanOrEqual(628 - 3);
    expect(b.x).toBeGreaterThan(612);
    expect(events.some(e => e.hitNet)).toBe(true);
    expect(events.some(e => e.hitWall)).toBe(false);
    expect(goalScored(BACKYARD, b)).toBe('right');
  });

  it('a shot into the left net is caught too', () => {
    const b = ball({ x: 80, y: 8, vx: -700 });
    run(b, 0.5);
    expect(b.x).toBeGreaterThanOrEqual(12 + 3);
    expect(b.x).toBeLessThan(28);
  });

  it('a 736 px/s shot at the near post rebounds, never passes through', () => {
    for (const fromZ of [18, 30, 8]) {
      const b = ball({ x: 500, y: 10, z: fromZ, vx: 736, vz: ((18 - fromZ) / 112) * 736 });
      const events = run(b, 0.4, s => {
        expect(Math.hypot(s.x - 612, s.z - 18)).toBeGreaterThanOrEqual(BALL_R + POST_R - EPS);
      });
      expect(events.some(e => e.hitPost), `from z ${fromZ}`).toBe(true);
    }
    const dead = ball({ x: 500, y: 10, z: 18, vx: 736 });
    run(dead, 0.3);
    expect(dead.x).toBeLessThan(612);
  });

  it('the side netting stops a ball entering the goal from the side', () => {
    for (const y of [BALL_R, 10, 20]) {
      const b = ball({ x: 620, y, z: 8, vz: 300 });
      run(b, 1, s => {
        if (s.x > 612 + BALL_R) expect(s.z).toBeLessThanOrEqual(18 - BALL_R + EPS);
        expect(goalScored(BACKYARD, s)).toBeNull();
      });
    }
    const far = ball({ x: 620, y: 10, z: 60, vz: -300 });
    run(far, 1, s => expect(goalScored(BACKYARD, s)).toBeNull());
  });

  it('a ball in the net cannot leave through the side netting', () => {
    for (const vz of [-400, 400]) {
      const b = ball({ x: 620, y: BALL_R, z: 32, vz });
      run(b, 1, s => {
        expect(s.z).toBeGreaterThanOrEqual(18 + BALL_R - EPS);
        expect(s.z).toBeLessThanOrEqual(46 - BALL_R + EPS);
      });
      expect(goalScored(BACKYARD, b)).toBe('right');
    }
  });

  it('a ball resting on the net roof rolls off', () => {
    const b = ball({ x: 620, y: 30 + 3, z: 32 });
    run(b, 3);
    expect(b.y).toBe(BALL_REST_Y);
    expect(inGoalBox(BACKYARD.goals[1], b.x, b.z, BALL_R)).toBe(false);
  });

  it('a fast ball skimming the roof keeps its pace', () => {
    const b = ball({ x: 616, y: 33, vx: 400 });
    stepBall(b, STEP, BACKYARD);
    expect(b.vx).toBeGreaterThan(300);
  });

  it('a ball dropped onto the roof right by the fence rolls off into play', () => {
    const b = ball({ x: 632, y: 60 });
    run(b, 4);
    expect([b.y, b.vy]).toEqual([BALL_REST_Y, 0]);
    expect(b.x).toBeLessThan(612);
  });

  it('nothing rolls into the gap behind the net', () => {
    for (const [z, vz] of [
      [5, 200],
      [60, -200],
    ] as const) {
      const b = ball({ x: 632, z, vz });
      run(b, 2, s => expect(violation(s)).toBeNull());
    }
  });

  it.each([
    [8, 3],
    [632, 3],
    [8, 61],
    [632, 61],
    [20, 6],
  ])('a ball left at (%i, z %i) comes to rest somewhere a player can stand', (x, z) => {
    const b = ball({ x, z });
    run(b, 5);
    for (const g of BACKYARD.goals) expect(inGoalBox(g, b.x, b.z, BALL_R)).toBe(false);
    expect(violation(b)).toBeNull();
  });

  it('never tunnels: 2000 random 736 px/s shots never end a tick inside a post, a net plane, the bar box or past a wall', () => {
    const rng = seeded(42);
    for (let i = 0; i < 2000; i++) {
      const right = rng() < 0.5;
      const b = ball({
        x: right ? 450 + rng() * 150 : 40 + rng() * 150,
        y: BALL_R + rng() * 30,
        z: BALL_R + rng() * (BACKYARD.depth - 2 * BALL_R),
      });
      if (violation(b)) continue;
      const yaw = (rng() * 2 - 1) * 0.9 + (right ? 0 : Math.PI);
      const pitch = (rng() * 2 - 1) * 0.5;
      b.vx = 736 * Math.cos(pitch) * Math.cos(yaw);
      b.vz = 736 * Math.cos(pitch) * Math.sin(yaw);
      b.vy = 736 * Math.sin(pitch);
      b.spin = rng() - 0.5;
      run(b, 1.5, s => {
        const v = violation(s);
        if (v) expect.fail(`shot ${i}: ${v} at (${s.x.toFixed(2)}, ${s.y.toFixed(2)}, ${s.z.toFixed(2)})`);
      });
    }
  });
});
