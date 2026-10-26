import { describe, expect, it } from 'vitest';
import { glyph } from '../art/font';
import { DEFAULT_SETTINGS } from '../meta/settings';
import { OPTION_ROWS, changeOption, createOptionsScene, optionRow } from './optionsScene';
import type { Scene } from './scene';
import { testContext } from './testContext';
import { frame } from './testInput';

const STEP = 1 / 60;
const BEHIND: Scene = { kind: 'hub', update: () => null, draw: () => {} };

const context = () => testContext();

describe('options', () => {
  it('changes and saves difficulty', () => {
    const ctx = context();
    const s = createOptionsScene(ctx, () => BEHIND);
    expect(s.kind).toBe('options');
    s.update(frame(['right']), STEP);
    expect(ctx.settings.difficulty).toBe('hard');
    expect(ctx.savedSettings.at(-1)).toEqual({ ...DEFAULT_SETTINGS, difficulty: 'hard' });
    s.update(frame(['right']), STEP);
    expect(ctx.settings.difficulty).toBe('easy');
    s.update(frame(['left']), STEP);
    expect(ctx.savedSettings.map(x => x.difficulty)).toEqual(['hard', 'easy', 'hard']);
  });

  it('B goes back and keeps the change', () => {
    const ctx = context();
    const s = createOptionsScene(ctx, () => BEHIND);
    s.update(frame(['left']), STEP);
    expect(s.update(frame(['back']), STEP)).toBe(BEHIND);
    expect(ctx.settings.difficulty).toBe('easy');
  });

  it('Start or Esc goes back too, but Enter does not', () => {
    expect(createOptionsScene(context(), () => BEHIND).update(frame(['pause']), STEP)).toBe(BEHIND);
    expect(createOptionsScene(context(), () => BEHIND).update(frame(['pause', 'back']), STEP)).toBe(BEHIND);
    expect(createOptionsScene(context(), () => BEHIND).update(frame(['pause', 'confirm']), STEP)).toBeNull();
  });

  it('shows the difficulty row with arrows the font can draw', () => {
    expect(optionRow('DIFFICULTY', { ...DEFAULT_SETTINGS })).toBe('DIFFICULTY  < NORMAL >');
    for (const ch of '<>') expect(glyph(ch)).not.toBe(glyph('?'));
  });

  it('shows every row', () => {
    expect(OPTION_ROWS).toEqual(['DIFFICULTY', 'MUSIC', 'SFX', 'RUMBLE']);
    expect(optionRow('MUSIC', { ...DEFAULT_SETTINGS })).toBe('MUSIC  < 6 >');
    expect(optionRow('SFX', { ...DEFAULT_SETTINGS })).toBe('SFX  < 8 >');
    expect(optionRow('RUMBLE', { ...DEFAULT_SETTINGS })).toBe('RUMBLE  < ON >');
    expect(optionRow('RUMBLE', { ...DEFAULT_SETTINGS, rumble: false })).toBe('RUMBLE  < OFF >');
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
    expect(ctx.settings.difficulty).toBe('hard');
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
    expect(changeOption({ ...DEFAULT_SETTINGS, difficulty: 'hard' }, 'DIFFICULTY', 1).difficulty).toBe('easy');
    expect(changeOption({ ...DEFAULT_SETTINGS, difficulty: 'easy' }, 'DIFFICULTY', -1).difficulty).toBe('hard');
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

describe('options: save code and reset', () => {
  it('from the Hub, Options has SAVE CODE and RESET SAVE', () => {
    const ctx = testContext();
    const s = createOptionsScene(ctx, () => BEHIND, true);
    expect(s.rows).toEqual([...OPTION_ROWS, 'SAVE CODE', 'RESET SAVE']);
    s.update(frame(['up']), STEP);
    s.update(frame(['up']), STEP);
    expect(s.update(frame(['confirm']), STEP)?.kind).toBe('saveCode');
    const r = createOptionsScene(ctx, () => BEHIND, true);
    r.update(frame(['up']), STEP);
    expect(r.update(frame(['confirm']), STEP)?.kind).toBe('reset');
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
    s.update(frame(['up']), STEP);
    const code = s.update(frame(['confirm']), STEP)!;
    const back = code.update(frame(['back']), STEP) as ReturnType<typeof createOptionsScene>;
    expect(back.kind).toBe('options');
    expect(back.rows).toContain('SAVE CODE');
    expect(back.row).toBe(4);
  });
});
