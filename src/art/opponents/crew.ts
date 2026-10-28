import type { CrewId } from '../../game/crew';
import type { HeadSprite } from '../body/head';
import type { HeadFacing } from '../body/pose';
import { BRICK_BODY, HARRISON_BODY, type BodyProportions } from '../body/proportions';
import { ART_LEGEND, EXTRA_COLORS, type LookColors, type MasterColor } from '../colors';
import { parseGrid } from '../indexedImage';
import { KITS, type KitId } from '../kits';
import type { Point } from '../raster';

function head(rows: readonly string[], neck: Point): HeadSprite {
  return { image: parseGrid(rows, ART_LEGEND), neck };
}

/**
 * The Park crew's heads, made-up kids, each readable at a glance. Legend:
 * H/h/L/t hair shadow/base/light/tip, k/s/l skin/shadow/light, b a freckle,
 * o eye.
 */
export const CREW_HEADS: Readonly<Record<CrewId, Record<HeadFacing, HeadSprite>>> = {
  // Big Brick: a round head and a buzz cut, the hair only a pixel or two above the brow; a thick neck.
  brick: {
    side: head(
      [
        '...HHHH...',
        '..HhhhhH..',
        '.Hhhhhhhh.',
        '.Hhskkkkk.',
        '.Hskkkkok.',
        '.Hskkkkkkk',
        '.sskkkkks.',
        '..skkkkk..',
        '...skkk...',
        '...skkk...',
      ],
      { x: 4, y: 9 },
    ),
    threeQuarter: head(
      [
        '..HHHHH...',
        '.Hhhhhhhh.',
        '.hhhhhhhh.',
        '.skkkkkkk.',
        '.skokkokk.',
        '.skkkkkkk.',
        '.sskkkkks.',
        '..skkkk...',
        '...kkkk...',
        '...kkkk...',
      ],
      { x: 4, y: 9 },
    ),
    front: head(
      [
        '..HHHHH..',
        '.Hhhhhhh.',
        'Hhhhhhhhh',
        'skkkkkkks',
        'skokkkoks',
        'skkkskkks',
        'skkkkkkks',
        '.kkssskk.',
        '..skkks..',
        '..skkks..',
      ],
      { x: 4, y: 9 },
    ),
  },
  // Boomer Leo: a mop of tight curls, lit in little loops.
  leo: {
    side: head(
      [
        '.hHhHhh...',
        'HhLhhLhHh.',
        'HHhhHhhhhh',
        'HHhHkkkhh.',
        'HHhskkkok.',
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
        '.hHhHhHh..',
        'HhLhhLhhH.',
        'HhhHhhhHhh',
        'HhHhkhhhh.',
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
        '.hHhHhHh.',
        'HhLhhLhhH',
        'HhhHhhHhH',
        'HhkkkkkhH',
        'skokkkoks',
        'skkkskkks',
        'skkkkkkks',
        '.kkssskk.',
        '..skkks..',
        '...kkk...',
      ],
      { x: 4, y: 9 },
    ),
  },
  // Tricky Tia: hair pulled back into a ponytail that swings out behind, so her side and three-quarter heads run wider.
  tia: {
    side: head(
      [
        '....hhhhh...',
        '...hLhhhhh..',
        '.HHhhhhhhhH.',
        'HhHhhhhkkkk.',
        'HhHHhskkkok.',
        '.hH.Hskkkkkk',
        '.HH..skkkks.',
        '..H...skkk..',
        '......skk...',
        '......skk...',
      ],
      { x: 7, y: 9 },
    ),
    threeQuarter: head(
      [
        '...hhhhhh..',
        '..hLhhhhhH.',
        '.HhhhhhhhhH',
        'HhHhkkhhhh.',
        'HhHskokkok.',
        '.hHskkkkkkk',
        '.HH.skkkks.',
        '..H..skkk..',
        '.....kkk...',
        '.....kkk...',
      ],
      { x: 6, y: 9 },
    ),
    front: head(
      [
        '..hhhhh..',
        '.hLhhhhh.',
        'HhhhhhhhH',
        'HhkkkkkhH',
        'skokkkoks',
        'skkkskkks',
        'skkkkkkks',
        '.kkssskk.',
        '..skkks..',
        '...kkk...',
      ],
      { x: 4, y: 9 },
    ),
  },
  // Pesky Pete: spiky ginger hair sticking up every way, and freckles.
  pete: {
    side: head(
      [
        't.tHt.t...',
        'HtHhhtHt..',
        '.HhhhhhhHt',
        'HHHhhHhhh.',
        'HHHskkkok.',
        'HHHskbkkkk',
        '.HHskkkks.',
        '..Hskkkk..',
        '...skk....',
        '...skk....',
      ],
      { x: 4, y: 9 },
    ),
    threeQuarter: head(
      [
        't.tHt.t.t.',
        'HtHhhhtHt.',
        'HHhhhhhhht',
        'HHhHhhhhh.',
        'Hskokkok..',
        'Hskbkkbkk.',
        '.skkkkks..',
        '..skkkk...',
        '...kkk....',
        '...kkk....',
      ],
      { x: 4, y: 9 },
    ),
    front: head(
      [
        't.t.t.t.t',
        'HtHhthHtH',
        'HHhhhhhhH',
        'HhhHhhHhH',
        'skokkkoks',
        'skbkkkbks',
        'skkkskkks',
        '.kkssskk.',
        '..skkks..',
        '...kkk...',
      ],
      { x: 4, y: 9 },
    ),
  },
};

