import { describe, expect, it } from 'vitest';
import { DIFFICULTY } from '../game/ai';
import { maxStats } from '../meta/ladder';
import { newProfile } from '../meta/profile';
import { DEFAULT_SETTINGS, type Settings } from '../meta/settings';
import { HUB_ITEMS, createHubScene, statsLine } from './hubScene';
import type { MatchScene } from './matchScene';
import { testContext } from './testContext';
import { frame } from './testInput';
import { createPressStartScene } from './titleScene';

const STEP = 1 / 60;
function context(difficulty: Settings['difficulty'] = 'normal') {
  return testContext({ settings: { ...DEFAULT_SETTINGS, difficulty } });
}

describe('press start screen', () => {
  it('Press Start, A or Enter opens the Hub', () => {
    for (const pressed of [['pause'], ['confirm'], ['pause', 'confirm']] as const) {
      expect(createPressStartScene(context()).update(frame(pressed), STEP)?.kind, pressed.join('+')).toBe('hub');
    }
  });

  it('waits for a press', () => {
    const s = createPressStartScene(context());
    expect(s.update(frame([], ['confirm']), STEP)).toBeNull();
    expect(s.update(frame(['shoot']), STEP)).toBeNull();
  });
});

describe('hub', () => {
  it('the Hub has PLAY MATCH, SHOP, OPTIONS, HELP and no quit', () => {
    expect(HUB_ITEMS).toEqual(['PLAY MATCH', 'SHOP', 'OPTIONS', 'HELP']);
  });

  it('PLAY MATCH starts a match at the saved difficulty', () => {
    for (const difficulty of ['easy', 'hard'] as const) {
      const next = createHubScene(context(difficulty)).update(frame(['confirm']), STEP) as MatchScene;
      expect(next.kind).toBe('match');
      expect(next.world.aimErrorDeg.away).toBe(DIFFICULTY[difficulty].aimErrorDeg);
    }
  });

  it('PLAY MATCH plays the next ladder match', () => {
    const ctx = testContext({ profile: { ...newProfile(), ladderWins: 4 } });
    const next = createHubScene(ctx).update(frame(['confirm']), STEP) as MatchScene;
    expect(next.ladderMatch).toBe(5);
    expect(next.world.away.stats).toEqual(maxStats(5));
  });

  it('B on the Hub goes back to Press Start', () => {
    expect(createHubScene(context()).update(frame(['back']), STEP)?.kind).toBe('pressStart');
  });

  it('Start on the Hub starts the selected item, like A', () => {
    expect(createHubScene(context()).update(frame(['pause']), STEP)?.kind).toBe('match');
    expect(createHubScene(context(), 3).update(frame(['pause']), STEP)?.kind).toBe('help');
  });

  it('Esc on the Hub goes back to Press Start', () => {
    expect(createHubScene(context()).update(frame(['pause', 'back']), STEP)?.kind).toBe('pressStart');
  });

  it('Enter on the Hub still confirms', () => {
    expect(createHubScene(context()).update(frame(['pause', 'confirm']), STEP)?.kind).toBe('match');
  });

  it('HELP opens Help, and B there comes back to the Hub on HELP', () => {
    const s = createHubScene(context());
    s.update(frame(['up']), STEP);
    const help = s.update(frame(['confirm']), STEP);
    expect(help?.kind).toBe('help');
    const back = help!.update(frame(['back']), STEP);
    expect(back?.kind).toBe('hub');
    expect(back!.update(frame(['confirm']), STEP)?.kind).toBe('help');
  });

  it('OPTIONS opens Options, and B there comes back to the Hub on OPTIONS', () => {
    const s = createHubScene(context(), 2);
    const options = s.update(frame(['confirm']), STEP);
    expect(options?.kind).toBe('options');
    const back = options!.update(frame(['back']), STEP);
    expect(back?.kind).toBe('hub');
    expect(back!.update(frame(['confirm']), STEP)?.kind).toBe('options');
  });

  it('SHOP opens the shop, and B there comes back to the Hub on SHOP', () => {
    const s = createHubScene(context());
    s.update(frame(['down']), STEP);
    const shop = s.update(frame(['confirm']), STEP);
    expect(shop?.kind).toBe('shop');
    const back = shop!.update(frame(['back']), STEP);
    expect(back?.kind).toBe('hub');
    expect(back!.update(frame(['confirm']), STEP)?.kind).toBe('shop');
  });

  it('up and down move the choice, wrapping', () => {
    const s = createHubScene(context());
    s.update(frame(['up']), STEP);
    s.update(frame(['down']), STEP);
    s.update(frame(['down']), STEP);
    s.update(frame(['up']), STEP);
    expect(s.update(frame(['confirm']), STEP)?.kind).toBe('match');
  });

  it('Press Start and the Hub play the title theme', () => {
    for (const make of [createPressStartScene, createHubScene]) {
      const ctx = context();
      make(ctx);
      expect(ctx.audio.music).toBe('title');
    }
  });

  it('the Hub turns the crowd off and plays the title theme', () => {
    const ctx = context();
    ctx.audio.crowd = 'match';
    ctx.audio.music = null;
    createHubScene(ctx);
    expect(ctx.audio.crowd).toBe('off');
    expect(ctx.audio.music).toBe('title');
  });

  it('shows his four stats in short', () => {
    expect(statsLine({ speed: 3, power: 2, jump: 1, control: 10 })).toBe('SPD 3  PWR 2  JMP 1  CTL 10');
  });
});
