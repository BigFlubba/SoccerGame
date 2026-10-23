import type { HeadFacing } from '../body/pose';
import { ART_LEGEND } from '../colors';
import { parseGrid, type IndexedImage } from '../indexedImage';
import type { Point } from '../raster';

/** A head image plus the pixel that sits on the body's neck joint. */
export interface HeadSprite {
  image: IndexedImage;
  neck: Point;
}

function head(rows: readonly string[], neck: Point): HeadSprite {
  return { image: parseGrid(rows, ART_LEGEND), neck };
}

/**
 * Hair rows sit on top of shared face rows, so the power heads (taller, spiky
 * hair) keep the face at the same offset from the neck.
 * Legend: H/h/t hair shadow/base/golden tip, f fade, k/s skin, e stud, o eye.
 */
const SIDE_FACE = [
  'fffskkkok.',
  'fffskkkkkk',
  '.ffekkkks.',
  '..fskkkk..',
  '...skk....',
  '...skk....',
];

const THREE_QUARTER_FACE = [
  'fskokkok..',
  'fskkkkkkk.',
  '.ekkkkks..',
  '..skkkk...',
  '...kkk....',
  '...kkk....',
];

const FRONT_FACE = [
  'skokkkoks',
  'skkkskkks',
  'ekkkkkkke',
  '.kkssskk.',
  '..skkks..',
  '...kkk...',
];

/** Fade is covered by hair when powered up; `pad` widens rows for spikes that reach past the face. */
const covered = (rows: readonly string[], padLeft: number, padRight = 0) =>
  rows.map(r => '.'.repeat(padLeft) + r.replaceAll('f', 'H') + '.'.repeat(padRight));

export const HARRISON_HEADS: Record<HeadFacing, HeadSprite> = {
  // Forward-sweeping wedge fringe over a high taper fade, stud on the lobe.
  side: head(['...Hhhhh..', '.HHhhhhhht', 'fHhhhhhhtt', 'fffffhhtt.', ...SIDE_FACE], { x: 4, y: 9 }),
  threeQuarter: head(['..Hhhhh...', '.HHhhhhht.', 'fHhhhhhhtt', 'fffhhhhtt.', ...THREE_QUARTER_FACE], { x: 4, y: 9 }),
  front: head(['..hhhhh..', '.Hhhhhhh.', 'fHhhhhhhf', 'fhhhhhttf', ...FRONT_FACE], { x: 4, y: 9 }),
};

export const HARRISON_POWER_HEADS: Record<HeadFacing, HeadSprite> = {
  // Big spikes swept up and back, fringe lifted off the brow.
  side: head(
    [
      '.t.....t....',
      '.ht....ht...',
      '..hht...hht.',
      't..hhhh.hhhh',
      'hhhhhhhhhhht',
      '.HHhhhhhhhht',
      '..HHHhhhhtk.',
      ...covered(SIDE_FACE, 2),
    ],
    { x: 6, y: 12 },
  ),
  threeQuarter: head(
    [
      '.t.....t....',
      '.ht....ht.t.',
      '..hht..hhht.',
      't..hhhhhhhhh',
      'hhhhhhhhhhht',
      '.HHhhhhhhhh.',
      '..HHhhhhhtk.',
      ...covered(THREE_QUARTER_FACE, 2),
    ],
    { x: 6, y: 12 },
  ),
  front: head(
    [
      't....t....t',
      'ht..hth..th',
      '.hhhhhhhhh.',
      'thhhhhhhhht',
      '.Hhhhhhhhh.',
      '.HHhhhhhHH.',
      '.Hhkkkkkhh.',
      ...covered(FRONT_FACE, 1, 1),
    ],
    { x: 5, y: 12 },
  ),
};
