import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SpriteCache } from '../engine/sprites';
import { DEFAULT_OUTFIT, type Outfit } from '../meta/locker';
import { HarrisonArt } from './harrisonArt';
import { stubCanvases } from './testDraw';

const HEADBAND: Outfit = { ...DEFAULT_OUTFIT, extras: ['headband'] };

describe("HarrisonArt's caches", () => {
  beforeEach(stubCanvases);
  afterEach(() => vi.unstubAllGlobals());

  it('an equal outfit, made anew, gets the sprite set already baked', () => {
    const art = new HarrisonArt(new SpriteCache());
    expect(art.set({ kit: 'home', boots: 'volt', extras: ['headband'] }, 'home')).toBe(art.set(HEADBAND, 'home'));
  });

  it('extras put on in another order are the same outfit', () => {
    const art = new HarrisonArt(new SpriteCache());
    expect(art.set({ ...DEFAULT_OUTFIT, extras: ['wristbands', 'glasses'] }, 'home')).toBe(art.set({ ...DEFAULT_OUTFIT, extras: ['glasses', 'wristbands'] }, 'home'));
  });

  it('another outfit, or another set, never gets a set baked for something else', () => {
    const art = new HarrisonArt(new SpriteCache());
    const plain = art.set(DEFAULT_OUTFIT, 'home');
    expect(art.set(HEADBAND, 'home')).not.toBe(plain);
    expect(art.set({ ...DEFAULT_OUTFIT, kit: 'away' }, 'home')).not.toBe(plain);
    expect(art.set({ ...DEFAULT_OUTFIT, boots: 'red' }, 'home')).not.toBe(plain);
    expect(art.set(DEFAULT_OUTFIT, 'homePower')).not.toBe(plain);
    expect(art.set(DEFAULT_OUTFIT, 'homeGolden')).not.toBe(art.set(DEFAULT_OUTFIT, 'homePower'));
  });

  it('portraits are kept per outfit', () => {
    const art = new HarrisonArt(new SpriteCache());
    expect(art.portraitsOf({ ...HEADBAND })).toBe(art.portraitsOf(HEADBAND));
    expect(art.portraitsOf(HEADBAND)).not.toBe(art.portraitsOf(DEFAULT_OUTFIT));
  });

  it("the try-on's clip is kept per outfit and clip", () => {
    const art = new HarrisonArt(new SpriteCache());
    expect(art.previewImage({ ...HEADBAND }, 'idle', 0)).toBe(art.previewImage(HEADBAND, 'idle', 0));
    expect(art.previewImage(HEADBAND, 'idle', 0)).not.toBe(art.previewImage(DEFAULT_OUTFIT, 'idle', 0));
    expect(art.previewImage(HEADBAND, 'run', 0)).not.toBe(art.previewImage(HEADBAND, 'idle', 0));
  });
});
