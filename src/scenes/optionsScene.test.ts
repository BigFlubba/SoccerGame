import { describe, expect, it } from 'vitest';
import { glyph } from '../art/font';
import { newProfile } from '../meta/profile';
import { DEFAULT_SETTINGS } from '../meta/settings';
import { OPTION_ROWS, changeOption, createOptionsScene, nextDifficulty, optionRow } from './optionsScene';
import type { Scene } from './scene';
import { testContext } from './testContext';
import { frame } from './testInput';

const STEP = 1 / 60;
const BEHIND: Scene = { kind: 'hub', update: () => null, draw: () => {} };

const context = () => testContext();

describe('options', () => {
  it("changes the save's difficulty and saves the save, not the settings", () => {
    const ctx = context();
    const s = createOptionsScene(ctx, () => BEHIND);
    expect(s.kind).toBe('options');
    s.update(frame(['right']), STEP);
    expect(ctx.profile.difficulty).toBe('hard');
    expect(ctx.savedProfiles.at(-1)?.difficulty).toBe('hard');
    s.update(frame(['right']), STEP);
    expect(ctx.profile.difficulty).toBe('easy');
    s.update(frame(['left']), STEP);
    expect(ctx.savedProfiles.map(x => x.difficulty)).toEqual(['hard', 'easy', 'hard']);
    expect(ctx.savedSettings).toEqual([]);
  });

  it('a change lands only in the save being played', () => {
    const other = { ...newProfile(), name: 'OTHER', coins: 50 };
    const ctx = context();
    ctx.saves.write(1, other);
    ctx.slot = 2;
    ctx.saves.write(2, ctx.profile);
    createOptionsScene(ctx, () => BEHIND).update(frame(['right']), STEP);
    expect(ctx.saves.read(1)).toEqual(other);
    expect(ctx.saves.read(2)?.difficulty).toBe('hard');
  });

  it('B goes back and keeps the change', () => {
    const ctx = context();
    const s = createOptionsScene(ctx, () => BEHIND);
    s.update(frame(['left']), STEP);
    expect(s.update(frame(['back']), STEP)).toBe(BEHIND);
    expect(ctx.profile.difficulty).toBe('easy');
  });

  it('Start or Esc goes back too, but Enter does not', () => {
    expect(createOptionsScene(context(), () => BEHIND).update(frame(['pause']), STEP)).toBe(BEHIND);
    expect(createOptionsScene(context(), () => BEHIND).update(frame(['pause', 'back']), STEP)).toBe(BEHIND);
    expect(createOptionsScene(context(), () => BEHIND).update(frame(['pause', 'confirm']), STEP)).toBeNull();
  });

  it('shows the difficulty row with arrows the font can draw', () => {
    expect(optionRow('DIFFICULTY', { ...DEFAULT_SETTINGS }, 'normal')).toBe('DIFFICULTY  < NORMAL >');
    expect(optionRow('DIFFICULTY', { ...DEFAULT_SETTINGS }, 'easy')).toBe('DIFFICULTY  < EASY >');
    for (const ch of '<>') expect(glyph(ch)).not.toBe(glyph('?'));
  });

  it('shows every row', () => {
    expect(OPTION_ROWS).toEqual(['DIFFICULTY', 'MUSIC', 'SFX', 'RUMBLE']);
    expect(optionRow('MUSIC', { ...DEFAULT_SETTINGS }, 'normal')).toBe('MUSIC  < 6 >');
    expect(optionRow('SFX', { ...DEFAULT_SETTINGS }, 'normal')).toBe('SFX  < 8 >');
    expect(optionRow('RUMBLE', { ...DEFAULT_SETTINGS }, 'normal')).toBe('RUMBLE  < ON >');
    expect(optionRow('RUMBLE', { ...DEFAULT_SETTINGS, rumble: false }, 'normal')).toBe('RUMBLE  < OFF >');
  });

  it('up and down move over the four rows, wrapping', () => {
    const ctx = context();
    const s = createOptionsScene(ctx, () => BEHIND);
    s.update(frame(['down']), STEP);
    s.update(frame(['right']), STEP);
    expect(ctx.settings.musicVolume).toBe(7);
    s.update(frame(['down']), STEP);
    s.update(frame(['left']), STEP);
    expect(ctx.settings.sfxVolume).toBe(7);
    s.update(frame(['down']), STEP);
    s.update(frame(['down']), STEP);
    s.update(frame(['right']), STEP);
    expect(ctx.profile.difficulty).toBe('hard');
    s.update(frame(['up']), STEP);
    s.update(frame(['left']), STEP);
    expect(ctx.settings.rumble).toBe(false);
  });

  it('volumes stop at 0 and 10', () => {
    for (const row of ['MUSIC', 'SFX'] as const) {
      const key = row === 'MUSIC' ? 'musicVolume' : 'sfxVolume';
      expect(changeOption({ ...DEFAULT_SETTINGS, [key]: 10 }, row, 1)[key]).toBe(10);
      expect(changeOption({ ...DEFAULT_SETTINGS, [key]: 0 }, row, -1)[key]).toBe(0);
      expect(changeOption({ ...DEFAULT_SETTINGS, [key]: 5 }, row, 1)[key]).toBe(6);
    }
  });

  it('left or right toggles rumble', () => {
    expect(changeOption({ ...DEFAULT_SETTINGS }, 'RUMBLE', 1).rumble).toBe(false);
    expect(changeOption({ ...DEFAULT_SETTINGS, rumble: false }, 'RUMBLE', -1).rumble).toBe(true);
  });

  it('difficulty wraps both ways', () => {
    expect(nextDifficulty('hard', 1)).toBe('easy');
    expect(nextDifficulty('easy', -1)).toBe('hard');
    expect(nextDifficulty('normal', 1)).toBe('hard');
  });

  it('turning rumble on gives a tap pulse', () => {
    const ctx = context();
    ctx.settings = { ...DEFAULT_SETTINGS, rumble: false };
    const s = createOptionsScene(ctx, () => BEHIND);
    s.update(frame(['up']), STEP);
    s.update(frame(['right']), STEP);
    expect(ctx.settings.rumble).toBe(true);
    expect(ctx.rumble.pulses).toEqual(['tap']);
    s.update(frame(['right']), STEP);
    expect(ctx.rumble.pulses).toEqual(['tap']);
  });

  it('every change saves once, with the new settings', () => {
    const ctx = context();
    const s = createOptionsScene(ctx, () => BEHIND);
    s.update(frame(['down']), STEP);
    expect(ctx.savedSettings).toHaveLength(0);
    s.update(frame(['right']), STEP);
    expect(ctx.savedSettings).toEqual([{ ...DEFAULT_SETTINGS, musicVolume: 7 }]);
  });
});

describe('options: save code', () => {
  it('from the Hub, Options has SAVE CODE last, and no RESET SAVE', () => {
    const ctx = testContext();
    const s = createOptionsScene(ctx, () => BEHIND, true);
    expect(s.rows).toEqual([...OPTION_ROWS, 'SAVE CODE']);
    s.update(frame(['up']), STEP);
    expect(s.update(frame(['confirm']), STEP)?.kind).toBe('saveCode');
  });

  it('from the pause menu, it does not', () => {
    const s = createOptionsScene(testContext(), () => BEHIND);
    expect(s.rows).toEqual([...OPTION_ROWS]);
    s.update(frame(['up']), STEP);
    expect(s.update(frame(['confirm']), STEP)).toBeNull();
  });

  it('backing out of the save code screen returns to Options from the Hub, on the same row', () => {
    const ctx = testContext();
    const s = createOptionsScene(ctx, () => BEHIND, true);
    s.update(frame(['up']), STEP);
    const code = s.update(frame(['confirm']), STEP)!;
    const back = code.update(frame(['back']), STEP) as ReturnType<typeof createOptionsScene>;
    expect(back.kind).toBe('options');
    expect(back.rows).toContain('SAVE CODE');
    expect(back.row).toBe(4);
  });
});
