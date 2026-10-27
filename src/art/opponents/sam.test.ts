import { describe, expect, it } from 'vitest';
import { bakeAll } from '../body/bake';
import { HARRISON_BODY } from '../body/proportions';
import { C, resolvePalette } from '../colors';
import { harrisonLook } from '../harrison/look';
import { opaqueBounds } from '../raster';
import { crewLook } from './crew';
import { maxLook } from './max';
import { SAM_HEADS, samLook } from './sam';

const FACINGS = ['side', 'threeQuarter', 'front'] as const;

describe('Speedy Sam', () => {
  it.each(FACINGS)('his %s head fits the size budget, with its neck inside the image', facing => {
    const { image, neck } = SAM_HEADS[facing];
    const b = opaqueBounds(image)!;
    expect(b.h).toBeGreaterThanOrEqual(8);
    expect(b.h).toBeLessThanOrEqual(10);
    expect(neck.x).toBeGreaterThanOrEqual(0);
    expect(neck.x).toBeLessThan(image.width);
    expect(neck.y).toBeLessThanOrEqual(image.height);
    expect(new Set(image.data).has(C.Earring)).toBe(false);
  });

  it('his frames stay within 13 colours', () => {
    const pal = resolvePalette(samLook());
    for (const clip of Object.values(bakeAll(HARRISON_BODY, SAM_HEADS))) {
      for (const f of clip.frames) {
        const colours = new Set([...f.data].filter(c => c !== C.None).map(c => pal[c]!.join(',')));
        expect(colours.size, clip.name).toBeLessThanOrEqual(13);
      }
    }
  });

  it("his jersey is unlike Harrison's, Max's and every crew kid's", () => {
    const others = [harrisonLook('home'), harrisonLook('away'), maxLook(), ...(['brick', 'leo', 'tia', 'pete'] as const).map(crewLook)];
    for (const look of others) expect(samLook().Jersey).not.toBe(look.Jersey);
  });

  it.each(FACINGS)('his %s head wears a headband: one row of his trim across the brow, above the eyes', facing => {
    const { image } = SAM_HEADS[facing];
    const rows = Array.from({ length: image.height }, (_, y) => Array.from({ length: image.width }, (_, x) => image.get(x, y)));
    const bandRows = rows.map((r, y) => [r, y] as const).filter(([r]) => r.includes(C.Trim));
    expect(bandRows.length).toBe(1);
    const [band, y] = bandRows[0]!;
    const run = band.map(c => (c === C.Trim ? 'r' : '.')).join('').replace(/^\.+|\.+$/g, '');
    // One unbroken band, as wide as the head there.
    expect(run).toMatch(/^r+$/);
    expect(run.length).toBeGreaterThanOrEqual(opaqueBounds(image)!.w - 2);
    // The eyes sit below it.
    const eyeRow = rows.findIndex((r, ry) => ry > 0 && r.some((c, x) => c === C.Outline && x > 0 && x < image.width - 1));
    expect(y).toBeLessThan(eyeRow);
    expect(y).toBeGreaterThan(0);
  });
});
