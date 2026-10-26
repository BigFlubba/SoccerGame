import { describe, expect, it } from 'vitest';
import { M } from './colors';
import { buttonGlyph, type ButtonName } from './glyphs';

const BUTTONS: readonly Exclude<ButtonName, 'Y'>[] = ['A', 'B', 'X', 'RT', 'START'];
const FACE: Record<Exclude<ButtonName, 'Y'>, number> = { A: M.grassLight, B: M.red, X: M.blue, RT: M.slate, START: M.slate };

describe('buttonGlyph', () => {
  it('glyphs are distinct and round', () => {
    const images = BUTTONS.map(buttonGlyph);
    for (const [i, img] of images.entries()) {
      const b = BUTTONS[i]!;
      const [w, h] = [img.width, img.height];
      for (const [x, y] of [
        [0, 0],
        [w - 1, 0],
        [0, h - 1],
        [w - 1, h - 1],
      ] as const) {
        expect(img.get(x, y), `${b} corner (${x}, ${y})`).toBe(0);
      }
      expect(img.get(Math.floor(w / 2), 0), `${b} top edge`).not.toBe(0);
      expect(img.get(0, Math.floor(h / 2)), `${b} left edge`).not.toBe(0);
      for (let j = i + 1; j < images.length; j++) expect(img.data.join(), `${b} vs ${BUTTONS[j]}`).not.toBe(images[j]!.data.join());
    }
  });

  it('colours each face like the controller, with a white letter', () => {
    for (const b of BUTTONS) {
      const ids = new Set(buttonGlyph(b).data);
      expect(ids.has(FACE[b]), b).toBe(true);
      expect(ids.has(M.white), b).toBe(true);
    }
  });

  it('A, B and X are round buttons the height of a text line; RT and START are wider', () => {
    const [a, rt, start] = [buttonGlyph('A'), buttonGlyph('RT'), buttonGlyph('START')];
    expect(a.width).toBe(a.height);
    expect(rt.width).toBeGreaterThan(a.width);
    expect(start.width).toBeGreaterThan(rt.width);
    for (const b of BUTTONS) expect(buttonGlyph(b).height).toBe(a.height);
  });

  it('the Y glyph is a gold disc with a dark Y', () => {
    const y = buttonGlyph('Y');
    const a = buttonGlyph('A');
    expect([y.width, y.height]).toEqual([a.width, a.height]);
    const ids = new Set(y.data);
    expect(ids.has(M.gold)).toBe(true);
    expect(ids.has(M.white)).toBe(false);
    const dark = (img: typeof y) => img.data.filter(id => id === M.outline).length;
    expect(dark(y)).toBeGreaterThan(dark(a));
  });
});
