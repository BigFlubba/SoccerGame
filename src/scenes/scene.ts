import type { InputFrame } from '../engine/input';

export type SceneKind = 'pressStart' | 'hub' | 'roadMap' | 'venue' | 'vs' | 'match' | 'results' | 'shop' | 'help' | 'options' | 'saveCode' | 'newSave' | 'deleteSave' | 'saves' | 'lockerRoom';

export interface Scene {
  /** Which screen this is, for routing tests and the dev playtest hook. */
  readonly kind?: SceneKind;
  /** One fixed step. Returns the scene to switch to, or null to stay. */
  update(input: InputFrame, dt: number): Scene | null;
  draw(g: CanvasRenderingContext2D, nowS: number): void;
  /** The tab was hidden. */
  onHidden?(): void;
  /** The keyboard types text instead of acting (InputFrame.typed), while this is true. */
  wantsText?: boolean;
}
