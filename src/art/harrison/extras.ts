import type { HeadSprite } from '../body/head';
import type { HeadFacing } from '../body/pose';
import { ART_LEGEND } from '../colors';
import type { IndexedImage } from '../indexedImage';

/**
 * The glasses and headband, as overlays on his heads and portrait: the
 * spec's appendix, pixel for pixel. Legend: g rim, G glint, r trim,
 * R trim shadow, o outline; '.' keeps the pixel underneath.
 */

type HeadOverlay = Readonly<Record<HeadFacing, readonly string[]>>;

const GLASSES: HeadOverlay = {
  side: ['', '', '', '', '....gggog', '........g'],
  threeQuarter: ['', '', '', '', '.ggoggog'],
  front: ['', '', '', '', '.goggggog'],
};

/** Headband B: high on his head, the fringe hanging out below. */
const HEADBAND: HeadOverlay = {
  side: ['', '', 'RRrrrrrr'],
  threeQuarter: ['', '', 'RRrrrrrr'],
  front: ['', '', 'Rrrrrrrrr'],
};

const POWER_GLASSES: HeadOverlay = {
  side: ['', '', '', '', '', '', '', '......gggog', '..........g'],
  threeQuarter: ['', '', '', '', '', '', '', '...ggoggog'],
  front: ['', '', '', '', '', '', '', '..goggggog'],
};

/** Powered up, his fringe lifts and the band sits across his brow. */
const POWER_HEADBAND: HeadOverlay = {
  side: ['', '', '', '', '', '', '..RRrrrrrrr'],
  threeQuarter: ['', '', '', '', '', '', '..RRrrrrrrr'],
  front: ['', '', '', '', '', '', '.Rrrrrrrrr.'],
};

export const PORTRAIT_GLASSES = {
  x: 13,
  y: 23,
  rows: [
    '........gggggggg......gggggggg........',
    'gggggggg.......gggggggg.......gggggggg',
    '.......g......Gg......gG......g.......',
    '.......g.......g......g.......g.......',
    '.......g.......g......g.......g.......',
    '.......gggggggg........gggggggg.......',
  ],
} as const;

export const PORTRAIT_HEADBAND = {
  x: 16,
  y: 11,
  rows: [
    '.RrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrR',
    'RRrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrRR',
    'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
  ],
} as const;

/** Draws `rows` over a copy of `img` at (dx, dy) in ART_LEGEND; '.' and short rows keep what's there. */
export function overlay(img: IndexedImage, rows: readonly string[], dx = 0, dy = 0): IndexedImage {
  const out = img.clone();
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const id = ART_LEGEND[ch];
      if (id !== undefined) out.set(x + dx, y + dy, id);
    }),
  );
  return out;
}

/** His heads with the headband, then the glasses, on; the power heads take the power overlays. */
export function headsWith(heads: Record<HeadFacing, HeadSprite>, power: boolean, glasses: boolean, headband: boolean): Record<HeadFacing, HeadSprite> {
  const out = {} as Record<HeadFacing, HeadSprite>;
  for (const f of Object.keys(heads) as HeadFacing[]) {
    let image = heads[f].image;
    if (headband) image = overlay(image, (power ? POWER_HEADBAND : HEADBAND)[f]);
    if (glasses) image = overlay(image, (power ? POWER_GLASSES : GLASSES)[f]);
    out[f] = { image, neck: heads[f].neck };
  }
  return out;
}
