import { describe, expect, it } from 'vitest';
import { recordingAudio } from '../audio/testAudio';
import { recordingRumble } from '../engine/testRumble';
import type { GameArt } from './art';
import type { GameContext } from './context';
import { DIFFICULTY } from '../game/ai';
import { GOAL_PAUSE_S } from '../game/match';
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

  describe('goal moment', () => {
    function scored(team: 'home' | 'away' = 'home') {
      const audio = recordingAudio();
      const rumble = recordingRumble();
      const s = createMatchScene({ ...CTX, audio, rumble }, 1);
      s.world.match.phase = 'playing';
      Object.assign(s.world.ball, team === 'home' ? { x: 616, y: 3, z: 32, vx: 100 } : { x: 24, y: 3, z: 32, vx: -100 });
      s.update(frame(), STEP);
      expect(s.world.events.goal).toBe(team);
      return { s, audio, rumble };
    }

    it("Harrison's goal runs the moment, then kicks off", () => {
      const { s } = scored();
      expect(s.moment).not.toBeNull();
      run(s, 3.9);
      expect(s.world.match.phase).toBe('kickoff');
      expect(s.moment).toBeNull();
    });

    it('a confirm press after 0.5 s skips to the kickoff', () => {
      const { s } = scored();
      run(s, 0.6);
      expect(s.world.match.phase).toBe('goal');
      s.update(frame(['confirm']), STEP);
      expect(s.moment).toBeNull();
      s.update(frame(), STEP);
      expect(s.world.match.phase).toBe('kickoff');
    });

    it("Max's goal has no moment and kicks off after GOAL_PAUSE_S", () => {
      const { s } = scored('away');
      expect(s.moment).toBeNull();
      run(s, GOAL_PAUSE_S - 0.1);
      expect(s.world.match.phase).toBe('goal');
      run(s, 0.2);
      expect(s.world.match.phase).toBe('kickoff');
    });

    it('a golden goal by Harrison runs the moment, then full time', () => {
      const audio = recordingAudio();
      const s = createMatchScene({ ...CTX, audio, rumble: recordingRumble() }, 1);
      Object.assign(s.world.match, { phase: 'playing', goldenGoal: true, clockS: 90 });
      Object.assign(s.world.ball, { x: 616, y: 3, z: 32, vx: 100 });
      s.update(frame(), STEP);
      expect(s.moment).not.toBeNull();
      run(s, 2);
      expect(s.world.match.phase).toBe('goal');
      run(s, 2);
      expect(s.moment).toBeNull();
      expect(s.world.match.phase).toBe('fullTime');
    });

    it('pausing mid-moment and resuming continues it, and the goal cues and rumble fire once', () => {
      const { s, audio, rumble } = scored();
      run(s, 0.5);
      const t = s.moment!.t;
      s.update(frame(['pause']), STEP);
      run(s, 1);
      expect(s.moment!.t).toBe(t);
      s.update(frame(['confirm']), STEP);
      expect(s.paused).toBe(false);
      run(s, 3.5);
      expect(s.moment).toBeNull();
      expect(audio.played.filter(c => c === 'roar')).toHaveLength(1);
      expect(rumble.pulses.filter(k => k === 'goal')).toHaveLength(1);
    });

    it("the crowd holds its roar through Harrison's moment, and settles when it ends", () => {
      const { s, audio } = scored();
      expect(audio.crowd).toBe('roar');
      run(s, 2);
      expect(audio.crowd).toBe('roar');
      s.update(frame(['pause']), STEP);
      expect(audio.crowd).toBe('low');
      s.update(frame(['confirm']), STEP);
      expect(audio.crowd).toBe('roar');
      run(s, 2);
      expect(s.moment).toBeNull();
      expect(audio.crowd).toBe('match');
    });

    it("Max's goal doesn't raise the roar", () => {
      const { audio } = scored('away');
      expect(audio.crowd).toBe('match');
    });

    it('Enter skips the moment instead of pausing', () => {
      const { s } = scored();
      run(s, 0.6);
      s.update(frame(['pause', 'confirm']), STEP);
      expect(s.paused).toBe(false);
      expect(s.moment).toBeNull();
    });

    it('Esc or Start still pauses during the moment', () => {
      const { s } = scored();
      run(s, 0.6);
      s.update(frame(['pause', 'back']), STEP);
      expect(s.paused).toBe(true);
      expect(s.moment).not.toBeNull();
    });

    it("Harrison's header shows HEADER! with the moment, and it clears after", () => {
      const audio = recordingAudio();
      const s = createMatchScene({ ...CTX, audio, rumble: recordingRumble() }, 1);
      s.world.match.phase = 'playing';
      Object.assign(s.world.away, { x: 300 });
      Object.assign(s.world.home, { x: 540, z: 32, y: 10, state: 'air', vy: 0, facing: 1, kick: null });
      Object.assign(s.world.ball, { x: 543, y: 40, z: 32, vx: -50, vy: -100, vz: 0 });
      let n = 0;
      while (!s.moment && n++ < 60) s.update(frame(), STEP);
      expect(s.moment).not.toBeNull();
      expect(s.callout).toBe('HEADER!');
      run(s, 4);
      expect(s.callout).toBeNull();
    });

    it('a third goal is a HAT-TRICK! with an extra roar', () => {
      const { s, audio } = (() => {
        const audio = recordingAudio();
        const s = createMatchScene({ ...CTX, audio, rumble: recordingRumble() }, 1);
        Object.assign(s.world.match, { phase: 'playing', score: { home: 2, away: 0 } });
        Object.assign(s.world.ball, { x: 616, y: 3, z: 32, vx: 100 });
        s.update(frame(), STEP);
        return { s, audio };
      })();
      expect(s.callout).toBe('HAT-TRICK!');
      run(s, 1.5);
      expect(audio.played.filter(c => c === 'roar')).toHaveLength(2);
    });

    it('holding shoot through the skip and the kickoff does not charge until a fresh press', () => {
      const { s } = scored();
      run(s, 0.6);
      s.update(frame(['shoot']), STEP);
      expect(s.moment).toBeNull();
      run(s, 1.5, ['shoot']);
      expect(s.world.match.phase).toBe('playing');
      expect(s.world.home.state).not.toBe('charging');
      expect(s.world.home.kick).toBeNull();
      s.update(frame(), STEP);
      s.update(frame(['shoot']), STEP);
      expect(s.world.home.state).toBe('charging');
    });
  });

  describe('music', () => {
    it('the match stops the title music, and the result plays its jingle', () => {
      const audio = recordingAudio();
      audio.music = 'title';
      const s = createMatchScene({ ...CTX, audio }, 1);
      expect(audio.music).toBeNull();
      Object.assign(s.world.match, { phase: 'playing', clockS: 89.99, score: { home: 2, away: 1 } });
      run(s, 0.1);
      expect(s.world.match.phase).toBe('fullTime');
      run(s, 2);
      expect(audio.music).toBe('win');
    });

    it('a loss and a draw get their own jingles', () => {
      for (const [score, track] of [
        [{ home: 0, away: 1 }, 'lose'],
        [{ home: 1, away: 1 }, 'draw'],
      ] as const) {
        const audio = recordingAudio();
        const s = createMatchScene({ ...CTX, audio }, 1);
        Object.assign(s.world.match, { phase: 'playing', goldenGoal: true, goldenS: 200, score: { ...score } });
        run(s, 2.2);
        expect(audio.music, track).toBe(track);
      }
    });
  });
});
