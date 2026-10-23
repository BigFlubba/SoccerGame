import { describe, expect, it } from 'vitest';
import { BALL_R } from '../art/ball';
import { stepBall, type Ball, type BallEvents } from './ball';
import { BACKYARD, goalScored } from './field';

const STEP = 1 / 60;

function ball(p: Partial<Ball>): Ball {
  return { x: 320, y: 0, vx: 0, vy: 0, spin: 0, spinAngle: 0, ...p };
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

describe('stepBall', () => {
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
    expect([b.y, b.vy]).toEqual([0, 0]);
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

  it('bounces off the fence', () => {
    const b = ball({ x: 630, y: 50, vx: 300 }); // above the bar: lower down, x 630 is inside the net
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

  it('detects a goal only when the whole ball is past the line and under the bar', () => {
    expect(goalScored(BACKYARD, { x: 612 + 3, y: 10 })).toBe('right');
    expect(goalScored(BACKYARD, { x: 612 + 2, y: 10 })).toBeNull();
    expect(goalScored(BACKYARD, { x: 620, y: 27 })).toBeNull(); // ball top above the bar underside
    expect(goalScored(BACKYARD, { x: 28 - 3, y: 0 })).toBe('left');
    expect(goalScored(BACKYARD, { x: 320, y: 0 })).toBeNull();
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
    expect([b.y, b.vy]).toEqual([0, 0]);
  });

  it('a 700 px/s shot under the bar is caught by the net, not the fence', () => {
    const b = ball({ x: 560, y: 8, vx: 700 });
    const events = run(b, 0.5);
    expect(b.x).toBeLessThanOrEqual(628 - 3);
    expect(b.x).toBeGreaterThan(612);
    expect(events.some(e => e.hitNet)).toBe(true);
    expect(events.some(e => e.hitWall)).toBe(false);
  });

  it('a shot into the left net is caught too', () => {
    const b = ball({ x: 80, y: 8, vx: -700 });
    run(b, 0.5);
    expect(b.x).toBeGreaterThanOrEqual(12 + 3);
    expect(b.x).toBeLessThan(28);
  });

  it('a ball resting on top of the crossbar rolls off', () => {
    const b = ball({ x: 620, y: 30 + 3, vx: 0, vy: 0 });
    run(b, 3);
    expect(b.y).toBe(0);
  });

  it('a fast ball skimming the roof keeps its pace', () => {
    const b = ball({ x: 616, y: 33, vx: 400 });
    stepBall(b, STEP, BACKYARD);
    expect(b.vx).toBeGreaterThan(300);
  });

  it('a ball dropped onto the roof right by the fence rolls off into play', () => {
    const b = ball({ x: 632, y: 60 });
    run(b, 4);
    expect([b.y, b.vy]).toEqual([0, 0]);
    expect(b.x).toBeLessThan(612);
  });
});