/** Brick is stockier; the rest share Harrison's build. */
export const CREW_BODY: Readonly<Record<CrewId, BodyProportions>> = { brick: BRICK_BODY, leo: HARRISON_BODY, tia: HARRISON_BODY, pete: HARRISON_BODY };

type Skin = Record<'SkinShadow' | 'Skin' | 'SkinLight' | 'Blush' | 'Lip', MasterColor>;
type Hair = Record<'HairShadow' | 'Hair' | 'HairLight' | 'HairTip', MasterColor>;
type Boots = Record<'BootShadow' | 'Boot' | 'BootLight', MasterColor>;

const LIGHT: Skin = { SkinShadow: 'skinShadow', Skin: 'skin', SkinLight: 'skinLight', Blush: 'blush', Lip: 'lip' };
const LOOKS: Record<CrewId, { skin: Skin; hair: Hair; kit: KitId; boots: Boots }> = {
  brick: {
    skin: { SkinShadow: 'brownShadow', Skin: 'brown', SkinLight: 'brownLight', Blush: 'brownLip', Lip: 'brownLip' },
    hair: { HairShadow: 'black', Hair: 'black', HairLight: 'charcoal', HairTip: 'charcoal' },
    kit: 'orange',
    boots: { BootShadow: 'charcoal', Boot: 'slate', BootLight: 'gray' },
  },
  leo: {
    skin: { SkinShadow: 'tanShadow', Skin: 'tan', SkinLight: 'tanLight', Blush: 'tanLip', Lip: 'tanLip' },
    hair: { HairShadow: 'black', Hair: 'hairShadow', HairLight: 'hair', HairTip: 'hair' },
    kit: 'purple',
    boots: { BootShadow: 'silver', Boot: 'white', BootLight: 'white' },
  },
  tia: {
    skin: LIGHT,
    hair: { HairShadow: 'hairLight', Hair: 'hairTip', HairLight: 'energyGoldLight', HairTip: 'energyGoldLight' },
    kit: 'teal',
    boots: { BootShadow: 'silver', Boot: 'white', BootLight: 'white' },
  },
  pete: {
    // His freckles are the skin's own shadow, so they add no colour.
    skin: { ...LIGHT, Blush: 'skinShadow' },
    hair: { HairShadow: 'flameDark', Hair: 'flame', HairLight: 'gold', HairTip: 'gold' },
    kit: 'lime',
    boots: { BootShadow: 'charcoal', Boot: 'slate', BootLight: 'gray' },
  },
};

export function crewLook(id: CrewId): LookColors {
  const { skin, hair, kit, boots } = LOOKS[id];
  return { Outline: 'outline', ...skin, EyeWhite: 'white', Iris: 'iris', Pupil: 'ink', ...hair, Fade: 'fade', Earring: 'white', ...KITS[kit], ...boots, ...EXTRA_COLORS };
}
