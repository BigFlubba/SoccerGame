import type { GameAudio } from '../audio/synth';
import type { Settings } from '../meta/settings';
import type { GameArt } from './art';

/** What every screen shares: the art, the player's settings, a way to save them, and the sound. */
export interface GameContext {
  art: GameArt;
  settings: Settings;
  save(s: Settings): void;
  audio: GameAudio;
}
