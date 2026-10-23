import type { IndexedImage } from './indexedImage';

/** Drawing helpers for scenery painted in M (master colour) ids. */

export function fillRect(img: IndexedImage, x: number, y: number, w: number, h: number, id: number): void {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) img.set(xx, yy, id);
}

/** A 50 % checkerboard of `a` and `b`, for soft pixel-art gradients. */
export function ditherRect(img: IndexedImage, x: number, y: number, w: number, h: number, a: number, b: number): void {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) img.set(xx, yy, (xx + yy) % 2 === 0 ? a : b);
}

export function fillCircle(img: IndexedImage, cx: number, cy: number, r: number, id: number): void {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r) img.set(cx + x, cy + y, id);
}

/** A triangle roof: apex at (cx, top), base from x0 to x1 on row `bottom`. */
export function fillRoof(img: IndexedImage, x0: number, x1: number, cx: number, top: number, bottom: number, id: number): void {
  for (let y = top; y <= bottom; y++) {
    const t = (y - top) / Math.max(1, bottom - top);
    fillRect(img, Math.round(cx + (x0 - cx) * t), y, Math.round((x1 - x0) * t) + 1, 1, id);
  }
}
