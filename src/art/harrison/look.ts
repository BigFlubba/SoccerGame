import type { LookColors, MasterColor } from '../colors';
import { KITS, VOLT_BOOTS, type KitId } from '../kits';

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
  ultra: { HairShadow: 'gray', Hair: 'electric', HairLight: 'electricLight', HairTip: 'auraWhite' },
};

export function harrisonLook(kit: KitId = 'home', form: PowerForm = 'base'): LookColors {
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
    ...KITS[kit],
    ...VOLT_BOOTS,
  };
}
