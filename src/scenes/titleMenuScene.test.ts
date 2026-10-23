import { describe, expect, it } from 'vitest';
import { DIFFICULTY } from '../game/ai';
import { DEFAULT_SETTINGS, type Settings } from '../meta/settings';
import type { GameArt } from './art';
import type { GameContext } from './context';
import type { MatchScene } from './matchScene';
import { frame } from './testInput';
import { TITLE_MENU_ITEMS, createTitleMenuScene } from './titleMenuScene';
import { createPressStartScene } from './titleScene';

const STEP = 1 / 60;
/** update() never touches the art, so tests can run without a DOM. */
const NO_ART = {} as GameArt;

function context(difficulty: Settings['difficulty'] = 'normal'): GameContext {
  return { art: NO_ART, settings: { ...DEFAULT_SETTINGS, difficulty }, save: () => {} };
}

describe('press start screen', () => {
  it('Start, A or Enter opens the title menu', () => {
    for (const action of ['pause', 'confirm'] as const) {
      expect(createPressStartScene(context()).update(frame([action]), STEP)?.kind, action).toBe('titleMenu');
    }
  });

  it('waits for a press', () => {
    const s = createPressStartScene(context());
    expect(s.update(frame([], ['confirm']), STEP)).toBeNull();
    expect(s.update(frame(['shoot']), STEP)).toBeNull();
  });
});

describe('title menu', () => {
  it('title menu has START GAME, OPTIONS, HELP and no quit', () => {
    expect(TITLE_MENU_ITEMS).toEqual(['START GAME', 'OPTIONS', 'HELP']);
  });

  it('START GAME starts a match at the saved difficulty', () => {
    for (const difficulty of ['easy', 'hard'] as const) {
      const next = createTitleMenuScene(context(difficulty)).update(frame(['confirm']), STEP) as MatchScene;
      expect(next.kind).toBe('match');
      expect(next.world.aimErrorDeg.away).toBe(DIFFICULTY[difficulty].aimErrorDeg);
    }
  });

  it('B on the title menu goes back to Press Start', () => {
    expect(createTitleMenuScene(context()).update(frame(['back']), STEP)?.kind).toBe('pressStart');
  });

  it('Start on the title menu starts the selected item, like A', () => {
    expect(createTitleMenuScene(context()).update(frame(['pause']), STEP)?.kind).toBe('match');
    expect(createTitleMenuScene(context(), 2).update(frame(['pause']), STEP)?.kind).toBe('help');
  });

  it('Esc on the title menu goes back to Press Start', () => {
    expect(createTitleMenuScene(context()).update(frame(['pause', 'back']), STEP)?.kind).toBe('pressStart');
  });

  it('Enter on the title menu still confirms', () => {
    expect(createTitleMenuScene(context()).update(frame(['pause', 'confirm']), STEP)?.kind).toBe('match');
  });

  it('HELP opens Help, and B there comes back to the title menu on HELP', () => {
    const s = createTitleMenuScene(context());
    s.update(frame(['up']), STEP);
    const help = s.update(frame(['confirm']), STEP);
    expect(help?.kind).toBe('help');
    const back = help!.update(frame(['back']), STEP);
    expect(back?.kind).toBe('titleMenu');
    expect(back!.update(frame(['confirm']), STEP)?.kind).toBe('help');
  });

  it('OPTIONS opens Options, and B there comes back to the title menu on OPTIONS', () => {
    const s = createTitleMenuScene(context());
    s.update(frame(['down']), STEP);
    const options = s.update(frame(['confirm']), STEP);
    expect(options?.kind).toBe('options');
    const back = options!.update(frame(['back']), STEP);
    expect(back?.kind).toBe('titleMenu');
    expect(back!.update(frame(['confirm']), STEP)?.kind).toBe('options');
  });

  it('up and down move the choice, wrapping', () => {
    const s = createTitleMenuScene(context());
    s.update(frame(['up']), STEP);
    s.update(frame(['down']), STEP);
    s.update(frame(['down']), STEP);
    s.update(frame(['up']), STEP);
    expect(s.update(frame(['confirm']), STEP)?.kind).toBe('match');
  });
});
