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
export type KitId = 'home' | 'away';

/** Harrison's club kits, as colours only (no logos or sponsor). */
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
  away: {
    JerseyShadow: 'black',
    Jersey: 'charcoal',
    JerseyLight: 'gray',
    TrimShadow: 'silver',
    Trim: 'white',
    ShortsShadow: 'black',
    Shorts: 'charcoal',
    SocksShadow: 'black',
    Socks: 'charcoal',
  },
};

export const VOLT_BOOTS: Record<'BootShadow' | 'Boot' | 'BootLight', MasterColor> = {
  BootShadow: 'voltShadow',
  Boot: 'volt',
  BootLight: 'voltLight',
};
