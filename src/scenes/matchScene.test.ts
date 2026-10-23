import { describe, expect, it } from 'vitest';
import type { GameArt } from './art';
import type { GameContext } from './context';
import { createMatchScene, type MatchScene } from './matchScene';
import { frame } from './testInput';

const STEP = 1 / 60;
/** update() never touches the art, so tests can run without a DOM. */
const NO_ART = {} as GameArt;
const CTX: GameContext = { art: NO_ART, settings: { version: 1, difficulty: 'normal' }, save: () => {} };

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
});
