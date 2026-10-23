import type { GameAudio } from '../audio/synth';
import type { Rumble } from '../engine/rumble';
import type { Settings } from '../meta/settings';
import type { GameArt } from './art';

/** What every screen shares: the art, the player's settings, a way to save them, the sound and the rumble. */
export interface GameContext {
  art: GameArt;
  settings: Settings;
  save(s: Settings): void;
  audio: GameAudio;
  rumble: Rumble;
}
