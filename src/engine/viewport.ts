/** Internal game resolution. */
export const BASE_W = 320;
export const BASE_H = 180;
/** Smallest scale ever returned, so a zero-size window never divides by 0. */
const MIN_SCALE = 0.01;

/** Where the game canvas lands in the window, all in device pixels. */
export interface Viewport {
  scale: number;
  x: number;
  y: number;
  deviceW: number;
  deviceH: number;
}

/**
 * Largest whole-number scale that fits, worked out in device pixels so every
 * game pixel is the same size even at fractional devicePixelRatio. Windows
 * smaller than the game fall back to a fractional fit, and even a zero-size
 * window gets MIN_SCALE rather than 0.
 */
export function computeViewport(cssW: number, cssH: number, dpr: number): Viewport {
  const deviceW = Math.round(cssW * dpr);
  const deviceH = Math.round(cssH * dpr);
  const fit = Math.min(deviceW / BASE_W, deviceH / BASE_H);
  const scale = fit >= 1 ? Math.floor(fit) : Math.max(fit, MIN_SCALE);
  return {
    scale,
    x: Math.floor((deviceW - BASE_W * scale) / 2),
    y: Math.floor((deviceH - BASE_H * scale) / 2),
    deviceW,
    deviceH,
  };
}
