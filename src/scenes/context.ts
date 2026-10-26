import type { GameAudio } from '../audio/synth';
import type { Rumble } from '../engine/rumble';
import type { Profile } from '../meta/profile';
import type { Settings } from '../meta/settings';
import type { GameArt } from './art';

/** What every screen shares: the art, the player's settings and profile, ways to save them, the sound, the rumble and the date. */
export interface GameContext {
  art: GameArt;
  settings: Settings;
  save(s: Settings): void;
  /** Harrison's progress. */
  profile: Profile;
  /** Sets `profile` and stores it at once. */
  saveProfile(p: Profile): void;
  /** The local date, 'YYYY-MM-DD', for the first-win-of-the-day bonus. */
  today(): string;
  audio: GameAudio;
  rumble: Rumble;
  /** Puts text on the clipboard; false if the browser refuses or has no clipboard. Never rejects. */
  copyText(s: string): Promise<boolean>;
}
