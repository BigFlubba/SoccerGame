import { ballFrames } from '../art/ball';
import type { AnimName } from '../art/body/animations';
import { bakeAll, type BakedClip } from '../art/body/bake';
import type { HeadSprite } from '../art/body/head';
import type { HeadFacing } from '../art/body/pose';
import { HARRISON_BODY } from '../art/body/proportions';
import { masterPalette, resolvePalette, type LookColors, type MasterColor } from '../art/colors';
import { renderText, textPalette } from '../art/font';
import { HARRISON_HEADS } from '../art/harrison/head';
import { harrisonLook } from '../art/harrison/look';
import { harrisonPortrait } from '../art/harrison/portrait';
import { flipX } from '../art/indexedImage';
import { MAX_HEADS, maxLook } from '../art/opponents/max';
import { backyardLayers, goalSprites, type VenueLayers } from '../art/venues/backyard';
import { toCanvas } from '../engine/bitmaps';
import { SpriteCache } from '../engine/sprites';

export interface SpriteSet {
  right: Record<AnimName, HTMLCanvasElement[]>;
  left: Record<AnimName, HTMLCanvasElement[]>;
}

export interface GameArt {
  layers: Record<keyof VenueLayers, HTMLCanvasElement>;
  goal: { back: HTMLCanvasElement; front: HTMLCanvasElement; backFlipped: HTMLCanvasElement; frontFlipped: HTMLCanvasElement };
  ball: HTMLCanvasElement[];
  home: SpriteSet;
  away: SpriteSet;
  portrait: HTMLCanvasElement;
  /** Outlined text, cached per string, scale and colours. */
  text(s: string, scale: number, ink: MasterColor, outline: MasterColor): HTMLCanvasElement;
}

function spriteSet(cache: SpriteCache, who: string, heads: Record<HeadFacing, HeadSprite>, look: LookColors): SpriteSet {
  const baked = bakeAll(HARRISON_BODY, heads);
  const palette = resolvePalette(look);
  const set: SpriteSet = { right: {} as SpriteSet['right'], left: {} as SpriteSet['left'] };
  for (const [name, clip] of Object.entries(baked) as [AnimName, BakedClip][]) {
    const f = cache.frames(`${who}/${name}`, () => ({ frames: clip.frames, palette }));
    set.right[name] = f.right;
    set.left[name] = f.left;
  }
  return set;
}

/** Bakes and resolves every image the match needs, once, at boot. */
export function loadGameArt(): GameArt {
  const master = masterPalette();
  const cache = new SpriteCache();
  const L = backyardLayers();
  const goal = goalSprites();
  const texts = new Map<string, HTMLCanvasElement>();
  return {
    layers: { far: toCanvas(L.far, master), mid: toCanvas(L.mid, master), near: toCanvas(L.near, master), ground: toCanvas(L.ground, master) },
    goal: {
      back: toCanvas(goal.back, master),
      front: toCanvas(goal.front, master),
      backFlipped: toCanvas(flipX(goal.back), master),
      frontFlipped: toCanvas(flipX(goal.front), master),
    },
    ball: ballFrames().map(f => toCanvas(f, master)),
    home: spriteSet(cache, 'harrison', HARRISON_HEADS, harrisonLook('home')),
    away: spriteSet(cache, 'max', MAX_HEADS, maxLook()),
    portrait: toCanvas(harrisonPortrait('neutral'), resolvePalette(harrisonLook('home'))),
    text(s, scale, ink, outline) {
      const key = `${s}|${scale}|${ink}|${outline}`;
      let c = texts.get(key);
      if (!c) {
        c = toCanvas(renderText(s, scale), textPalette(ink, outline));
        texts.set(key, c);
      }
      return c;
    },
  };
}
