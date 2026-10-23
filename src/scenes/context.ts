import type { Settings } from '../meta/settings';
import type { GameArt } from './art';

/** What every screen shares: the art, the player's settings, and a way to save them. */
export interface GameContext {
  art: GameArt;
  settings: Settings;
  save(s: Settings): void;
}
