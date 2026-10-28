import { EXTRA_COLORS, type LookColors, type MasterColor } from '../colors';
import { KITS, VOLT_BOOTS, type KitId, type KitSlots } from '../kits';

/** How Harrison looks while powered up. Only the hair changes colour. */
export type PowerForm = 'base' | 'golden' | 'storm' | 'ultra';

type HairSlots = 'HairShadow' | 'Hair' | 'HairLight' | 'HairTip';

const GOLDEN_HAIR: Record<HairSlots, MasterColor> = {
  HairShadow: 'goldDark',
  Hair: 'energyGold',
  HairLight: 'energyGoldLight',
  HairTip: 'auraWhite',
};

const HAIR: Record<PowerForm, Record<HairSlots, MasterColor>> = {
  // Light brown with golden-blond ends, from the reference photos.
  base: { HairShadow: 'hairShadow', Hair: 'hair', HairLight: 'hairLight', HairTip: 'hairTip' },
  golden: GOLDEN_HAIR,
  storm: GOLDEN_HAIR,
  ultra: { HairShadow: 'violet', Hair: 'electric', HairLight: 'electricLight', HairTip: 'auraWhite' },
};

export type BootSlots = 'BootShadow' | 'Boot' | 'BootLight';

/** Him in any kit and boots colours, in a power form. */
export function lookIn(kit: Record<KitSlots, MasterColor>, boots: Record<BootSlots, MasterColor>, form: PowerForm = 'base'): LookColors {
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
    ...HAIR[form],
    Fade: 'fade',
    Earring: 'white',
    ...kit,
    ...boots,
    ...EXTRA_COLORS,
  };
}

/** Him in a club or opponents' kit with his volt boots: the sprite viewer's look. */
export function harrisonLook(kit: KitId = 'home', form: PowerForm = 'base'): LookColors {
  return lookIn(KITS[kit], VOLT_BOOTS, form);
}
