import { toRGBA, type ResolvedPalette } from '../art/colors';
import type { IndexedImage } from '../art/indexedImage';

/** Resolves an indexed image into a canvas ready for drawImage. */
export function toCanvas(img: IndexedImage, palette: ResolvedPalette): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.putImageData(new ImageData(toRGBA(img, palette), img.width, img.height), 0, 0);
  return canvas;
}
