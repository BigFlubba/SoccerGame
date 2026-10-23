import { describe, expect, it } from 'vitest';
import { seeded } from '../engine/random';
import { PERFECT_BONUS, TAP_CHARGE, chip, header, shot, volley } from './kick';
import { BASE_STATS, maxShotSpeed } from './stats';

const angleDeg = (k: { vx: number; vy: number }) => (Math.atan2(k.vy, Math.abs(k.vx)) * 180) / Math.PI;

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

describe('shot', () => {
  it('a full-power max-stat shot crosses the field in about a second', () => {
    const k = shot({ ...BASE_STATS, power: 10 }, 1, 0, 'level', 1, 0, seeded(1));
    expect(640 / k.vx).toBeGreaterThan(0.85);
    expect(640 / k.vx).toBeLessThan(1.25);
  });

  it('the sweet spot is perfect: faster and exact', () => {
    const a = shot(BASE_STATS, 0.88, 0, 'level', 1, 6, seeded(2));
    const b = shot(BASE_STATS, 0.88, 0, 'level', 1, 6, seeded(99));
    expect(a.perfect).toBe(true);
    expect(a).toEqual(b);
    expect(Math.hypot(a.vx, a.vy)).toBeCloseTo((180 + (maxShotSpeed(BASE_STATS) - 180) * 0.88) * PERFECT_BONUS);
  });

  it('outside the sweet spot is not perfect', () => {
    expect(shot(BASE_STATS, 0.7, 0, 'level', 1, 0, seeded(1)).perfect).toBe(false);
    expect(shot(BASE_STATS, 1, 0, 'level', 1, 0, seeded(1)).perfect).toBe(false);
  });

  it('overcharging makes shots wilder', () => {
    const spread = (over: number) => {
      const r = seeded(3);
      const ys = Array.from({ length: 50 }, () => shot(BASE_STATS, 1, over, 'level', 1, 0, r).vy);
      return Math.max(...ys) - Math.min(...ys);
    };
    expect(spread(1)).toBeGreaterThan(spread(0) + 50);
  });

  it('aims up, level and down', () => {
    const at = (aim: 'up' | 'level' | 'down') => angleDeg(shot(BASE_STATS, 0.5, 0, aim, 1, 0, seeded(1)));
    expect([at('up'), at('level'), at('down')].map(Math.round)).toEqual([28, 12, 3]);
  });

  it('drives get topspin, lofted shots none', () => {
    expect(shot(BASE_STATS, 0.5, 0, 'level', 1, 0, seeded(1)).spin).toBe(0.6);
    expect(shot(BASE_STATS, 0.5, 0, 'down', 1, 0, seeded(1)).spin).toBe(0.6);
    expect(shot(BASE_STATS, 0.5, 0, 'up', 1, 0, seeded(1)).spin).toBe(0);
  });

  it('the tap charge is a soft shot', () => {
    expect(TAP_CHARGE).toBe(0.35);
  });
});

describe('chip, volley and header', () => {
  it('facing left mirrors vx', () => {
    expect(chip(BASE_STATS, 1, -1).vx).toBeLessThan(0);
  });

  it('chips rise steeply with backspin', () => {
    const c = chip(BASE_STATS, 1, 1);
    expect(c.vy / c.vx).toBeGreaterThan(1.3);
    expect(c.spin).toBeLessThan(0);
  });

  it('a harder chip goes further', () => {
    expect(chip(BASE_STATS, 1, 1).vx).toBeGreaterThan(chip(BASE_STATS, 0.2, 1).vx);
  });

  it('volleys hit at three-quarter power with no error', () => {
    const v = volley(BASE_STATS, 'level', 1);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(180 + (maxShotSpeed(BASE_STATS) - 180) * 0.75);
    expect(Math.round(angleDeg(v))).toBe(5);
    expect(Math.round(angleDeg(volley(BASE_STATS, 'down', -1)))).toBe(-10);
  });

  it('headers return at least 200 px/s, or 60 % of the incoming pace', () => {
    expect(Math.hypot(header(BASE_STATS, 'level', 1, 100).vx, header(BASE_STATS, 'level', 1, 100).vy)).toBeCloseTo(200);
    const fast = header(BASE_STATS, 'up', 1, 500);
    expect(Math.hypot(fast.vx, fast.vy)).toBeCloseTo(300);
    expect(Math.round(angleDeg(fast))).toBe(35);
    expect(Math.round(angleDeg(header(BASE_STATS, 'down', 1, 500)))).toBe(-20);
  });
});
