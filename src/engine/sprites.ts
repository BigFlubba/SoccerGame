import type { ResolvedPalette } from '../art/colors';
import { flipX, type IndexedImage } from '../art/indexedImage';
import { toCanvas } from './bitmaps';

export interface FacingFrames {
  right: HTMLCanvasElement[];
  left: HTMLCanvasElement[];
}

/** Resolves frame sets to canvases once, facing both ways, keyed by name. */
export class SpriteCache {
  private readonly cache = new Map<string, FacingFrames>();

  frames(key: string, make: () => { frames: IndexedImage[]; palette: ResolvedPalette }): FacingFrames {
    let f = this.cache.get(key);
    if (!f) {
      const { frames, palette } = make();
      f = { right: frames.map(i => toCanvas(i, palette)), left: frames.map(i => toCanvas(flipX(i), palette)) };
      this.cache.set(key, f);
    }
    return f;
  }
}
