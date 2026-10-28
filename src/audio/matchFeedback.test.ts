import { describe, expect, it } from 'vitest';
import type { ContactEvents } from '../game/contact';
import { BASE_STATS } from '../game/stats';
import { createWorld, type World } from '../game/world';
import { HARD_KICK_SPEED, matchFeedback } from './matchFeedback';

const quiet = (): ContactEvents => ({ touched: false, blocked: false, kicked: null, perfect: false, tackledBall: false, trippedOpponent: false });

/** A world in play with no events; `home` and `away` set that tick's contact events. */
function world(home: Partial<ContactEvents> = {}, away: Partial<ContactEvents> = {}): World {
  const w = createWorld(BASE_STATS, BASE_STATS, 1, { home: 4, away: 6 });
  w.match.phase = 'playing';
  w.events.kicks = [
    { ...quiet(), ...home },
    { ...quiet(), ...away },
  ];
  return w;
}

const ballSpeed = (w: World, speed: number) => Object.assign(w.ball, { vx: speed * 0.6, vy: 0, vz: speed * 0.8 });

describe('matchFeedback', () => {
  it('a hard kick by Harrison plays kickHard and rumbles', () => {
    const w = world({ touched: true, kicked: 'shot' });
    ballSpeed(w, HARD_KICK_SPEED);
    expect(matchFeedback(w, 'playing')).toEqual({ cues: ['kickHard'], rumble: ['hardShot'] });
  });

  it("Max's hard kick plays kickHard without rumble", () => {
    const w = world({}, { touched: true, kicked: 'shot' });
    ballSpeed(w, HARD_KICK_SPEED + 50);
    expect(matchFeedback(w, 'playing')).toEqual({ cues: ['kickHard'], rumble: [] });
  });

  it('a soft kick plays kickSoft without rumble', () => {
    const w = world({ touched: true, kicked: 'chip' });
    ballSpeed(w, HARD_KICK_SPEED - 1);
    expect(matchFeedback(w, 'playing')).toEqual({ cues: ['kickSoft'], rumble: [] });
  });

  it('a dribble touch plays tap', () => {
    expect(matchFeedback(world({ touched: true }), 'playing')).toEqual({ cues: ['tap'], rumble: [] });
  });

  it('a PERFECT strike plays its chime', () => {
    const w = world({ touched: true, kicked: 'shot', perfect: true });
    ballSpeed(w, HARD_KICK_SPEED);
    expect(matchFeedback(w, 'playing').cues).toEqual(['kickHard', 'perfect']);
  });

  it('a tackle by either side thuds and rumbles, once', () => {
    expect(matchFeedback(world({ tackledBall: true }), 'playing')).toEqual({ cues: ['tackle'], rumble: ['tackle'] });
    expect(matchFeedback(world({}, { trippedOpponent: true, tackledBall: true }), 'playing')).toEqual({ cues: ['tackle'], rumble: ['tackle'] });
  });

  it('a bounce plays bounce', () => {
    const w = world();
    w.events.ball.bounced = true;
    expect(matchFeedback(w, 'playing')).toEqual({ cues: ['bounce'], rumble: [] });
  });

  it('the post or bar clangs, the crowd oohs, and it rumbles', () => {
    for (const hit of ['hitPost', 'hitBar'] as const) {
      const w = world();
      w.events.ball[hit] = true;
      expect(matchFeedback(w, 'playing'), hit).toEqual({ cues: ['post', 'ooh'], rumble: ['post'] });
    }
  });

  it('the fence thuds', () => {
    const w = world();
    w.events.ball.hitWall = true;
    expect(matchFeedback(w, 'playing')).toEqual({ cues: ['fence'], rumble: [] });
  });

  it('a resting ball against the net makes no sound', () => {
    const w = world();
    w.events.ball.hitNet = true;
    expect(matchFeedback(w, 'playing')).toEqual({ cues: [], rumble: [] });
  });

  it("Harrison's goal swishes the net, the crowd roars, and it rumbles long", () => {
    const w = world();
    w.events.goal = 'home';
    w.match.phase = 'goal';
    expect(matchFeedback(w, 'playing')).toEqual({ cues: ['net', 'roar'], rumble: ['goal'] });
  });

  it("Max's goal swishes the net, the crowd groans, and it rumbles weakly", () => {
    const w = world();
    w.events.goal = 'away';
    w.match.phase = 'goal';
    expect(matchFeedback(w, 'playing')).toEqual({ cues: ['net', 'groan'], rumble: ['maxGoal'] });
  });

  it('play starting from a kickoff blows a short whistle', () => {
    expect(matchFeedback(world(), 'kickoff').cues).toEqual(['whistleShort']);
    expect(matchFeedback(world(), 'playing').cues).toEqual([]);
  });

  it('full time blows the long whistle once', () => {
    const w = world();
    w.match.phase = 'fullTime';
    expect(matchFeedback(w, 'playing').cues).toEqual(['whistleFull']);
    expect(matchFeedback(w, 'fullTime').cues).toEqual([]);
  });
});

describe('matchFeedback: the power-up', () => {
  const powered = (flags: Partial<World['events']['power']>): World => {
    const w = world();
    w.events.power = { started: false, ready: false, cancelled: false, fired: false, braced: false, blown: false, ...flags };
    return w;
  };

  it('starting a power-up hums, gasps and rumbles', () => {
    expect(matchFeedback(powered({ started: true }), 'playing')).toEqual({ cues: ['powerUp', 'ooh'], rumble: ['powerOn'] });
  });

  it('firing blasts, roars and rumbles hard', () => {
    expect(matchFeedback(powered({ fired: true }), 'playing')).toEqual({ cues: ['waveBlast', 'beam'], rumble: ['wave'] });
  });

  it('a brace thuds and rumbles', () => {
    expect(matchFeedback(powered({ braced: true }), 'playing')).toEqual({ cues: ['brace'], rumble: ['brace'] });
  });

  it('Max blown away whooshes', () => {
    expect(matchFeedback(powered({ blown: true }), 'playing')).toEqual({ cues: ['whoosh'], rumble: [] });
  });

  it('a cancelled power-up fizzles', () => {
    expect(matchFeedback(powered({ cancelled: true }), 'playing').cues).toEqual(['fizzle']);
  });

  it('the wave becoming ready chimes and pulses: shoot now', () => {
    expect(matchFeedback(powered({ ready: true }), 'playing')).toEqual({ cues: ['powerReady'], rumble: ['ready'] });
  });
});

describe('matchFeedback with Biscuit', () => {
  it('a grab barks instead of tapping, a pant pants', () => {
    const w = world({}, { touched: true });
    w.events.dog.grabbed = true;
    expect(matchFeedback(w, 'playing').cues).toEqual(['bark']);
    const p = world();
    p.events.dog.panted = true;
    expect(matchFeedback(p, 'playing').cues).toEqual(['pant']);
  });

  it('knocking the ball out of his mouth is a tackle', () => {
    const w = world({ tackledBall: true });
    w.events.dog.dropped = true;
    expect(matchFeedback(w, 'playing')).toEqual({ cues: ['tackle'], rumble: ['tackle'] });
  });
});
