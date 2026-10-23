/** Something drawn on the pitch, at a depth. */
export interface Drawable {
  z: number;
  draw(g: CanvasRenderingContext2D): void;
}

/** Painter's order: far (high z) first, so nearer things cover them. Ties keep their input order. */
export function depthSorted(items: readonly Drawable[]): Drawable[] {
  return [...items].sort((a, b) => b.z - a.z);
}
