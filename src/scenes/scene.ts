import type { InputFrame } from '../engine/input';

export interface Scene {
  /** One fixed step. Returns the scene to switch to, or null to stay. */
  update(input: InputFrame, dt: number): Scene | null;
  draw(g: CanvasRenderingContext2D, nowS: number): void;
  /** The tab was hidden. */
  onHidden?(): void;
}
