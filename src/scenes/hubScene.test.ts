import { describe, expect, it } from 'vitest';
import { DIFFICULTY, type Difficulty } from '../game/ai';
import { measureText } from '../art/font';
import { careerCardLines } from '../meta/career';
import { maxStats } from '../meta/ladder';
import { newProfile } from '../meta/profile';
import { HUB_ITEMS, createHubScene, statsLine } from './hubScene';
import type { MatchScene } from './matchScene';
import { testContext } from './testContext';
import { frame } from './testInput';
import { createPressStartScene } from './titleScene';
import type { VsScene } from './vsScene';

const STEP = 1 / 60;
function context(difficulty: Difficulty = 'normal') {
  return testContext({ profile: { ...newProfile(), difficulty } });
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
  it('the Hub has CAREER, SHOP, OPTIONS, HELP and no quit', () => {
    expect(HUB_ITEMS).toEqual(['CAREER', 'SHOP', 'OPTIONS', 'HELP']);
  });

  it('CAREER opens the road map, and A there then A plays the next match through the VS card', () => {
    const ctx = testContext({ profile: { ...newProfile(), ladderWins: 4 } });
    const map = createHubScene(ctx).update(frame(['confirm']), STEP)!;
    expect(map.kind).toBe('roadMap');
    const venue = map.update(frame(['confirm']), STEP)!;
    expect(venue.kind).toBe('venue');
    const vs = venue.update(frame(['confirm']), STEP) as VsScene;
    expect(vs.kind).toBe('vs');
    expect(vs.match.id).toBe('backyard-5');
    const match = vs.update(frame(['confirm']), STEP) as MatchScene;
    expect(match.world.away.stats).toEqual(maxStats(5));
  });

  it("a match reached from the Hub plays at the save's difficulty", () => {
    for (const difficulty of ['easy', 'hard'] as const) {
      let scene = createHubScene(context(difficulty));
      for (let i = 0; i < 4; i++) scene = scene.update(frame(['confirm']), STEP)!;
      const match = scene as MatchScene;
      expect(match.kind).toBe('match');
      expect(match.world.aimErrorDeg.away).toBe(DIFFICULTY[difficulty].aimErrorDeg);
    }
  });

  it('with Biscuit beaten, the card points into the Park', () => {
    expect(careerCardLines({ ...newProfile(), ladderWins: 10, career: { stars: { 'backyard-boss': 1 }, milestonesPaid: 0, lossStreaks: {} } }).first).toBe('NEXT: BIG BRICK - THE PARK 1/4');
  });

  it('the card says what is next in the career', () => {
    expect(careerCardLines({ ...newProfile(), ladderWins: 4 })).toEqual({ first: 'NEXT: MAX - MATCH 5/10', second: 'MAX HAS BEEN TRAINING: SPEED UP' });
  });

  it('B on the Hub goes back to Press Start', () => {
    expect(createHubScene(context()).update(frame(['back']), STEP)?.kind).toBe('pressStart');
  });

  it('Start on the Hub starts the selected item, like A', () => {
    expect(createHubScene(context()).update(frame(['pause']), STEP)?.kind).toBe('roadMap');
    expect(createHubScene(context(), 3).update(frame(['pause']), STEP)?.kind).toBe('help');
  });

  it('Esc on the Hub goes back to Press Start', () => {
    expect(createHubScene(context()).update(frame(['pause', 'back']), STEP)?.kind).toBe('pressStart');
  });

  it('Enter on the Hub still confirms', () => {
    expect(createHubScene(context()).update(frame(['pause', 'confirm']), STEP)?.kind).toBe('roadMap');
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
    expect(s.update(frame(['confirm']), STEP)?.kind).toBe('roadMap');
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

  it('shows his five stats in short', () => {
    expect(statsLine({ speed: 3, power: 2, jump: 1, control: 10, stamina: 4 })).toBe('SPD 3  PWR 2  JMP 1  CTL 10  STA 4');
  });

  it('the maxed stats line fits the card', () => {
    expect(measureText(statsLine({ speed: 10, power: 10, jump: 10, control: 10, stamina: 10 }))).toBeLessThanOrEqual(200);
  });
});
