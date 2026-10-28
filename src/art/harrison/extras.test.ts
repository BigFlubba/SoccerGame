import { describe, expect, it } from 'vitest';
import { C } from '../colors';
import { IndexedImage } from '../indexedImage';
import { headsWith, overlay } from './extras';
import { HARRISON_HEADS, HARRISON_POWER_HEADS } from './head';

describe('overlay', () => {
  it("overlay keeps '.' and short rows", () => {
    const img = new IndexedImage(4, 3);
    img.set(0, 0, C.Skin);
    img.set(3, 2, C.Hair);
    const out = overlay(img, ['.r', '', 'R'], 0, 0);
    expect([out.get(0, 0), out.get(1, 0), out.get(0, 2), out.get(3, 2)]).toEqual([C.Skin, C.Trim, C.TrimShadow, C.Hair]);
    expect(img.get(1, 0)).toBe(C.None);
  });
});

describe('headsWith', () => {
  it('glasses on the side head: rim before the eye, the eye stays dark', () => {
    const side = headsWith(HARRISON_HEADS, false, true, false).side.image;
    expect(side.get(8, 4)).toBe(C.GlassesRim);
    expect(side.get(7, 4)).toBe(C.Outline);
    expect(side.get(8, 5)).toBe(C.GlassesRim);
  });

  it('the headband crosses the top of his head in trim', () => {
    const side = headsWith(HARRISON_HEADS, false, false, true).side.image;
    const row = [...Array(10)].map((_, x) => side.get(x, 2));
    expect(row.slice(0, 2)).toEqual([C.TrimShadow, C.TrimShadow]);
    expect(row.slice(2, 8)).toEqual(Array(6).fill(C.Trim));
    expect(row.slice(8)).toEqual([HARRISON_HEADS.side.image.get(8, 2), HARRISON_HEADS.side.image.get(9, 2)]);
  });

  it('powered up, the band crosses his brow', () => {
    const side = headsWith(HARRISON_POWER_HEADS, true, false, true).side.image;
    const row = [...Array(11)].map((_, x) => side.get(x, 6));
    expect(row.slice(2, 4)).toEqual([C.TrimShadow, C.TrimShadow]);
    expect(row.slice(4, 11)).toEqual(Array(7).fill(C.Trim));
  });

  it('the headband goes on before the glasses', () => {
    const both = headsWith(HARRISON_POWER_HEADS, true, true, true).side.image;
    expect(both.get(6, 7)).toBe(C.GlassesRim);
    expect(both.get(4, 6)).toBe(C.Trim);
  });

  it('nothing worn leaves every head as it was, necks too', () => {
    const plain = headsWith(HARRISON_HEADS, false, false, false);
    for (const f of ['side', 'threeQuarter', 'front'] as const) {
      expect(plain[f].image.data).toEqual(HARRISON_HEADS[f].image.data);
      expect(plain[f].neck).toEqual(HARRISON_HEADS[f].neck);
    }
  });
});
