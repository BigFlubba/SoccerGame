import type { AnimName } from '../art/body/animations';
import { bakeAll, bakeClip, type BakedClip } from '../art/body/bake';
import { clipsFor } from '../art/body/animations';
import { HARRISON_BODY } from '../art/body/proportions';
import { MASTER, TRANSPARENT, hexToRGBA, resolvePalette, type MasterColor, type RGBA, type ResolvedPalette } from '../art/colors';
import { outfitBody, outfitHeads, outfitLook, outfitPortrait } from '../art/harrison/outfit';
import { kitShader } from '../art/harrison/outfitFx';
import type { Expression } from '../art/harrison/portrait';
import type { IndexedImage } from '../art/indexedImage';
import { toCanvas } from '../engine/bitmaps';
import type { SpriteCache } from '../engine/sprites';
import { outfitKey, type Outfit } from '../meta/locker';
import type { HomeSet, SpriteSet } from './art';

const EXPRESSIONS: readonly Expression[] = ['neutral', 'celebrate', 'determined', 'disappointed'];
const MASTER_RGBA = Object.fromEntries(Object.entries(MASTER).map(([k, hex]) => [k, hexToRGBA(hex)])) as Record<MasterColor, RGBA>;

const powered = (set: HomeSet): boolean => set !== 'home';
const formOf = (set: HomeSet) => (set === 'homeGolden' ? 'golden' : 'base');

/**
 * Harrison in any outfit: sprite sets and portraits baked the first time
 * an outfit asks for them and kept, single clips for the Locker Room's
 * try-on, and an animated kit's frame painted live with its shader.
 */
export class HarrisonArt {
  private readonly baked = new Map<string, Record<AnimName, BakedClip>>();
  private readonly sets = new Map<string, SpriteSet>();
  private readonly portraits = new Map<string, Record<Expression, HTMLCanvasElement>>();
  private readonly palettes = new Map<string, ResolvedPalette>();
  private readonly clips = new Map<string, BakedClip>();
  private readonly frames = new Map<string, HTMLCanvasElement>();
  /** One canvas per use, repainted for an animated kit each time it's asked for. */
  private readonly scratch = new Map<string, HTMLCanvasElement>();

  constructor(private readonly cache: SpriteCache) {}

  /** His frames in `o`, with his own heads or the power heads. */
  private bakedFor(o: Outfit, power: boolean): Record<AnimName, BakedClip> {
    const key = `${outfitKey(o)}|${power}`;
    let b = this.baked.get(key);
    if (!b) {
      b = bakeAll(HARRISON_BODY, outfitHeads(o, power), outfitBody(o));
      this.baked.set(key, b);
    }
    return b;
  }

  private palette(o: Outfit, set: HomeSet): ResolvedPalette {
    const key = `${outfitKey(o)}|${formOf(set)}`;
    let p = this.palettes.get(key);
    if (!p) {
      p = resolvePalette(outfitLook(o, formOf(set)));
      this.palettes.set(key, p);
    }
    return p;
  }

  set(o: Outfit, set: HomeSet): SpriteSet {
    const key = `${outfitKey(o)}|${set}`;
    let s = this.sets.get(key);
    if (!s) {
      const palette = this.palette(o, set);
      s = { right: {} as SpriteSet['right'], left: {} as SpriteSet['left'] };
      for (const [name, clip] of Object.entries(this.bakedFor(o, powered(set))) as [AnimName, BakedClip][]) {
        const f = this.cache.frames(`harrison/${key}/${name}`, () => ({ frames: clip.frames, palette }));
        s.right[name] = f.right;
        s.left[name] = f.left;
      }
      this.sets.set(key, s);
    }
    return s;
  }

  portraitsOf(o: Outfit): Record<Expression, HTMLCanvasElement> {
    const key = outfitKey(o);
    let p = this.portraits.get(key);
    if (!p) {
      const palette = this.palette(o, 'home');
      p = Object.fromEntries(EXPRESSIONS.map(e => [e, toCanvas(outfitPortrait(o, e), palette)])) as Record<Expression, HTMLCanvasElement>;
      this.portraits.set(key, p);
    }
    return p;
  }

  /** One frame's logical pixels, facing right. */
  image(o: Outfit, set: HomeSet, clip: AnimName, frame: number): IndexedImage {
    const frames = this.bakedFor(o, powered(set))[clip].frames;
    return frames[Math.min(frame, frames.length - 1)]!;
  }

  /** The frame to draw: the baked canvas, or for an animated kit, a scratch canvas painted with its shader at nowS. */
  canvas(o: Outfit, set: HomeSet, facing: 1 | -1, clip: AnimName, frame: number, nowS: number): HTMLCanvasElement {
    const shader = kitShader(o.kit);
    if (!shader) {
      const frames = this.set(o, set)[facing === 1 ? 'right' : 'left'][clip];
      return frames[Math.min(frame, frames.length - 1)]!;
    }
    return this.paint(`${set}|${facing}`, this.image(o, set, clip, frame), this.palette(o, set), facing, nowS, shader);
  }

  /** Him in `o` from one clip, baked alone: the try-on never waits on a whole set. */
  previewImage(o: Outfit, clip: AnimName, frame: number): IndexedImage {
    const key = `${outfitKey(o)}|${clip}`;
    let c = this.clips.get(key);
    if (!c) {
      c = bakeClip(clipsFor(HARRISON_BODY)[clip], HARRISON_BODY, outfitHeads(o, false), outfitBody(o));
      this.clips.set(key, c);
    }
    return c.frames[Math.min(frame, c.frames.length - 1)]!;
  }

  preview(o: Outfit, clip: AnimName, frame: number, nowS: number): HTMLCanvasElement {
    const img = this.previewImage(o, clip, frame);
    const shader = kitShader(o.kit);
    if (shader) return this.paint('preview', img, this.palette(o, 'home'), 1, nowS, shader);
    const key = `${outfitKey(o)}|${clip}|${frame}`;
    let c = this.frames.get(key);
    if (!c) {
      c = toCanvas(img, this.palette(o, 'home'));
      this.frames.set(key, c);
    }
    return c;
  }

  private paint(key: string, img: IndexedImage, palette: ResolvedPalette, facing: 1 | -1, nowS: number, shader: NonNullable<ReturnType<typeof kitShader>>): HTMLCanvasElement {
    let canvas = this.scratch.get(key);
    if (!canvas) {
      canvas = document.createElement('canvas');
      [canvas.width, canvas.height] = [img.width, img.height];
      this.scratch.set(key, canvas);
    }
    const data = new Uint8ClampedArray(img.width * img.height * 4);
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const id = img.get(x, y);
        if (id === 0) continue;
        const shaded = shader(id, x, y, nowS);
        const dx = facing === 1 ? x : img.width - 1 - x;
        data.set(shaded ? MASTER_RGBA[shaded] : (palette[id] ?? TRANSPARENT), (y * img.width + dx) * 4);
      }
    }
    canvas.getContext('2d')!.putImageData(new ImageData(data, img.width, img.height), 0, 0);
    return canvas;
  }
}
