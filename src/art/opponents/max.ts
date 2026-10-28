import type { HeadSprite } from '../body/head';
import type { HeadFacing } from '../body/pose';
import { ART_LEGEND, EXTRA_COLORS, type LookColors } from '../colors';
import { parseGrid } from '../indexedImage';
import { KITS } from '../kits';
import type { Point } from '../raster';

export const MAX_NAME = 'MAX';

function head(rows: readonly string[], neck: Point): HeadSprite {
  return { image: parseGrid(rows, ART_LEGEND), neck };
}

/**
 * Max, the neighbour kid: short, messy dark hair with no fade, so he reads
 * as a different kid from Harrison at a glance. Same face budget, no stud.
 * Legend: H/h/t hair shadow/base/tip, k/s skin, o eye.
 */
export const MAX_HEADS: Record<HeadFacing, HeadSprite> = {
  side: head(
    [
      '.t.Hhh.t..',
      '.HhhhhhHh.',
      'HHhhhhhhht',
      'HHHhHhhhh.',
      'HHHskkkok.',
      'HHHskkkkkk',
      '.HHskkkks.',
      '..Hskkkk..',
      '...skk....',
      '...skk....',
    ],
    { x: 4, y: 9 },
  ),
  threeQuarter: head(
    [
      '.t.hHh.t..',
      '.HhhhhhhH.',
      'HHhhhhhhht',
      'HHhHhhhhh.',
      'Hskokkok..',
      'Hskkkkkkk.',
      '.skkkkks..',
      '..skkkk...',
      '...kkk....',
      '...kkk....',
    ],
    { x: 4, y: 9 },
  ),
  front: head(
    [
      '.t.hth.t.',
      '.Hhhhhhh.',
      'HHhhhhhhH',
      'HhhHhhHhH',
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

/** Blue kit, white boots, dark brown hair. */
export function maxLook(): LookColors {
  return {
    Outline: 'outline',
    SkinShadow: 'skinShadow',
    Skin: 'skin',
    SkinLight: 'skinLight',
    Blush: 'blush',
    Lip: 'lip',
    EyeWhite: 'white',
    Iris: 'iris',
    Pupil: 'ink',
    HairShadow: 'black',
    Hair: 'hairShadow',
    HairLight: 'hair',
    HairTip: 'hair',
    Fade: 'fade',
    Earring: 'white',
    ...KITS.blue,
    BootShadow: 'silver',
    Boot: 'white',
    BootLight: 'white',
    ...EXTRA_COLORS,
  };
}
