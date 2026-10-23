import type { IndexedImage } from './indexedImage';

export interface Point {
  x: number;
  y: number;
}

/**
 * Draws a thick line by stamping a width×width square brush at each
 * Bresenham step. `color(t)` picks the colour, with t = 0 at `a` and 1 at `b`.
 */
export function drawSegment(
  img: IndexedImage,
  a: Point,
  b: Point,
  width: number,
  color: (t: number) => number,
): void {
  let x = Math.round(a.x);
  let y = Math.round(a.y);
  const x1 = Math.round(b.x);
  const y1 = Math.round(b.y);
  const dx = Math.abs(x1 - x);
  const dy = -Math.abs(y1 - y);
  const sx = x < x1 ? 1 : -1;
  const sy = y < y1 ? 1 : -1;
  const steps = Math.max(dx, -dy);
  const lo = Math.floor((width - 1) / 2);
  const hi = Math.ceil((width - 1) / 2);
  let err = dx + dy;

  for (let step = 0; ; step++) {
    const c = color(steps === 0 ? 0 : step / steps);
    for (let by = y - lo; by <= y + hi; by++) {
      for (let bx = x - lo; bx <= x + hi; bx++) img.set(bx, by, c);
    }
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

/** Even-odd scanline fill, sampling pixel centres. */
export function fillPolygon(img: IndexedImage, pts: readonly Point[], color: number): void {
  if (pts.length < 3) return;
  const minY = Math.max(0, Math.floor(Math.min(...pts.map(p => p.y))));
  const maxY = Math.min(img.height - 1, Math.ceil(Math.max(...pts.map(p => p.y))));
  for (let y = minY; y <= maxY; y++) {
    const cy = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]!;
      const q = pts[(i + 1) % pts.length]!;
      if (p.y <= cy !== q.y <= cy) xs.push(p.x + ((cy - p.y) / (q.y - p.y)) * (q.x - p.x));
    }
    xs.sort((m, n) => m - n);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      for (let x = Math.ceil(xs[i]! - 0.5); x + 0.5 < xs[i + 1]!; x++) img.set(x, y, color);
    }
  }
}

/** Turns every transparent pixel touching (4-neighbour) a non-outline pixel into `outline`. */
export function addOutline(img: IndexedImage, outline: number): void {
  const src = img.clone();
  const solid = (x: number, y: number) => {
    const c = src.get(x, y);
    return c !== 0 && c !== outline;
  };
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (src.get(x, y) !== 0) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) img.set(x, y, outline);
    }
  }
}

export function opaqueBounds(img: IndexedImage): { x: number; y: number; w: number; h: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.get(x, y) === 0) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (minX === Infinity) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
