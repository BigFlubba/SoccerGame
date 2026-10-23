import { describe, expect, it } from 'vitest';
import { glyph } from '../art/font';
import { DEFAULT_SETTINGS, type Settings } from '../meta/settings';
import type { GameArt } from './art';
import type { GameContext } from './context';
import { OPTION_ROWS, changeOption, createOptionsScene, optionRow } from './optionsScene';
import type { Scene } from './scene';
import { frame } from './testInput';

const STEP = 1 / 60;
const BEHIND: Scene = { kind: 'titleMenu', update: () => null, draw: () => {} };

function context(): GameContext & { saved: Settings[] } {
  const saved: Settings[] = [];
  const ctx: GameContext & { saved: Settings[] } = {
    art: {} as GameArt,
    settings: { ...DEFAULT_SETTINGS },
    saved,
    save(s) {
      saved.push(s);
      ctx.settings = s;
    },
  };
  return ctx;
}

describe('options', () => {
  it('changes and saves difficulty', () => {
    const ctx = context();
    const s = createOptionsScene(ctx, () => BEHIND);
    expect(s.kind).toBe('options');
    s.update(frame(['right']), STEP);
    expect(ctx.settings.difficulty).toBe('hard');
    expect(ctx.saved.at(-1)).toEqual({ ...DEFAULT_SETTINGS, difficulty: 'hard' });
    s.update(frame(['right']), STEP);
    expect(ctx.settings.difficulty).toBe('easy');
    s.update(frame(['left']), STEP);
    expect(ctx.saved.map(x => x.difficulty)).toEqual(['hard', 'easy', 'hard']);
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

  it('every change saves once, with the new settings', () => {
    const ctx = context();
    const s = createOptionsScene(ctx, () => BEHIND);
    s.update(frame(['down']), STEP);
    expect(ctx.saved).toHaveLength(0);
    s.update(frame(['right']), STEP);
    expect(ctx.saved).toEqual([{ ...DEFAULT_SETTINGS, musicVolume: 7 }]);
  });
});
