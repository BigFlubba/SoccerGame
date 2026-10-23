import { describe, expect, it } from 'vitest';
import { C, type Slot } from '../colors';
import { opaqueBounds } from '../raster';
import { HARRISON_HEADS, HARRISON_POWER_HEADS, type HeadSprite } from './head';
import { harrisonLook } from './look';

const FACINGS = ['side', 'threeQuarter', 'front'] as const;

describe('HARRISON_HEADS', () => {
  it.each(FACINGS)('%s head fits the size budget', facing => {
    const { image, neck } = HARRISON_HEADS[facing];
    const b = opaqueBounds(image)!;
    expect(b.h).toBeGreaterThanOrEqual(8);
    expect(b.h).toBeLessThanOrEqual(10);
    expect(b.w).toBeLessThanOrEqual(11);
    expect(neck.x).toBeGreaterThanOrEqual(0);
    expect(neck.x).toBeLessThan(image.width);
    expect(neck.y).toBeLessThanOrEqual(image.height);
  });

  it.each(FACINGS)('%s head uses hair, fade, skin and earring colours', facing => {
    const used = new Set(HARRISON_HEADS[facing].image.data);
    for (const c of [C.Hair, C.Fade, C.Skin, C.Earring]) expect(used.has(c)).toBe(true);
  });

  it.each(FACINGS)('%s head stays within the in-game colour budget', facing => {
    const allowed = new Set<number>([C.None, C.HairShadow, C.Hair, C.HairTip, C.Fade, C.Skin, C.SkinShadow, C.Earring, C.Outline]);
    for (const head of [HARRISON_HEADS[facing], HARRISON_POWER_HEADS[facing]]) {
      for (const c of head.image.data) expect(allowed.has(c)).toBe(true);
    }
  });
});

describe('HARRISON_POWER_HEADS', () => {
  it.each(FACINGS)('%s power head is spikier but keeps the face aligned', facing => {
    const n = HARRISON_HEADS[facing];
    const p = HARRISON_POWER_HEADS[facing];
    const nb = opaqueBounds(n.image)!;
    const pb = opaqueBounds(p.image)!;
    expect(pb.h).toBeGreaterThan(nb.h);
    expect(pb.h).toBeLessThanOrEqual(nb.h + 3);
    const eye = (h: HeadSprite) => {
      const i = h.image.data.indexOf(C.Outline);
      return { x: (i % h.image.width) - h.neck.x, y: Math.floor(i / h.image.width) - h.neck.y };
    };
    expect(eye(p)).toEqual(eye(n));
  });
});

describe('harrisonLook', () => {
  it('defaults to the home kit and swaps to away', () => {
    expect(harrisonLook().Jersey).toBe('red');
    expect(harrisonLook('away').Jersey).toBe('charcoal');
    expect(harrisonLook().Boot).toBe('volt');
  });

  it('power forms recolour only the hair', () => {
    const base = harrisonLook('home');
    const gold = harrisonLook('home', 'golden');
    expect(gold.Hair).toBe('energyGold');
    expect(harrisonLook('home', 'ultra').Hair).toBe('electric');
    const changed = (Object.keys(base) as Slot[]).filter(s => base[s] !== gold[s]).sort();
    expect(changed).toEqual(['Hair', 'HairLight', 'HairShadow', 'HairTip']);
  });
});
