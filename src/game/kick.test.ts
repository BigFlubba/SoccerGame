import { describe, expect, it } from 'vitest';
import { BALL_R } from '../art/ball';
import { seeded } from '../engine/random';
import { stepBall, type Ball } from './ball';
import { BACKYARD } from './field';
import {
  CHIP_ELEVATION_DEG,
  HEADER_ELEVATION_DEG,
  MAX_AIM_SLOPE,
  PERFECT_BONUS,
  TAP_CHARGE,
  VOLLEY_ELEVATION_DEG,
  aimLine,
  chip,
  header,
  shot,
  volley,
  type AimLine,
  type KickResult,
} from './kick';
import { BASE_STATS, maxShotSpeed } from './stats';

const MAX_POWER = { ...BASE_STATS, power: 10 };
const line = (facing: 1 | -1, slope = 0): AimLine => ({ facing, slope });
const speed = (k: KickResult) => Math.hypot(k.vx, k.vy, k.vz);
const elevationDeg = (k: KickResult) => (Math.atan2(k.vy, Math.hypot(k.vx, k.vz)) * 180) / Math.PI;

/** Flies a kick from (x, R, z) until it passes the right goal line; returns the highest the ball got on the way. */
function peakBeforeLine(k: KickResult, x: number, z = 32): number {
  const b: Ball = { x, y: BALL_R, z, vx: k.vx, vy: k.vy, vz: k.vz, spin: k.spin, spinAngle: 0 };
  let peak = b.y;
  for (let i = 0; i < 120 && b.x < 612; i++) {
    stepBall(b, 1 / 60, BACKYARD);
    if (b.x < 612) peak = Math.max(peak, b.y);
  }
  return peak;
}

describe('seeded', () => {
  it('is deterministic per seed and stays in [0, 1)', () => {
    const a = seeded(7);
    const b = seeded(7);
    const xs = Array.from({ length: 100 }, () => a());
    expect(xs).toEqual(Array.from({ length: 100 }, () => b()));
    expect(xs.every(x => x >= 0 && x < 1)).toBe(true);
    expect(seeded(8)()).not.toBe(xs[0]);
  });
});

describe('aimLine', () => {
  it('far aims at the far post, near at the near post, both arriving at the line', () => {
    const far = aimLine({ x: 500, z: 32 }, 1, 'far', BACKYARD);
    expect(32 + far.slope * 112).toBeCloseTo(46 - 4);
    const near = aimLine({ x: 500, z: 32 }, 1, 'near', BACKYARD);
    expect(32 + near.slope * 112).toBeCloseTo(18 + 4);
  });

  it('aims at the goal it faces', () => {
    const far = aimLine({ x: 140, z: 20 }, -1, 'far', BACKYARD);
    expect(far.facing).toBe(-1);
    expect(20 + far.slope * (140 - 28)).toBeCloseTo(42);
  });

  it('straight keeps his line', () => {
    expect(aimLine({ x: 300, z: 10 }, 1, 'straight', BACKYARD)).toEqual({ facing: 1, slope: 0 });
  });

  it('clamps the slope right next to the goal', () => {
    expect(Math.abs(aimLine({ x: 608, z: 2 }, 1, 'far', BACKYARD).slope)).toBe(0.7);
    expect(aimLine({ x: 612, z: 60 }, 1, 'near', BACKYARD).slope).toBe(-MAX_AIM_SLOPE);
  });
});

