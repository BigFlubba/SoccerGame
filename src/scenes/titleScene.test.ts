import { describe, expect, it } from 'vitest';
import { recordingAudio } from '../audio/testAudio';
import { DEFAULT_SETTINGS } from '../meta/settings';
import type { GameArt } from './art';
import type { GameContext } from './context';
import { createPressStartScene } from './titleScene';

const context = (audio = recordingAudio()): GameContext => ({ art: {} as GameArt, settings: { ...DEFAULT_SETTINGS }, save: () => {}, audio });

describe('press start sound hint', () => {
  it('shows the sound hint while audio is available but locked', () => {
    const audio = { ...recordingAudio(), unlocked: false };
    expect(createPressStartScene(context(audio)).soundHint).toBe(true);
  });

  it('hides it once sound is on, or when there is no audio at all', () => {
    expect(createPressStartScene(context()).soundHint).toBe(false);
    expect(createPressStartScene(context({ ...recordingAudio(), available: false, unlocked: false })).soundHint).toBe(false);
  });

  it('asks for the crowd to be off', () => {
    const audio = recordingAudio();
    audio.crowd = 'match';
    createPressStartScene(context(audio));
    expect(audio.crowd).toBe('off');
  });
});
