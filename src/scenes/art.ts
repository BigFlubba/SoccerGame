import { ballFrames } from '../art/ball';
import type { AnimName } from '../art/body/animations';
import { bakeAll, type BakedClip } from '../art/body/bake';
import type { HeadSprite } from '../art/body/head';
import type { HeadFacing } from '../art/body/pose';
import { HARRISON_BODY } from '../art/body/proportions';
import { masterPalette, resolvePalette, type LookColors, type MasterColor, type ResolvedPalette } from '../art/colors';
import { renderText, textPalette } from '../art/font';
import { buttonGlyph, type ButtonName } from '../art/glyphs';
import { HARRISON_HEADS, HARRISON_POWER_HEADS } from '../art/harrison/head';
import { harrisonLook } from '../art/harrison/look';
import { harrisonPortrait, type Expression } from '../art/harrison/portrait';
import { MAX_HEADS, maxLook } from '../art/opponents/max';
import { backyardLayers, goalSprites, type GoalArt, type VenueLayers } from '../art/venues/backyard';
import { toCanvas } from '../engine/bitmaps';
import { SpriteCache } from '../engine/sprites';

export interface SpriteSet {
  right: Record<AnimName, HTMLCanvasElement[]>;
  left: Record<AnimName, HTMLCanvasElement[]>;
}

/** A goal's sprites, placed at project(lineX, 0, 0, cam) + origin. */
export interface GoalCanvases {
  farNet: HTMLCanvasElement;
  nearNet: HTMLCanvasElement;
  nearPost: HTMLCanvasElement;
  farPost: HTMLCanvasElement;
  origin: { x: number; y: number };
}

export interface GameArt {
  layers: Record<keyof VenueLayers, HTMLCanvasElement>;
  goal: Record<'left' | 'right', GoalCanvases>;
  ball: HTMLCanvasElement[];
  /** Controller button pictures, for Help. */
  buttons: Record<ButtonName, HTMLCanvasElement>;
  home: SpriteSet;
  /** Harrison with his hair lifted by the power-up, in his own colours... */
  homePower: SpriteSet;
  /** ...and in Golden Form's gold. */
  homeGolden: SpriteSet;
  away: SpriteSet;
  /** Harrison's portrait in each expression, in the home kit. */
  portraits: Record<Expression, HTMLCanvasElement>;
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

function goalCanvases(g: GoalArt, palette: ResolvedPalette): GoalCanvases {
  return { farNet: toCanvas(g.farNet, palette), nearNet: toCanvas(g.nearNet, palette), nearPost: toCanvas(g.nearPost, palette), farPost: toCanvas(g.farPost, palette), origin: g.origin };
}

const BUTTONS: readonly ButtonName[] = ['A', 'B', 'X', 'Y', 'RT', 'START'];
const EXPRESSIONS: readonly Expression[] = ['neutral', 'celebrate', 'determined', 'disappointed'];

/** Bakes and resolves every image the match needs, once, at boot. */
export function loadGameArt(): GameArt {
  const master = masterPalette();
  const cache = new SpriteCache();
  const L = backyardLayers();
  const texts = new Map<string, HTMLCanvasElement>();
  return {
    layers: { far: toCanvas(L.far, master), mid: toCanvas(L.mid, master), near: toCanvas(L.near, master), ground: toCanvas(L.ground, master) },
    goal: { left: goalCanvases(goalSprites('left'), master), right: goalCanvases(goalSprites('right'), master) },
    ball: ballFrames().map(f => toCanvas(f, master)),
    buttons: Object.fromEntries(BUTTONS.map(b => [b, toCanvas(buttonGlyph(b), master)])) as Record<ButtonName, HTMLCanvasElement>,
    home: spriteSet(cache, 'harrison', HARRISON_HEADS, harrisonLook('home')),
    homePower: spriteSet(cache, 'harrison-power', HARRISON_POWER_HEADS, harrisonLook('home')),
    homeGolden: spriteSet(cache, 'harrison-golden', HARRISON_POWER_HEADS, harrisonLook('home', 'golden')),
    away: spriteSet(cache, 'max', MAX_HEADS, maxLook()),
    portraits: Object.fromEntries(EXPRESSIONS.map(e => [e, toCanvas(harrisonPortrait(e), resolvePalette(harrisonLook('home')))])) as Record<Expression, HTMLCanvasElement>,
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
