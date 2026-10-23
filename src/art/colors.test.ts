import { describe, expect, it } from 'vitest';
import { ART_LEGEND, C, MASTER, resolvePalette, toRGBA, type LookColors, type Slot } from './colors';
import { IndexedImage } from './indexedImage';
import { KITS, KIT_SLOT_NAMES } from './kits';

const fullLook = (): LookColors => {
  const slots = Object.keys(C).filter(k => k !== 'None') as Slot[];
  const look = Object.fromEntries(slots.map(s => [s, 'white'])) as LookColors;
  look.Jersey = 'red';
  return look;
};

describe('resolvePalette', () => {
  it('resolves logical ids to RGBA with index 0 transparent', () => {
    const pal = resolvePalette(fullLook());
    expect(pal[C.None]).toEqual([0, 0, 0, 0]);
    expect(pal[C.Jersey]).toEqual([0xc0, 0x24, 0x2c, 255]);
  });
});

describe('toRGBA', () => {
  it('converts an IndexedImage to RGBA bytes', () => {
    const img = new IndexedImage(2, 1);
    img.set(1, 0, C.Jersey);
    expect(Array.from(toRGBA(img, resolvePalette(fullLook())))).toEqual([0, 0, 0, 0, 0xc0, 0x24, 0x2c, 255]);
  });
});

describe('MASTER', () => {
  it('every colour is a valid #rrggbb', () => {
    for (const hex of Object.values(MASTER)) expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('has about 40 colours', () => {
    expect(Object.keys(MASTER).length).toBeGreaterThanOrEqual(36);
    expect(Object.keys(MASTER).length).toBeLessThanOrEqual(44);
  });
});

describe('KITS', () => {
  it('both kits define every kit slot', () => {
    for (const kit of Object.values(KITS)) expect(Object.keys(kit).sort()).toEqual([...KIT_SLOT_NAMES].sort());
  });
});

describe('ART_LEGEND', () => {
  it('does not use the reserved transparent char', () => {
    expect('.' in ART_LEGEND).toBe(false);
  });
});
