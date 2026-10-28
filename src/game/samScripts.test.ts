import { describe, expect, it } from 'vitest';
import { BALL_REST_Y } from './ball';
import { NO_INTENT } from './player';
import { SAM_HANDLING, SAM_PROFILES, SAM_STATS } from './sam';
import { MATADOR, RACER, SAM_TUNING_STATS, matadorIntent, matadorMemo, racerIntent, type MatadorMemo } from './samScripts';
import { createWorld, stepWorld, type World } from './world';

const STEP = 1 / 60;

/** A world in play against Sam: Harrison, Sam and the ball placed by hand, Sam's velocity given. */
function stage(o: { harrison: [number, number]; sam: [number, number]; ball: [number, number]; samV?: number; ballV?: number; touchedBy?: 'home' | 'away'; facing?: 1 | -1 }): World {
  const w = createWorld({ ...SAM_TUNING_STATS }, { ...SAM_STATS }, 1, { home: 0, away: 0 }, null, null, SAM_PROFILES.normal, SAM_HANDLING);
  w.match.phase = 'playing';
  Object.assign(w.home, { x: o.harrison[0], z: o.harrison[1], facing: o.facing ?? 1 });
  Object.assign(w.away, { x: o.sam[0], z: o.sam[1], facing: -1, vx: o.samV ?? 0 });
  Object.assign(w.ball, { x: o.ball[0], y: BALL_REST_Y, z: o.ball[1], vx: o.ballV ?? 0, vy: 0, vz: 0, touchedBy: o.touchedBy });
  return w;
}

/** A matador whose every draw is the middle of its range. */
const steady = (): MatadorMemo => matadorMemo(() => 0.5);

describe('the racer', () => {
  it('sprints at a loose ball wherever it is', () => {
    const w = stage({ harrison: [200, 32], sam: [500, 32], ball: [300, 40] });
    const i = racerIntent(w, 0);
    expect(i.sprint).toBe(true);
    expect(i.moveX).toBeGreaterThan(0.9);
  });

  it("slides at Sam head-on when he's within RACER.slideAt of Sam's ball", () => {
    const w = stage({ harrison: [300, 32], sam: [340, 32], ball: [320, 32], samV: -200, touchedBy: 'away' });
    expect(racerIntent(w, 0).chipHeld).toBe(true);
    const far = stage({ harrison: [250, 32], sam: [340, 32], ball: [320, 32], samV: -200, touchedBy: 'away' });
    expect(racerIntent(far, 0).chipHeld).toBe(false);
  });

  it("slides only with Sam's ball in his lane: never just at Sam's legs", () => {
    const w = stage({ harrison: [300, 32], sam: [340, 18], ball: [320, 19], samV: -200, touchedBy: 'away' });
    expect(racerIntent(w, 0).chipHeld).toBe(false);
  });

  it('never taps steal, even with Sam\'s ball in reach', () => {
    const w = stage({ harrison: [300, 32], sam: [340, 32], ball: [312, 32], touchedBy: 'away' });
    for (let t = 0; t < 30; t++) expect(racerIntent(w, t * STEP).steal).toBe(false);
  });

  it('shoots, with a fixed charge, as soon as he has the ball within RACER.shootFrom of the goal', () => {
    const w = stage({ harrison: [400, 32], sam: [100, 32], ball: [409, 32], touchedBy: 'home' });
    expect(racerIntent(w, 0).shootHeld).toBe(true);
    expect(RACER.chargeS).toBe(0.7);
    const far = stage({ harrison: [250, 32], sam: [100, 32], ball: [259, 32], touchedBy: 'home' });
    expect(racerIntent(far, 0).shootHeld).toBe(false);
  });

  it('never pulls the stick back with the ball: on its wrong side he goes round it', () => {
    const w = stage({ harrison: [320, 32], sam: [100, 32], ball: [310, 32], touchedBy: 'home', facing: -1 });
    const i = racerIntent(w, 0);
    expect(i.moveX).toBeLessThanOrEqual(0);
    expect(i.moveZ).not.toBe(0);
  });
});

