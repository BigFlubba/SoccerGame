import { M } from './colors';
import { IndexedImage } from './indexedImage';
import { addOutline } from './raster';

export const BALL_R = 3;
const SIZE = 2 * BALL_R + 1;
const ROTATION_FRAMES = 4;
/** Patch centres sit this far apart, so one leaves as the next arrives. */
const PATCH_SPACING = 4;

const inBall = (x: number, y: number) => (x - BALL_R) ** 2 + (y - BALL_R) ** 2 <= BALL_R * BALL_R - 1;

/**
 * Four rolling frames of a 7×7 ball in M ids: white panels with dark
 * patches that slide across as it turns, outlined, shaded low on the right.
 */
export function ballFrames(): IndexedImage[] {
  return Array.from({ length: ROTATION_FRAMES }, (_, i) => {
    const img = new IndexedImage(SIZE, SIZE);
    const centres = [1 + i - PATCH_SPACING, 1 + i, 1 + i + PATCH_SPACING];
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (!inBall(x, y)) continue;
        const patch = centres.some(cx => Math.abs(x - cx) + Math.abs(y - BALL_R) <= 1);
        const shade = x + y >= 2 * BALL_R + 2;
        img.set(x, y, patch ? M.black : shade ? M.silver : M.white);
      }
    }
    addOutline(img, M.outline);
    return img;
  });
}
