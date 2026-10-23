import { describe, expect, it } from 'vitest';
import { MASTER } from './colors';
import { GLYPH_H, glyph, measureText, renderText, textPalette } from './font';

describe('font', () => {
  it('every supported glyph is 4×6 with some ink', () => {
    for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-':!?.,/+") {
      const g = glyph(ch);
      expect([g.width, g.height]).toEqual([4, 6]);
      expect(g.data.includes(1)).toBe(true);
    }
  });

  it('space is blank', () => {
    expect(glyph(' ').data.every(v => v === 0)).toBe(true);
  });

  it('every glyph is distinct', () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-':!?.,/+";
    const shapes = new Set([...chars].map(ch => glyph(ch).data.join('')));
    expect(shapes.size).toBe(chars.length);
  });

  it('unknown characters fall back to ?', () => {
    expect(glyph('~').data).toEqual(glyph('?').data);
  });

  it('measures text with gaps and scale', () => {
    expect(measureText('AB')).toBe(4 + 1 + 4);
    expect(measureText('AB', 2)).toBe(18);
    expect(measureText('')).toBe(0);
  });

  it('renderText is lower-case insensitive and outlined', () => {
    const img = renderText('goal');
    expect(img.data).toEqual(renderText('GOAL').data);
    expect(img.data.includes(2)).toBe(true);
  });

  it('renderText leaves room for the outline around scaled text', () => {
    const img = renderText('AB', 2);
    expect([img.width, img.height]).toEqual([18 + 2, GLYPH_H * 2 + 2]);
  });

  it('textPalette maps ink and outline to master colours', () => {
    const p = textPalette('white', 'outline');
    expect(p[0]![3]).toBe(0);
    expect(p[1]).toEqual([0xf4, 0xf4, 0xf4, 255]);
    expect(MASTER.outline).toBe('#1a1423');
    expect(p[2]).toEqual([0x1a, 0x14, 0x23, 255]);
  });
});
