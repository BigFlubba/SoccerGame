import { M } from './colors';
import { GLYPH_GAP, GLYPH_H, GLYPH_W, glyph, measureText } from './font';
import { IndexedImage } from './indexedImage';

export type ButtonName = 'A' | 'B' | 'X' | 'Y' | 'LB' | 'RS' | 'RT' | 'START';

/** Face colours as on an Xbox pad: A green, B red, X blue, Y yellow, the rest slate. */
const FACE: Readonly<Record<ButtonName, number>> = { A: M.grassLight, B: M.red, X: M.blue, Y: M.gold, LB: M.slate, RS: M.slate, RT: M.slate, START: M.slate };
/** Letters are white, except on the light yellow Y, where a dark letter reads better. */
const LABEL: Readonly<Partial<Record<ButtonName, number>>> = { Y: M.outline };
/** Round buttons are this tall (and A, B and X this wide); longer labels stretch into a pill. */
const SIZE = 11;
const R = (SIZE - 1) / 2;
/** Room left either side of a label inside the pill. */
const LABEL_PAD = 7;

/** Distance from (x, y) to the pill's spine, the segment between its two end-circle centres. */
function fromSpine(x: number, y: number, w: number): number {
  const cx = Math.min(Math.max(x, R), w - 1 - R);
  return Math.hypot(x - cx, y - R);
}

/** A controller button as a little round (or pill-shaped) picture with its label, in M ids. */
export function buttonGlyph(b: ButtonName): IndexedImage {
  const w = Math.max(SIZE, measureText(b) + LABEL_PAD);
  const img = new IndexedImage(w, SIZE);
  // Same rounding as fillCircle, so the edges read as round rather than square.
  const inside = (d: number, r: number) => d * d <= r * r + r;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < w; x++) {
      const d = fromSpine(x, y, w);
      if (inside(d, R - 1)) img.set(x, y, FACE[b]);
      else if (inside(d, R)) img.set(x, y, M.outline);
    }
  }
  const left = Math.floor((w - measureText(b)) / 2);
  const top = Math.floor((SIZE - GLYPH_H) / 2);
  [...b].forEach((ch, i) => {
    const g = glyph(ch);
    for (let y = 0; y < g.height; y++) {
      for (let x = 0; x < g.width; x++) if (g.get(x, y) !== 0) img.set(left + i * (GLYPH_W + GLYPH_GAP) + x, top + y, LABEL[b] ?? M.white);
    }
  });
  return img;
}
