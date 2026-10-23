import { describe, expect, it } from 'vitest';
import { recordingAudio } from '../audio/testAudio';
import { testContext } from './testContext';
import { frame } from './testInput';
import { createPressStartScene } from './titleScene';

const context = (audio = recordingAudio()) => testContext({ audio });

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

  it('Esc on Press Start does nothing; Enter and Start still go on', () => {
    expect(createPressStartScene(context()).update(frame(['pause', 'back']), 1 / 60)).toBeNull();
    expect(createPressStartScene(context()).update(frame(['pause', 'confirm']), 1 / 60)).not.toBeNull();
    expect(createPressStartScene(context()).update(frame(['pause']), 1 / 60)).not.toBeNull();
  });
});
