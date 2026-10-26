import { recordingAudio } from '../audio/testAudio';
import { recordingRumble } from '../engine/testRumble';
import { newProfile, type Profile } from '../meta/profile';
import { DEFAULT_SETTINGS, type Settings } from '../meta/settings';
import type { GameArt } from './art';
import type { GameContext } from './context';

export const TEST_TODAY = '2026-10-23';

export type TestContext = GameContext & {
  audio: ReturnType<typeof recordingAudio>;
  rumble: ReturnType<typeof recordingRumble>;
  /** Every settings save, in order. */
  savedSettings: Settings[];
  /** Every profile save, in order. */
  savedProfiles: Profile[];
  /** Every clipboard copy, in order. */
  copied: string[];
};

/**
 * A context for scene tests: no art (update() never draws), default
 * settings, a new profile, recording audio and rumble, and a fixed today.
 * Saves update the context, as the game's do, and are recorded.
 */
export function testContext(over: Partial<Pick<TestContext, 'art' | 'settings' | 'audio' | 'rumble' | 'profile' | 'today'>> = {}): TestContext {
  const ctx: TestContext = {
    art: {} as GameArt,
    settings: { ...DEFAULT_SETTINGS },
    audio: recordingAudio(),
    rumble: recordingRumble(),
    profile: newProfile(),
    today: () => TEST_TODAY,
    ...over,
    savedSettings: [],
    savedProfiles: [],
    copied: [],
    async copyText(s) {
      ctx.copied.push(s);
      return true;
    },
    save(s) {
      ctx.savedSettings.push(s);
      ctx.settings = s;
    },
    saveProfile(p) {
      ctx.savedProfiles.push(p);
      ctx.profile = p;
    },
  };
  return ctx;
}