describe('shot', () => {
  it('a full-power max-stat shot crosses the field in about a second', () => {
    const k = shot(MAX_POWER, 1, 0, line(1), 0, seeded(1));
    expect(640 / k.vx).toBeGreaterThan(0.85);
    expect(640 / k.vx).toBeLessThan(1.25);
  });

  it('follows its aim line in depth', () => {
    const k = shot(BASE_STATS, 0.5, 0, line(-1, 0.3), 0, seeded(1));
    expect(k.vx).toBeLessThan(0);
    expect(k.vz / Math.abs(k.vx)).toBeCloseTo(0.3);
  });

  it('the sweet spot is perfect: faster and exact', () => {
    const a = shot(BASE_STATS, 0.88, 0, line(1, 0.2), 6, seeded(2));
    const b = shot(BASE_STATS, 0.88, 0, line(1, 0.2), 6, seeded(99));
    expect(a.perfect).toBe(true);
    expect(a).toEqual(b);
    expect(speed(a)).toBeCloseTo((180 + (maxShotSpeed(BASE_STATS) - 180) * 0.88) * PERFECT_BONUS);
    expect(a.vz / a.vx).toBeCloseTo(0.2);
  });

  it('outside the sweet spot is not perfect', () => {
    expect(shot(BASE_STATS, 0.7, 0, line(1), 0, seeded(1)).perfect).toBe(false);
    expect(shot(BASE_STATS, 1, 0, line(1), 0, seeded(1)).perfect).toBe(false);
  });

  it('aim error turns the shot sideways, not up or down', () => {
    const ks = Array.from({ length: 50 }, (_, i) => shot(BASE_STATS, 0.6, 0, line(1), 6, seeded(i)));
    const yaws = ks.map(k => (Math.atan2(k.vz, k.vx) * 180) / Math.PI);
    expect(Math.max(...yaws)).toBeGreaterThan(3);
    expect(Math.min(...yaws)).toBeLessThan(-3);
    for (const y of yaws) expect(Math.abs(y)).toBeLessThanOrEqual(6 + 1e-9);
    for (const k of ks) expect(elevationDeg(k)).toBeCloseTo(elevationDeg(ks[0]!));
  });

  it('overcharging makes shots wilder', () => {
    const spread = (over: number) => {
      const r = seeded(3);
      const zs = Array.from({ length: 50 }, () => shot(BASE_STATS, 1, over, line(1), 0, r).vz);
      return Math.max(...zs) - Math.min(...zs);
    };
    expect(spread(1)).toBeGreaterThan(spread(0) + 50);
  });

  it('a soft shot skims and a harder one flies a little higher', () => {
    expect(elevationDeg(shot(BASE_STATS, 0, 0, line(1), 0, seeded(1)))).toBeCloseTo(4);
    expect(elevationDeg(shot(BASE_STATS, 0.5, 0, line(1), 0, seeded(1)))).toBeCloseTo(10);
  });

  it('a hard shot keeps a low, hard option: a full charge is faster and no higher than 16°', () => {
    const half = shot(MAX_POWER, 0.5, 0, line(1), 0, seeded(1));
    const full = shot(MAX_POWER, 1, 0, line(1), 0, seeded(1));
    expect(speed(full)).toBeGreaterThan(speed(half));
    expect(elevationDeg(full)).toBeLessThanOrEqual(16 + 1e-9);
  });

  it('a full-charge max-power shot from 210 px stays under the bar', () => {
    expect(peakBeforeLine(shot(MAX_POWER, 1, 0, line(1), 0, seeded(1)), 402)).toBeLessThanOrEqual(28 - BALL_R);
  });

  it('a sweet-spot shot from 210 px stays under the bar', () => {
    for (const charge of [0.82, 0.88, 0.94]) {
      const k = shot(MAX_POWER, charge, 0, line(1), 0, seeded(1));
      expect(k.perfect).toBe(true);
      expect(peakBeforeLine(k, 402), `charge ${charge}`).toBeLessThanOrEqual(28 - BALL_R);
    }
  });

  it('a full second of overcharge can sail over the bar', () => {
    expect(peakBeforeLine(shot(MAX_POWER, 1, 1, line(1), 0, seeded(1)), 402)).toBeGreaterThan(28 + 2 + BALL_R);
  });

  it('shots and volleys get topspin', () => {
    expect(shot(BASE_STATS, 0.5, 0, line(1), 0, seeded(1)).spin).toBe(0.6);
    expect(volley(BASE_STATS, line(1)).spin).toBe(0.6);
  });

  it('the tap charge is a soft shot', () => {
    expect(TAP_CHARGE).toBe(0.35);
  });
});

describe('chip, volley and header', () => {
  it('facing left mirrors vx', () => {
    expect(chip(BASE_STATS, 1, line(-1)).vx).toBeLessThan(0);
  });

  it('chips rise steeply with backspin, along the aim line', () => {
    const c = chip(BASE_STATS, 1, line(1, -0.4));
    expect(elevationDeg(c)).toBeCloseTo(CHIP_ELEVATION_DEG);
    expect(c.spin).toBeLessThan(0);
    expect(c.vz / c.vx).toBeCloseTo(-0.4);
  });

  it('a harder chip goes further', () => {
    expect(chip(BASE_STATS, 1, line(1)).vx).toBeGreaterThan(chip(BASE_STATS, 0.2, line(1)).vx);
  });

  it('volleys hit at three-quarter power with no error', () => {
    const v = volley(BASE_STATS, line(1));
    expect(speed(v)).toBeCloseTo(180 + (maxShotSpeed(BASE_STATS) - 180) * 0.75);
  });

  it('headers return at least 200 px/s, or 60 % of the incoming pace', () => {
    expect(speed(header(BASE_STATS, line(1), 100))).toBeCloseTo(200);
    expect(speed(header(BASE_STATS, line(1), 500))).toBeCloseTo(300);
    expect(header(BASE_STATS, line(1), 500).spin).toBe(0);
  });

  it('headers and volleys leave at their fixed angles whatever the aim', () => {
    for (const l of [line(1), line(-1, 0.5), line(1, -0.7)]) {
      expect(elevationDeg(volley(BASE_STATS, l))).toBeCloseTo(VOLLEY_ELEVATION_DEG);
      expect(elevationDeg(header(BASE_STATS, l, 300))).toBeCloseTo(HEADER_ELEVATION_DEG);
      expect(volley(BASE_STATS, l).vz / Math.abs(volley(BASE_STATS, l).vx)).toBeCloseTo(l.slope);
    }
  });
});
