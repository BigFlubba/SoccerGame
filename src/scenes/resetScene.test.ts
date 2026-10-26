import { describe, expect, it } from 'vitest';
import { newProfile } from '../meta/profile';
import { encodeSaveCode } from '../meta/saveCode';
import { createResetScene } from './resetScene';
import type { Scene } from './scene';
import { testContext } from './testContext';
import { frame } from './testInput';

const STEP = 1 / 60;
const BEHIND: Scene = { kind: 'options', update: () => null, draw: () => {} };
const SOME = { ...newProfile(), coins: 300, level: 4 };

describe('reset save', () => {
  it('shows the current code first, in case', () => {
    const s = createResetScene(testContext({ profile: SOME }), () => BEHIND);
    expect(s.code).toBe(encodeSaveCode(SOME));
  });

  it('NO is pre-selected', () => {
    const ctx = testContext({ profile: SOME });
    const s = createResetScene(ctx, () => BEHIND);
    expect(s.menu).toEqual({ items: ['NO', 'YES'], index: 0 });
    expect(s.update(frame(['confirm']), STEP)).toBe(BEHIND);
    expect(ctx.savedProfiles).toEqual([]);
    expect(ctx.profile).toEqual(SOME);
  });

  it('YES saves a fresh profile and keeps the settings', () => {
    const ctx = testContext({ profile: SOME, settings: { version: 2, difficulty: 'hard', musicVolume: 3, sfxVolume: 4, rumble: false } });
    const s = createResetScene(ctx, () => BEHIND);
    s.update(frame(['down']), STEP);
    expect(s.update(frame(['confirm']), STEP)).toBe(BEHIND);
    expect(ctx.savedProfiles).toEqual([newProfile()]);
    expect(ctx.settings).toMatchObject({ difficulty: 'hard', musicVolume: 3 });
    expect(ctx.savedSettings).toEqual([]);
  });

  it('B backs out with nothing changed', () => {
    const ctx = testContext({ profile: SOME });
    const s = createResetScene(ctx, () => BEHIND);
    s.update(frame(['down']), STEP);
    expect(s.update(frame(['back']), STEP)).toBe(BEHIND);
    expect(ctx.savedProfiles).toEqual([]);
  });
});
