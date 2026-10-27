import type { HeadSprite } from '../body/head';
import type { HeadFacing } from '../body/pose';
import { ART_LEGEND, type LookColors } from '../colors';
import { parseGrid } from '../indexedImage';
import { KITS } from '../kits';
import type { Point } from '../raster';

function head(rows: readonly string[], neck: Point): HeadSprite {
  return { image: parseGrid(rows, ART_LEGEND), neck };
}

/**
 * Speedy Sam, the Park's boss: a high-top fade standing up over a white
 * headband worn across the brow. Legend: H/h/L hair shadow/base/light,
 * r the band (his kit's trim), k/s skin, o eye.
 */
export const SAM_HEADS: Readonly<Record<HeadFacing, HeadSprite>> = {
  side: head(
    [
      '..HhLhh...',
      '.HhhhhhH..',
      '.rrrrrrrr.',
      '.HHskkkkk.',
      '.HHskkkok.',
      '.HHskkkkkk',
      '..Hskkkks.',
      '...skkkk..',
      '...skk....',
      '...skk....',
    ],
    { x: 4, y: 9 },
  ),
  threeQuarter: head(
    [
      '..hhLhH...',
      '.HhhhhhhH.',
      '.rrrrrrrr.',
      '.Hskkkkkk.',
      '.skokkok..',
      '.skkkkkkk.',
      '..skkkks..',
      '...skkk...',
      '...kkk....',
      '...kkk....',
    ],
    { x: 4, y: 9 },
  ),
  front: head(
    [
      '..hhLhh..',
      '.Hhhhhhh.',
      'rrrrrrrrr',
      'skkkkkkks',
      'skokkkoks',
      'skkkskkks',
      'skkkkkkks',
      '.kkssskk.',
      '..skkks..',
      '...kkk...',
    ],
    { x: 4, y: 9 },
  ),
};

/** Brown skin, black hair, the hot pink kit and white boots. */
export function samLook(): LookColors {
  return {
    Outline: 'outline',
    SkinShadow: 'brownShadow',
    Skin: 'brown',
    SkinLight: 'brownLight',
    Blush: 'brownLip',
    Lip: 'brownLip',
    EyeWhite: 'white',
    Iris: 'iris',
    Pupil: 'ink',
    HairShadow: 'black',
    Hair: 'black',
    HairLight: 'charcoal',
    HairTip: 'charcoal',
    Fade: 'fade',
    Earring: 'white',
    ...KITS.pink,
    BootShadow: 'silver',
    Boot: 'white',
    BootLight: 'white',
  };
}
