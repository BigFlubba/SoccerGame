import { describe, expect, it } from 'vitest';
import { BISCUIT_FPS } from '../art/opponents/biscuit';
import { DOG_DIFFICULTY, TUNING_STATS } from '../game/dog';
import { createWorld, type World } from '../game/world';
import { BASE_STATS } from '../game/stats';
import { GRAB_SHOW_S, dogClip } from './dogView';

function boss(): World {
  const w = createWorld(TUNING_STATS, BASE_STATS, 1, { home: 0, away: 0 }, null, DOG_DIFFICULTY.normal);
  w.match.phase = 'playing';
  return w;
}
const name = (w: World, nowS = 0) => dogClip(w, nowS).name;

describe('dogClip', () => {
  it('stands idle, and runs when moving', () => {
    const w = boss();
    expect(name(w)).toBe('idle');
    w.away.vx = -120;
    expect(name(w)).toBe('run');
  });

  it('carries the ball moving or standing, after showing the grab for GRAB_SHOW_S', () => {
    const w = boss();
    w.dog!.carrying = true;
    w.dog!.carryS = 0;
    w.away.vx = -120;
    expect(name(w)).toBe('grab');
    w.dog!.carryS = GRAB_SHOW_S - 0.01;
    expect(name(w)).toBe('grab');
    w.dog!.carryS = GRAB_SHOW_S;
    expect(name(w)).toBe('carry');
    w.away.vx = 0;
    expect(dogClip(w, 0.35)).toEqual({ name: 'carry', frame: 0 });
  });

  it('picks the body state, then pant, jink, grab, carry, run and idle, in that order of precedence', () => {
    const w = boss();
    Object.assign(w.dog!, { carrying: true, carryS: 0, jinkS: 0.3, pantS: 0.5 });
    w.away.vx = -120;
    w.away.state = 'blown';
    expect(name(w)).toBe('blown');
    w.away.state = 'bracing';
    expect(name(w)).toBe('brace');
    w.away.state = 'ground';
    expect(name(w)).toBe('pant');
    w.dog!.pantS = 0;
    expect(name(w)).toBe('jink');
    w.dog!.jinkS = 0;
    expect(name(w)).toBe('grab');
  });

  it('looping clips advance with time at their fps', () => {
    const w = boss();
    Object.assign(w.dog!, { carrying: true, carryS: 1 });
    w.away.vx = -150;
    expect(dogClip(w, 0)).toEqual({ name: 'carry', frame: 0 });
    expect(dogClip(w, 1 / BISCUIT_FPS.carry)).toEqual({ name: 'carry', frame: 1 });
    expect(dogClip(w, 4 / BISCUIT_FPS.carry)).toEqual({ name: 'carry', frame: 0 });
    w.dog!.pantS = 0.6;
    expect(dogClip(w, 1 / BISCUIT_FPS.pant).frame).toBe(1);
  });

  it('blown: flat out in the air, then on his back once down', () => {
    const w = boss();
    Object.assign(w.away, { state: 'blown', y: 10, vy: 50 });
    expect(dogClip(w, 0)).toEqual({ name: 'blown', frame: 0 });
    Object.assign(w.away, { y: 0, vy: 0 });
    expect(dogClip(w, 0)).toEqual({ name: 'blown', frame: 1 });
  });

  it('the jink crouches, then cuts', () => {
    const w = boss();
    Object.assign(w.dog!, { carrying: true, carryS: 1, jinkS: 0.45 });
    expect(dogClip(w, 0).frame).toBe(0);
    w.dog!.jinkS = 0.1;
    expect(dogClip(w, 0).frame).toBe(1);
  });
});
