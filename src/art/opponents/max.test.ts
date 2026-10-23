import { describe, expect, it } from 'vitest';
import { bakeAll } from '../body/bake';
import { HARRISON_BODY } from '../body/proportions';
import { C, resolvePalette } from '../colors';
import { harrisonLook } from '../harrison/look';
import { opaqueBounds } from '../raster';
import { MAX_HEADS, MAX_NAME, maxLook } from './max';

const FACINGS = ['side', 'threeQuarter', 'front'] as const;

describe('Max', () => {
  it.each(FACINGS)('%s head fits the size budget and is dark-haired', facing => {
    const { image } = MAX_HEADS[facing];
    const b = opaqueBounds(image)!;
    expect(b.h).toBeGreaterThanOrEqual(8);
    expect(b.h).toBeLessThanOrEqual(10);
    expect(new Set(image.data).has(C.Fade)).toBe(false);
  });

  it.each(FACINGS)('%s head has no earring', facing => {
    expect(new Set(MAX_HEADS[facing].image.data).has(C.Earring)).toBe(false);
  });

  it.each(FACINGS)('%s head neck sits inside the image', facing => {
    const { image, neck } = MAX_HEADS[facing];
    expect(neck.x).toBeGreaterThanOrEqual(0);
    expect(neck.x).toBeLessThan(image.width);
    expect(neck.y).toBeLessThanOrEqual(image.height);
  });

  it('Max looks different from Harrison', () => {
    expect(maxLook().Jersey).toBe('blue');
    expect(maxLook().Hair).not.toBe(harrisonLook().Hair);
    expect(maxLook().Boot).toBe('white');
  });

  it('Max frames stay within 13 colours', () => {
    const pal = resolvePalette(maxLook());
    for (const clip of Object.values(bakeAll(HARRISON_BODY, MAX_HEADS))) {
      for (const f of clip.frames) {
        const colours = new Set([...f.data].filter(id => id !== C.None).map(id => pal[id]!.join(',')));
        expect(colours.size, clip.name).toBeLessThanOrEqual(13);
      }
    }
  });

  it('is called MAX', () => {
    expect(MAX_NAME).toBe('MAX');
  });
});
