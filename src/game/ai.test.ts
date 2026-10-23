import { describe, expect, it } from 'vitest';
import { DIFFICULTY, createBrain, think, type AiProfile } from './ai';
import { BASE_STATS } from './stats';
import { createWorld, stepWorld, type World } from './world';

const STEP = 1 / 60;

/** A world in play with the ball and both players placed by hand. */
function scene(ball: { x: number; y?: number; vx?: number; vy?: number }, home: number, away: number): World {
  const w = createWorld(BASE_STATS, BASE_STATS, 3, { home: 4, away: DIFFICULTY.normal.aimErrorDeg });
  w.match.phase = 'playing';
  Object.assign(w.ball, { y: 0, vx: 0, vy: 0, ...ball });
  w.home.x = home;
  w.away.x = away;
  return w;
}

const brainFor = (p: Partial<AiProfile> = {}) => createBrain({ ...DIFFICULTY.normal, ...p });

describe('think', () => {
  it('chases a loose ball', () => {
    const w = scene({ x: 400 }, 100, 500);
    expect(think(brainFor(), w, w.away, w.home, STEP).moveX).toBeLessThan(0);
  });

  it('dribbles toward the goal it attacks when it has the ball', () => {
    const w = scene({ x: 390 }, 100, 400);
    w.away.facing = -1;
    const brain = brainFor();
    expect(think(brain, w, w.away, w.home, STEP).moveX).toBeLessThan(0);
    expect(brain.plan).toBe('dribble');
  });

  it('charges and shoots inside shooting range', () => {
    const w = scene({ x: 170 }, 500, 178);
    w.away.facing = -1;
    const brain = brainFor();
    expect(think(brain, w, w.away, w.home, STEP).shootHeld).toBe(true);
    let released = false;
    for (let t = 0; t < 60; t++) released ||= !think(brain, w, w.away, w.home, STEP).shootHeld;
    expect(released).toBe(true);
  });

  it('defends goal-side when Harrison has the ball', () => {
    const w = scene({ x: 310 }, 300, 450);
    const brain = brainFor({ aggression: 0 });
    expect(think(brain, w, w.away, w.home, STEP).moveX).toBeLessThan(0);
    expect(brain.plan).toBe('defend');
    w.away.x = 330;
    brain.nextDecisionS = 0;
    expect(think(brain, w, w.away, w.home, STEP).moveX).toBe(0);
  });

  it('slide-tackles when close and aggressive, then waits out its cooldown', () => {
    const w = scene({ x: 310 }, 300, 330);
    w.away.facing = -1;
    const brain = brainFor({ aggression: 1 });
    const first = think(brain, w, w.away, w.home, STEP);
    expect(first.chipHeld).toBe(true);
    expect(think(brain, w, w.away, w.home, STEP).chipHeld).toBe(false);
    let again = 0;
    for (let t = 0; t < 1.1 * 60; t++) if (think(brain, w, w.away, w.home, STEP).chipHeld) again++;
    expect(again).toBe(0);
  });

  it('only changes its mind every reactionS', () => {
    const w = scene({ x: 400 }, 100, 500);
    const brain = brainFor({ reactionS: 0.2 });
    expect(think(brain, w, w.away, w.home, STEP).moveX).toBeLessThan(0);
    w.ball.x = 600;
    expect(think(brain, w, w.away, w.home, STEP).moveX).toBeLessThan(0);
    for (let t = 0; t < 12; t++) think(brain, w, w.away, w.home, STEP);
    expect(think(brain, w, w.away, w.home, STEP).moveX).toBeGreaterThan(0);
  });

  it('jumps for a high ball overhead', () => {
    const w = scene({ x: 490, y: 40 }, 100, 500);
    const brain = brainFor();
    expect(think(brain, w, w.away, w.home, STEP).jump).toBe(true);
    expect(think(brain, w, w.away, w.home, STEP).jump).toBe(false);
  });

  it('sprints to a distant ball when it has the legs', () => {
    const w = scene({ x: 200 }, 100, 500);
    expect(think(brainFor(), w, w.away, w.home, STEP).sprint).toBe(true);
    w.away.stamina = 0.3;
    expect(think(brainFor(), w, w.away, w.home, STEP).sprint).toBe(false);
  });

  it('difficulty profiles match the plan', () => {
    expect(DIFFICULTY.easy).toEqual({ reactionS: 0.32, aimErrorDeg: 10, aggression: 0.3, shootRange: 150 });
    expect(DIFFICULTY.hard).toEqual({ reactionS: 0.1, aimErrorDeg: 3, aggression: 0.8, shootRange: 210 });
  });

  it('a whole simulated match between two AIs finishes with a result and no exceptions', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 11, { home: 6, away: 6 });
    const home = brainFor();
    const away = brainFor();
    let ticks = 0;
    while (w.match.phase !== 'fullTime' && ticks < 60 * 60 * 5) {
      stepWorld(w, think(home, w, w.home, w.away, STEP), think(away, w, w.away, w.home, STEP), STEP);
      for (const v of [w.ball.x, w.ball.y, w.home.x, w.away.x]) expect(Number.isFinite(v)).toBe(true);
      ticks++;
    }
    expect(w.match.result).not.toBeNull();
    expect(w.match.score.home + w.match.score.away).toBeLessThan(40);
  });
});
