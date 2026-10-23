import { describe, expect, it } from 'vitest';
import { recordingAudio } from '../audio/testAudio';
import { recordingRumble } from '../engine/testRumble';
import type { GameArt } from './art';
import type { GameContext } from './context';
import { DIFFICULTY } from '../game/ai';
import { DEFAULT_SETTINGS, type Settings } from '../meta/settings';
import { PAUSE_ITEMS, createMatchScene, type MatchScene } from './matchScene';
import type { Scene } from './scene';
import { frame } from './testInput';

const STEP = 1 / 60;
/** update() never touches the art, so tests can run without a DOM. */
const NO_ART = {} as GameArt;
const CTX: GameContext = { art: NO_ART, settings: { ...DEFAULT_SETTINGS }, save: () => {}, audio: recordingAudio(), rumble: recordingRumble() };

function live(): MatchScene {
  const s = createMatchScene(CTX, 1);
  s.world.match.phase = 'playing';
  return s;
}

function run(s: MatchScene, seconds: number, held: Parameters<typeof frame>[1] = []): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) s.update(frame([], held), STEP);
}

describe('match scene', () => {
  it('match scene pauses when the tab hides and does not advance the clock while paused', () => {
    const s = live();
    run(s, 1);
    const clock = s.world.match.clockS;
    s.onHidden?.();
    expect(s.paused).toBe(true);
    run(s, 2);
    expect(s.world.match.clockS).toBe(clock);
  });

  it('pause opens the menu and resume continues the match', () => {
    const s = live();
    s.update(frame(['pause']), STEP);
    expect(s.paused).toBe(true);
    s.update(frame(['confirm']), STEP);
    expect(s.paused).toBe(false);
  });

  it('pausing mid-charge cancels the charge instead of shooting', () => {
    const s = live();
    run(s, 0.3, ['shoot']);
    expect(s.world.home.state).toBe('charging');
    s.update(frame(['pause'], ['shoot']), STEP);
    s.update(frame(['confirm']), STEP);
    run(s, 0.5);
    expect(s.world.home.kick).toBeNull();
    expect(s.world.home.charge).toBe(0);
    expect(s.world.home.state).not.toBe('kicking');
  });

  it('backing out of the pause menu with B does not start a slide', () => {
    const s = live();
    s.world.ball.x = 100;
    s.update(frame(['pause']), STEP);
    s.update(frame(['back', 'chip']), STEP);
    expect(s.paused).toBe(false);
    for (let i = 0; i < 5; i++) s.update(frame([], ['back', 'chip']), STEP);
    expect(s.world.home.state).toBe('ground');
  });

  it('backing out of the pause menu with B does not start a chip', () => {
    const s = live();
    s.update(frame(['pause']), STEP);
    s.update(frame(['back', 'chip']), STEP);
    for (let i = 0; i < 5; i++) s.update(frame([], ['back', 'chip']), STEP);
    expect(s.world.home.state).toBe('ground');
  });

  it('restart from the pause menu returns a fresh 0-0 match', () => {
    const s = live();
    s.world.match.score.home = 2;
    run(s, 1);
    s.update(frame(['pause']), STEP);
    s.update(frame(['down']), STEP);
    const next = s.update(frame(['confirm']), STEP) as MatchScene | null;
    expect(next?.world.match.score).toEqual({ home: 0, away: 0 });
    expect(next?.world.match.clockS).toBe(0);
  });

  it('quit from the pause menu goes back to the title', () => {
    const s = live();
    s.update(frame(['pause']), STEP);
    s.update(frame(['up']), STEP);
    const next = s.update(frame(['confirm']), STEP);
    expect(next).not.toBeNull();
    expect((next as Partial<MatchScene>).world).toBeUndefined();
  });

  it('up on the stick runs away from the camera, down toward it', () => {
    const s = live();
    const z = s.world.home.z;
    for (let i = 0; i < 20; i++) s.update({ ...frame(), moveY: -1 }, STEP);
    expect(s.world.home.z).toBeGreaterThan(z);
    for (let i = 0; i < 40; i++) s.update({ ...frame(), moveY: 1 }, STEP);
    expect(s.world.home.z).toBeLessThan(z);
  });

  it('the stick aims shots: up is the far post', () => {
    const s = live();
    run(s, 0.2, ['shoot']);
    s.update({ ...frame(), moveY: -1 }, STEP);
    expect(s.world.home.kick?.aim).toBe('far');
  });

  it('offers play again after full time', () => {
    const s = live();
    s.world.match.phase = 'fullTime';
    s.world.match.result = 'win';
    run(s, 2);
    const next = s.update(frame(['confirm']), STEP) as MatchScene | null;
    expect(next?.world.match.phase).toBe('kickoff');
  });

  it('pause menu lists RESUME, RESTART, HELP, OPTIONS, QUIT TO TITLE', () => {
    expect(PAUSE_ITEMS).toEqual(['RESUME', 'RESTART', 'HELP', 'OPTIONS', 'QUIT TO TITLE']);
  });
});

