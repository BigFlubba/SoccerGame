import { describe, expect, it } from 'vitest';
import { NO_INTENT, type PlayerIntent } from './player';
import { BASE_STATS } from './stats';
import { BALL_REST_Y } from './ball';
import { createWorld, placeForKickoff, stepWorld } from './world';

const STEP = 1 / 60;
const ERR = { home: 4, away: 6 };
const move = (moveX: number): PlayerIntent => ({ ...NO_INTENT, moveX });

describe('world', () => {
  it('places players for kickoff: home kicks off from beside the ball', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    expect([w.ball.x, w.ball.y]).toEqual([320, BALL_REST_Y]);
    expect([w.home.x, w.home.facing]).toEqual([308, 1]);
    expect([w.away.x, w.away.facing]).toEqual([390, -1]);
  });

  it('when away kicks off, away stands by the ball and home drops back', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    w.match.kickoffTeam = 'away';
    placeForKickoff(w);
    expect([w.away.x, w.away.facing]).toEqual([332, -1]);
    expect([w.home.x, w.home.facing]).toEqual([250, 1]);
  });

  it('stepWorld ignores intents outside play and places players for kickoff', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    stepWorld(w, move(1), move(-1), STEP);
    expect(w.match.phase).toBe('kickoff');
    expect(w.home.x).toBe(308);
    expect([w.ball.x, w.ball.y]).toEqual([320, BALL_REST_Y]);
  });

  it('follows intents once play starts', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    w.match.phase = 'playing';
    stepWorld(w, move(-1), NO_INTENT, STEP);
    expect(w.home.x).toBeLessThan(308);
  });

  it('a ball into the right goal is a home goal, then everyone resets for kickoff', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    w.match.phase = 'playing';
    Object.assign(w.ball, { x: 600, y: 5, vx: 300, vy: 0 });
    let goal = null;
    for (let i = 0; i < 30 && !goal; i++) {
      stepWorld(w, NO_INTENT, NO_INTENT, STEP);
      goal = w.events.goal;
    }
    expect(goal).toBe('home');
    expect(w.match.score).toEqual({ home: 1, away: 0 });
    for (let i = 0; i < 2.1 * 60; i++) stepWorld(w, NO_INTENT, NO_INTENT, STEP);
    expect(w.match.phase).toBe('kickoff');
    expect([w.ball.x, w.ball.y, w.ball.vx]).toEqual([320, BALL_REST_Y, 0]);
    expect(w.away.x).toBe(332);
  });

  it('reports kicks in the world events', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    w.match.phase = 'playing';
    stepWorld(w, { ...NO_INTENT, shootHeld: true }, NO_INTENT, STEP);
    stepWorld(w, NO_INTENT, NO_INTENT, STEP);
    expect(w.events.kicks.some(k => k.kicked === 'shot')).toBe(true);
    expect(w.ball.vx).toBeGreaterThan(100);
  });

  it('a ball contested from both sides squirts out to either side, not always to whoever resolves last', () => {
    const sides = new Set<number>();
    for (let seed = 1; seed <= 8; seed++) {
      const w = createWorld(BASE_STATS, BASE_STATS, seed, ERR);
      w.match.phase = 'playing';
      Object.assign(w.home, { x: 300, vx: 95 });
      Object.assign(w.away, { x: 316, vx: -95, facing: -1 });
      Object.assign(w.ball, { x: 308, y: BALL_REST_Y });
      for (let i = 0; i < 30; i++) stepWorld(w, move(1), move(-1), STEP);
      sides.add(Math.sign(w.ball.x - (w.home.x + w.away.x) / 2));
    }
    expect(sides).toEqual(new Set([-1, 1]));
  });

  it('players can run past each other', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    w.match.phase = 'playing';
    Object.assign(w.ball, { x: 100 });
    Object.assign(w.home, { x: 300 });
    Object.assign(w.away, { x: 330 });
    for (let i = 0; i < 60; i++) stepWorld(w, move(1), move(-1), STEP);
    expect(w.home.x).toBeGreaterThan(w.away.x + 40);
  });

  it.each([604, 606, 608, 610, 612, 618, 624])('a ball resting on the net roof comes down past a player standing at x %i', x => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    w.match.phase = 'playing';
    Object.assign(w.home, { x });
    Object.assign(w.away, { x: 100 });
    Object.assign(w.ball, { x: 620, y: 33 });
    for (let i = 0; i < 5 * 60; i++) stepWorld(w, NO_INTENT, NO_INTENT, STEP);
    expect(w.ball.y).toBeLessThan(28);
  });

  it('two players under a roof ball do not pin it there', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    w.match.phase = 'playing';
    Object.assign(w.home, { x: 616 });
    Object.assign(w.away, { x: 622 });
    Object.assign(w.ball, { x: 619, y: 33 });
    for (let i = 0; i < 5 * 60; i++) stepWorld(w, NO_INTENT, NO_INTENT, STEP);
    expect(w.ball.y).toBe(BALL_REST_Y);
  });

  it('players cannot run behind the nets', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    w.match.phase = 'playing';
    for (let i = 0; i < 10 * 60; i++) stepWorld(w, move(1), move(-1), STEP);
    expect(w.home.x).toBeLessThanOrEqual(628 - 4);
    expect(w.away.x).toBeGreaterThanOrEqual(12 + 4);
  });

  it('knows when the ball is at a player’s feet so B chips', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, ERR);
    w.match.phase = 'playing';
    stepWorld(w, { ...NO_INTENT, chipHeld: true }, NO_INTENT, STEP);
    expect(w.home.state).toBe('chipping');
  });
});