describe('the matador', () => {
  it("with Sam on the ball, waits goal-side in his lane, holdAt ahead of him, facing him", () => {
    const memo = steady();
    const w = stage({ harrison: [100, 20], sam: [400, 40], ball: [392, 40], touchedBy: 'away' });
    const i = matadorIntent(w, 0, STEP, memo);
    expect(i.moveX).toBeGreaterThan(0);
    expect(i.moveZ).toBeGreaterThan(0);
    expect(i.faceX).toBe(1);
    // In place: he holds there and only tracks Sam's depth.
    const there = stage({ harrison: [400 - memo.holdAt, 40], sam: [400, 40], ball: [392, 40], touchedBy: 'away' });
    const held = matadorIntent(there, 0, STEP, steady());
    expect([held.moveX, held.moveZ]).toEqual([0, 0]);
    expect(held.steal).toBe(false);
  });

  it("a loose ball behind Sam, toward his own goal, is a chance: he goes for it rather than waiting", () => {
    const w = stage({ harrison: [560, 32], sam: [600, 40], ball: [609, 32], touchedBy: 'away' });
    const i = matadorIntent(w, 0, STEP, steady());
    expect(i.moveX).toBeGreaterThan(0);
  });

  it("with Sam on the ball deep beside Harrison's own goal, he holds in front of his goal, never off the pitch behind it", () => {
    const w = stage({ harrison: [35, 52], sam: [25, 51], ball: [17, 51], touchedBy: 'away' });
    expect(matadorIntent(w, 0, STEP, steady()).moveX).toBeGreaterThan(0);
  });

  it('steals in the gap between Sam\'s touches, but not with the ball at Sam\'s feet', () => {
    const gap = stage({ harrison: [300, 32], sam: [345, 32], ball: [310, 32], samV: -200, ballV: -260, touchedBy: 'away' });
    expect(matadorIntent(gap, 0, STEP, steady()).steal).toBe(true);
    const feet = stage({ harrison: [300, 32], sam: [318, 32], ball: [310, 32], touchedBy: 'away' });
    expect(matadorIntent(feet, 0, STEP, steady()).steal).toBe(false);
  });

  it("Sam's ball got past him, behind him toward his own goal: he turns for it, and steals it in reach", () => {
    const w = stage({ harrison: [600, 15], sam: [610, 13], ball: [596, 8], touchedBy: 'home' });
    const i = matadorIntent(w, 0, STEP, steady());
    expect(i.moveX < 0 || i.steal).toBe(true);
  });

  it('in a corner pocket by his own goal, with no way round the ball, he plays it from where it is', () => {
    const w = stage({ harrison: [34, 8], sam: [60, 40], ball: [7, 6], touchedBy: 'away' });
    const i = matadorIntent(w, 0, STEP, steady());
    expect(i.moveX).toBeLessThan(0);
  });

  it('a ball stuck still by him in a corner, for a second, he goes straight at it, facing it, and pokes it', () => {
    const memo = steady();
    const w = stage({ harrison: [601, 49], sam: [611, 51], ball: [609, 58], touchedBy: 'home' });
    Object.assign(w.home, { facing: -1 });
    Object.assign(w.away, { facing: -1 });
    let i = matadorIntent(w, 0, STEP, memo);
    for (let t = 1; t <= 70; t++) i = matadorIntent(w, t * STEP, STEP, memo);
    expect(i.faceX).toBe(1);
    expect(i.moveX > 0 || i.steal).toBe(true);
  });

  it("judges by what he can see: a still ball at his own feet is his to play, whoever touched it last", () => {
    const w = stage({ harrison: [300, 32], sam: [420, 32], ball: [308, 32], touchedBy: 'away' });
    expect(matadorIntent(w, 0, STEP, steady()).steal).toBeFalsy();
  });

  it('steals a slow range shot rolling past him', () => {
    const w = stage({ harrison: [200, 32], sam: [400, 32], ball: [214, 32], ballV: -150, touchedBy: 'away' });
    expect(matadorIntent(w, 0, STEP, steady()).steal).toBe(true);
  });

  it('on the ball with Sam flying in, he drags it back once his reaction is up', () => {
    const memo = steady();
    const w = stage({ harrison: [300, 32], sam: [308 + MATADOR.seeAt, 32], ball: [308, 32], samV: -210, touchedBy: 'home' });
    let t = 0;
    let back = false;
    for (; t < 1 && !back; t += STEP) {
      const i = matadorIntent(w, t, STEP, memo);
      back = i.moveX < 0;
      if (!back) stepWorld(w, i, { ...NO_INTENT, moveX: -1, sprint: true, pace: SAM_PROFILES.normal.paceFactor }, STEP);
    }
    expect(back).toBe(true);
    expect(t).toBeGreaterThanOrEqual(memo.reactS - STEP);
    expect(t).toBeLessThanOrEqual(memo.reactS + 2 * STEP);
  });

  it('a Sam coming slowly, or not at him, is no reason to drag back', () => {
    const slow = stage({ harrison: [300, 32], sam: [340, 32], ball: [308, 32], samV: -60, touchedBy: 'home' });
    expect(matadorIntent(slow, 0.5, STEP, steady()).moveX).toBeGreaterThanOrEqual(0);
  });

  it('shoots once Sam is behind him, or more than MATADOR.clear away', () => {
    const behind = stage({ harrison: [300, 32], sam: [280, 50], ball: [308, 32], touchedBy: 'home' });
    expect(matadorIntent(behind, 0, STEP, steady()).shootHeld).toBe(true);
    const clear = stage({ harrison: [300, 32], sam: [300 + MATADOR.clear + 20, 32], ball: [308, 32], touchedBy: 'home' });
    expect(matadorIntent(clear, 0, STEP, steady()).shootHeld).toBe(true);
    const close = stage({ harrison: [300, 32], sam: [300 + MATADOR.clear - 15, 32], ball: [308, 32], touchedBy: 'home' });
    expect(matadorIntent(close, 0, STEP, steady()).shootHeld).toBe(false);
  });

  it('facing his own goal after a drag-back, with Sam flown past, he turns back to shoot', () => {
    const w = stage({ harrison: [300, 32], sam: [250, 50], ball: [292, 32], touchedBy: 'home', facing: -1 });
    expect(matadorIntent(w, 0, STEP, steady()).moveX).toBeGreaterThan(0.5);
  });

  it("facing his own goal with Sam standing close by, not flying in, he turns back rather than standing on the ball", () => {
    const w = stage({ harrison: [30, 6], sam: [42, 12], ball: [22, 6], touchedBy: 'home', facing: -1 });
    expect(matadorIntent(w, 0, STEP, steady()).moveX).toBeGreaterThan(0.5);
  });

  it('takes the kickoff shot', () => {
    const w = createWorld({ ...SAM_TUNING_STATS }, { ...SAM_STATS }, 1, { home: 0, away: 0 }, null, null, SAM_PROFILES.normal, SAM_HANDLING);
    w.match.phase = 'playing';
    expect(matadorIntent(w, 0, STEP, steady()).shootHeld).toBe(true);
  });

  it('draws each exchange afresh: reaction 0.05 to 0.4 s, hold 30 to 60 px, charge 0.5 to 0.9 s', () => {
    const lo = matadorMemo(() => 0);
    const hi = matadorMemo(() => 0.999999);
    expect([lo.reactS, lo.holdAt, lo.chargeS]).toEqual([0.05, 30, 0.5]);
    expect(hi.reactS).toBeCloseTo(0.4, 4);
    expect(hi.holdAt).toBeCloseTo(60, 3);
    expect(hi.chargeS).toBeCloseTo(0.9, 4);
  });
});
