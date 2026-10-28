import type { GameAudio } from '../audio/synth';
import type { Rumble } from '../engine/rumble';
import type { Profile } from '../meta/profile';
import type { SaveSlots } from '../meta/saveSlots';
import type { Settings } from '../meta/settings';
import type { GameArt } from './art';

/** What every screen shares: the art, the player's settings and profile, ways to save them, the sound, the rumble and the date. */
export interface GameContext {
  art: GameArt;
  settings: Settings;
  save(s: Settings): void;
  /** Harrison's progress: the save being played. */
  profile: Profile;
  /** The slot being played, 1 to SLOT_COUNT; saveProfile stores it here. */
  slot: number;
  /** Every save slot. */
  saves: SaveSlots;
  /** Sets `profile` and stores it at once, in `slot`. */
  saveProfile(p: Profile): void;
  /** The local date, 'YYYY-MM-DD', for the first-win-of-the-day bonus. */
  today(): string;
  audio: GameAudio;
  rumble: Rumble;
  /** Puts text on the clipboard; false if the browser refuses or has no clipboard. Never rejects. */
  copyText(s: string): Promise<boolean>;
}

/** Plays `p` in `slot`: switches the slot first, so the save is stored in its own, then remembers it as the last played. */
export function openSave(ctx: GameContext, slot: number, p: Profile): void {
  ctx.slot = slot;
  ctx.saveProfile(p);
  ctx.saves.setLastPlayed(slot);
}