describe('match scene: pause menu screens', () => {
  /** Opens the pause menu and picks `item`; returns whatever scene that leads to. */
  function pick(s: MatchScene, item: (typeof PAUSE_ITEMS)[number]): Scene | null {
    s.update(frame(['pause']), STEP);
    for (let i = 0; i < PAUSE_ITEMS.indexOf(item); i++) s.update(frame(['down']), STEP);
    return s.update(frame(['confirm']), STEP);
  }

  function liveWith(ctx: GameContext): MatchScene {
    const s = createMatchScene(ctx, 1);
    s.world.match.phase = 'playing';
    return s;
  }

  it('help from pause returns to the paused match', () => {
    const s = live();
    const clock = s.world.match.clockS;
    const help = pick(s, 'HELP');
    expect(help?.kind).toBe('help');
    for (let i = 0; i < 30; i++) help!.update(frame([]), STEP);
    expect(help!.update(frame(['back']), STEP)).toBe(s);
    expect(s.paused).toBe(true);
    expect(s.world.match.clockS).toBe(clock);
  });

  it('options from pause returns to the paused match', () => {
    const s = live();
    const options = pick(s, 'OPTIONS');
    expect(options?.kind).toBe('options');
    expect(options!.update(frame(['back']), STEP)).toBe(s);
    expect(s.paused).toBe(true);
  });

  it('a difficulty change from pause applies to the current match', () => {
    const settings: Settings = { ...DEFAULT_SETTINGS };
    const ctx: GameContext = { art: NO_ART, settings, save: next => void (ctx.settings = next), audio: recordingAudio(), rumble: recordingRumble() };
    const s = liveWith(ctx);
    const options = pick(s, 'OPTIONS')!;
    options.update(frame(['right']), STEP);
    options.update(frame(['back']), STEP);
    expect(ctx.settings.difficulty).toBe('hard');
    expect(s.world.aimErrorDeg.away).toBe(DIFFICULTY.hard.aimErrorDeg);
    expect(s.difficulty).toBe('hard');
  });

  it('backing out of Help with B and resuming does not slide or chip', () => {
    const s = live();
    const help = pick(s, 'HELP')!;
    expect(help.update(frame(['back'], ['chip']), STEP)).toBe(s);
    s.update(frame([], ['back', 'chip']), STEP);
    s.update(frame(['pause'], ['back', 'chip']), STEP);
    expect(s.paused).toBe(false);
    run(s, 0.5, ['back', 'chip']);
    expect(s.world.home.state).toBe('ground');
  });

  it('backing out of Options with B, then B again to resume, does not slide', () => {
    const s = live();
    const options = pick(s, 'OPTIONS')!;
    options.update(frame(['back'], ['chip']), STEP);
    s.update(frame(['back'], ['chip']), STEP);
    expect(s.paused).toBe(false);
    run(s, 0.5, ['back', 'chip']);
    expect(s.world.home.state).toBe('ground');
  });

  it('quit to title opens the Press Start screen', () => {
    expect(pick(live(), 'QUIT TO TITLE')?.kind).toBe('pressStart');
  });

  describe('sound', () => {
    function withAudio() {
      const audio = recordingAudio();
      const s = createMatchScene({ ...CTX, audio }, 1);
      s.world.match.phase = 'playing';
      return { s, audio };
    }

    it('a home goal plays net and roar', () => {
      const { s, audio } = withAudio();
      Object.assign(s.world.ball, { x: 616, y: 3, z: 32, vx: 100, vy: 0, vz: 0 });
      s.update(frame(), STEP);
      expect(s.world.events.goal).toBe('home');
      expect(audio.played).toEqual(expect.arrayContaining(['net', 'roar']));
    });

    it('the crowd is at match level in play and low while paused', () => {
      const { s, audio } = withAudio();
      expect(audio.crowd).toBe('match');
      s.update(frame(['pause']), STEP);
      expect(audio.crowd).toBe('low');
      s.update(frame(['confirm']), STEP);
      expect(audio.crowd).toBe('match');
    });

    it('quit to title turns the crowd off', () => {
      const { s, audio } = withAudio();
      s.update(frame(['pause']), STEP);
      s.update(frame(['up']), STEP);
      expect(s.update(frame(['confirm']), STEP)?.kind).toBe('pressStart');
      expect(audio.crowd).toBe('off');
    });

    it("a home goal rumbles goal; RUMBLE OFF is respected by the Rumble, not the scene", () => {
      const rumble = recordingRumble();
      const s = createMatchScene({ ...CTX, settings: { ...DEFAULT_SETTINGS, rumble: false }, rumble }, 1);
      s.world.match.phase = 'playing';
      Object.assign(s.world.ball, { x: 616, y: 3, z: 32, vx: 100, vy: 0, vz: 0 });
      s.update(frame(), STEP);
      expect(rumble.pulses).toEqual(['goal']);
    });

    it('the pause menu blips', () => {
      const { s, audio } = withAudio();
      s.update(frame(['pause']), STEP);
      s.update(frame(['down']), STEP);
      expect(audio.played).toContain('menuMove');
    });
  });
});
