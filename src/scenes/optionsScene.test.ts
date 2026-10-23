import { describe, expect, it } from 'vitest';
import { glyph } from '../art/font';
import type { Settings } from '../meta/settings';
import type { GameArt } from './art';
import type { GameContext } from './context';
import { createOptionsScene, difficultyRow } from './optionsScene';
import type { Scene } from './scene';
import { frame } from './testInput';

const STEP = 1 / 60;
const BEHIND: Scene = { kind: 'titleMenu', update: () => null, draw: () => {} };

function context(): GameContext & { saved: Settings[] } {
  const saved: Settings[] = [];
  const ctx: GameContext & { saved: Settings[] } = {
    art: {} as GameArt,
    settings: { version: 1, difficulty: 'normal' },
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
    expect(ctx.saved.at(-1)).toEqual({ version: 1, difficulty: 'hard' });
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

  it('shows the difficulty row with arrows the font can draw', () => {
    expect(difficultyRow('normal')).toBe('DIFFICULTY  < NORMAL >');
    for (const ch of '<>') expect(glyph(ch)).not.toBe(glyph('?'));
  });
});
