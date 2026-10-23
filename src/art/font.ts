import { MASTER, TRANSPARENT, hexToRGBA, type MasterColor, type ResolvedPalette } from './colors';
import { IndexedImage, parseGrid } from './indexedImage';
import { addOutline } from './raster';

export const GLYPH_W = 4,
  GLYPH_H = 6,
  GLYPH_GAP = 1;

/** Pixel values in renderText output. */
const INK = 1;
const OUTLINE = 2;

/** Hand-authored 4×6 glyphs, uppercase only. '#' is ink. */
const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  A: ['.##.', '#..#', '#..#', '####', '#..#', '#..#'],
  B: ['###.', '#..#', '###.', '#..#', '#..#', '###.'],
  C: ['.###', '#...', '#...', '#...', '#...', '.###'],
  D: ['###.', '#..#', '#..#', '#..#', '#..#', '###.'],
  E: ['####', '#...', '###.', '#...', '#...', '####'],
  F: ['####', '#...', '###.', '#...', '#...', '#...'],
  G: ['.###', '#...', '#...', '#.##', '#..#', '.###'],
  H: ['#..#', '#..#', '####', '#..#', '#..#', '#..#'],
  I: ['###.', '.#..', '.#..', '.#..', '.#..', '###.'],
  J: ['...#', '...#', '...#', '...#', '#..#', '.##.'],
  K: ['#..#', '#.#.', '##..', '#.#.', '#..#', '#..#'],
  L: ['#...', '#...', '#...', '#...', '#...', '####'],
  M: ['#..#', '####', '####', '#..#', '#..#', '#..#'],
  N: ['#..#', '##.#', '#.##', '#..#', '#..#', '#..#'],
  O: ['.##.', '#..#', '#..#', '#..#', '#..#', '.##.'],
  P: ['###.', '#..#', '#..#', '###.', '#...', '#...'],
  Q: ['.##.', '#..#', '#..#', '#..#', '#.#.', '.#.#'],
  R: ['###.', '#..#', '#..#', '###.', '#.#.', '#..#'],
  S: ['.###', '#...', '.##.', '...#', '...#', '###.'],
  T: ['###.', '.#..', '.#..', '.#..', '.#..', '.#..'],
  U: ['#..#', '#..#', '#..#', '#..#', '#..#', '.##.'],
  V: ['#.#.', '#.#.', '#.#.', '#.#.', '#.#.', '.#..'],
  W: ['#..#', '#..#', '#..#', '####', '####', '#..#'],
  X: ['#..#', '#..#', '.##.', '.##.', '#..#', '#..#'],
  Y: ['#.#.', '#.#.', '#.#.', '.#..', '.#..', '.#..'],
  Z: ['####', '...#', '..#.', '.#..', '#...', '####'],
  '0': ['.#..', '#.#.', '#.#.', '#.#.', '#.#.', '.#..'],
  '1': ['.#..', '##..', '.#..', '.#..', '.#..', '###.'],
  '2': ['.##.', '#..#', '...#', '..#.', '.#..', '####'],
  '3': ['###.', '...#', '.##.', '...#', '...#', '###.'],
  '4': ['#..#', '#..#', '####', '...#', '...#', '...#'],
  '5': ['####', '#...', '###.', '...#', '...#', '###.'],
  '6': ['.##.', '#...', '###.', '#..#', '#..#', '.##.'],
  '7': ['####', '...#', '..#.', '.#..', '.#..', '.#..'],
  '8': ['.##.', '#..#', '.##.', '#..#', '#..#', '.##.'],
  '9': ['.##.', '#..#', '#..#', '.###', '...#', '.##.'],
  ' ': ['....', '....', '....', '....', '....', '....'],
  "'": ['.#..', '.#..', '....', '....', '....', '....'],
  '-': ['....', '....', '....', '.##.', '....', '....'],
  ':': ['....', '.#..', '....', '....', '.#..', '....'],
  '!': ['.#..', '.#..', '.#..', '.#..', '....', '.#..'],
  '?': ['.##.', '#..#', '..#.', '.#..', '....', '.#..'],
  '.': ['....', '....', '....', '....', '....', '.#..'],
  ',': ['....', '....', '....', '....', '.#..', '#...'],
  '/': ['...#', '..#.', '..#.', '.#..', '.#..', '#...'],
  '+': ['....', '.#..', '###.', '.#..', '....', '....'],
};

const parsed = new Map<string, IndexedImage>();

/** A 4×6 glyph, value 1 = ink. Unknown characters come back as '?'. */
export function glyph(ch: string): IndexedImage {
  const key = GLYPHS[ch.toUpperCase()] ? ch.toUpperCase() : '?';
  let img = parsed.get(key);
  if (!img) {
    img = parseGrid(GLYPHS[key]!, { '#': INK });
    parsed.set(key, img);
  }
  return img;
}

/** Width in pixels of `text` drawn at `scale`, without the outline. */
export function measureText(text: string, scale = 1): number {
  if (text.length === 0) return 0;
  return (text.length * GLYPH_W + (text.length - 1) * GLYPH_GAP) * scale;
}

/**
 * Text as an image: ink = 1 with a 1 px outline = 2 baked in around it, so
 * the image is 2 px wider and taller than the text. Resolve it through
 * textPalette at draw time.
 */
export function renderText(text: string, scale = 1): IndexedImage {
  const upper = text.toUpperCase();
  const img = new IndexedImage(measureText(upper, scale) + 2, GLYPH_H * scale + 2);
  [...upper].forEach((ch, i) => {
    const g = glyph(ch);
    const left = 1 + i * (GLYPH_W + GLYPH_GAP) * scale;
    for (let y = 0; y < g.height * scale; y++) {
      for (let x = 0; x < g.width * scale; x++) {
        if (g.get(Math.floor(x / scale), Math.floor(y / scale)) === INK) img.set(left + x, 1 + y, INK);
      }
    }
  });
  addOutline(img, OUTLINE);
  return img;
}

/** The two-entry palette renderText output resolves through. */
export function textPalette(ink: MasterColor, outline: MasterColor): ResolvedPalette {
  return [TRANSPARENT, hexToRGBA(MASTER[ink]), hexToRGBA(MASTER[outline])];
}
