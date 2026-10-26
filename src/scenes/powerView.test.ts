import { describe, expect, it } from 'vitest';
import { BASE_STATS } from '../game/stats';
import { createWorld, type World } from '../game/world';
import type { MatchHud } from './matchView';
import { homeSprites, powerPrompt, shakeFor } from './powerView';

const hudWith = (h: Partial<MatchHud> = {}): MatchHud => ({
  perfect: null,
  moment: null,
  callout: null,
  trail: [],
  flash: false,
  shake: null,
  impactFrames: 0,
  goldenCelebration: false,
  ...h,
});

const world = (golden: boolean | null): World => createWorld(BASE_STATS, BASE_STATS, 1, { home: 0, away: 0 }, golden === null ? null : { golden });
const size = (s: { dx: number; dy: number }) => Math.max(Math.abs(s.dx), Math.abs(s.dy));

describe('shakeFor', () => {
  it('grows with the charge while powering up, to 2 px', () => {
    const w = world(false);
    Object.assign(w.home, { state: 'poweringUp', charge: 0.2 });
    const low = size(shakeFor(w.power, w.home, hudWith(), 1));
    Object.assign(w.home, { charge: 1 });
    const full = size(shakeFor(w.power, w.home, hudWith(), 1));
    expect(low).toBeLessThan(full);
    expect(full).toBe(2);
  });

  it('is 4 px right after firing and 0 after 0.3 s', () => {
    const w = world(false);
    const hud = hudWith({ shake: { px: 4, untilS: 10.3 } });
    expect(size(shakeFor(w.power, w.home, hud, 10))).toBe(4);
    expect(size(shakeFor(w.power, w.home, hud, 10.31))).toBe(0);
  });

  it('is nothing without a power move', () => {
    const w = world(null);
    Object.assign(w.home, { state: 'poweringUp', charge: 1 });
    expect(size(shakeFor(w.power, w.home, hudWith({ shake: { px: 4, untilS: 9 } }), 1))).toBe(0);
  });
});

describe('homeSprites', () => {
  it('his normal look in play, the power heads while powering up and unleashing', () => {
    const w = world(false);
    expect(homeSprites(w, hudWith())).toBe('home');
    for (const state of ['poweringUp', 'unleashing'] as const) {
      w.home.state = state;
      expect(homeSprites(w, hudWith()), state).toBe('homePower');
    }
  });

  it('gold with Golden Form, and while celebrating an Energy Wave goal in it', () => {
    const w = world(true);
    w.home.state = 'poweringUp';
    expect(homeSprites(w, hudWith())).toBe('homeGolden');
    w.home.state = 'ground';
    expect(homeSprites(w, hudWith())).toBe('home');
    expect(homeSprites(w, hudWith({ goldenCelebration: true }))).toBe('homeGolden');
  });
});

describe('powerPrompt', () => {
  it('LET GO! shows over him once the charge is full, and not before', () => {
    const w = world(false);
    expect(powerPrompt(w.home)).toBeNull();
    Object.assign(w.home, { state: 'poweringUp', charge: 0.9 });
    expect(powerPrompt(w.home)).toBeNull();
    Object.assign(w.home, { charge: 1 });
    expect(powerPrompt(w.home)).toBe('LET GO!');
  });
});

