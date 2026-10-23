import type { MasterColor } from './colors';

export const KIT_SLOT_NAMES = [
  'JerseyShadow',
  'Jersey',
  'JerseyLight',
  'TrimShadow',
  'Trim',
  'ShortsShadow',
  'Shorts',
  'SocksShadow',
  'Socks',
] as const;

export type KitSlots = (typeof KIT_SLOT_NAMES)[number];
export type KitId = 'home' | 'away' | 'blue';

/** Harrison's club kits and opponents' kits, as colours only (no logos or sponsor). */
export const KITS: Record<KitId, Record<KitSlots, MasterColor>> = {
  home: {
    JerseyShadow: 'redDark',
    Jersey: 'red',
    JerseyLight: 'redLight',
    TrimShadow: 'silver',
    Trim: 'white',
    ShortsShadow: 'redDark',
    Shorts: 'red',
    SocksShadow: 'redDark',
    Socks: 'red',
  },
  // Black kit drawn one step lighter than true black so it never merges into the outline.
  away: {
    JerseyShadow: 'charcoal',
    Jersey: 'slate',
    JerseyLight: 'gray',
    TrimShadow: 'silver',
    Trim: 'white',
    ShortsShadow: 'charcoal',
    Shorts: 'slate',
    SocksShadow: 'charcoal',
    Socks: 'slate',
  },
  blue: {
    JerseyShadow: 'navy',
    Jersey: 'blue',
    JerseyLight: 'blueLight',
    TrimShadow: 'silver',
    Trim: 'white',
    ShortsShadow: 'navy',
    Shorts: 'blue',
    SocksShadow: 'navy',
    Socks: 'blue',
  },
};

export const VOLT_BOOTS: Record<'BootShadow' | 'Boot' | 'BootLight', MasterColor> = {
  BootShadow: 'voltShadow',
  Boot: 'volt',
  BootLight: 'voltLight',
};
