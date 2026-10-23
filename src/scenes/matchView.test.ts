import { describe, expect, it } from 'vitest';
import { BASE_STATS } from '../game/stats';
import { createWorld } from '../game/world';
import type { GameArt } from './art';
import { depthSorted } from './depthSort';
import { banner, calloutLine, homeClip, pitchDrawables } from './matchView';

/** Building the list never touches the art; only drawing does. */
const NO_ART = {} as GameArt;

describe('pitchDrawables', () => {
  it('puts both players and the ball at their depths, and every post at its own', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, { home: 4, away: 6 });
    Object.assign(w.home, { z: 10 });
    Object.assign(w.away, { z: 50 });
    Object.assign(w.ball, { z: 27 });
    const zs = pitchDrawables(w, { x: 0 }, NO_ART).map(d => d.z);
    expect(zs).toEqual(expect.arrayContaining([10, 50, 27]));
    expect(zs.filter(z => z === 18)).toHaveLength(4);
    expect(zs.filter(z => z === 46)).toHaveLength(4);
    expect(zs).toHaveLength(11);
  });

  it('a player behind a goal is drawn before its net and crossbar', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, { home: 4, away: 6 });
    const goal = w.field.goals.find(g => g.side === 'right')!;
    Object.assign(w.home, { x: goal.lineX, z: 52 });
    const sorted = depthSorted(pitchDrawables(w, { x: 0 }, NO_ART));
    const him = sorted.findIndex(d => d.z === 52);
    sorted.forEach((d, i) => {
      if (d.z === goal.z1) expect(him).toBeLessThan(i);
    });
  });
});

describe('banner', () => {
  const world = () => createWorld(BASE_STATS, BASE_STATS, 1, { home: 4, away: 6 });
  const moment = (t: number) => ({ t, done: false });

  it('GOAL!!! slams in big once the moment shows its banner', () => {
    const w = world();
    Object.assign(w.match, { phase: 'goal', lastScorer: 'home' });
    expect(banner(w, moment(0.1))).toBeNull();
    expect(banner(w, moment(0.5))).toEqual({ text: 'GOAL!!!', scale: 3 });
  });

  it("Max's goal gets a smaller MAX SCORES", () => {
    const w = world();
    Object.assign(w.match, { phase: 'goal', lastScorer: 'away' });
    expect(banner(w, null)).toEqual({ text: 'MAX SCORES', scale: 2 });
  });

  it('no banner in the goal pause otherwise', () => {
    const w = world();
    Object.assign(w.match, { phase: 'goal', lastScorer: 'home' });
    expect(banner(w, null)).toBeNull();
  });

  it('FULL TIME, KICK OFF and GOLDEN GOAL as before', () => {
    const w = world();
    expect(banner(w, null)).toEqual({ text: 'KICK OFF', scale: 2 });
    w.match.goldenGoal = true;
    expect(banner(w, null)).toEqual({ text: 'GOLDEN GOAL', scale: 2 });
    w.match.phase = 'playing';
    expect(banner(w, null)).toEqual({ text: 'GOLDEN GOAL', scale: 2 });
    w.match.goldenS = 5;
    expect(banner(w, null)).toBeNull();
    w.match.phase = 'fullTime';
    expect(banner(w, null)).toEqual({ text: 'FULL TIME', scale: 2 });
  });
});

describe('homeClip', () => {
  const world = () => createWorld(BASE_STATS, BASE_STATS, 1, { home: 4, away: 6 });

  it('while celebrating without the card, Harrison is drawn with the celebrate clip', () => {
    const w = world();
    const frames = [1.6, 1.8, 2.0, 2.2].map(t => homeClip(w, { t, done: false }));
    for (const f of frames) expect(f.name).toBe('celebrate');
    expect(new Set(frames.map(f => f.frame))).toEqual(new Set([0, 1]));
  });

  it('otherwise his own clip', () => {
    const w = world();
    expect(homeClip(w, null)).toEqual(w.home.anim);
    expect(homeClip(w, { t: 0.5, done: false })).toEqual(w.home.anim);
  });
});

describe('calloutLine', () => {
  it('shows the callout under GOAL!!! once the slam has settled, only during the moment', () => {
    const hud = (t: number | null) => ({ perfect: null, moment: t === null ? null : { t, done: false }, callout: 'HEADER!', trail: [] });
    expect(calloutLine(hud(0.3))).toBeNull();
    expect(calloutLine(hud(0.7))).toBe('HEADER!');
    expect(calloutLine(hud(null))).toBeNull();
    expect(calloutLine({ ...hud(1), callout: null })).toBeNull();
  });
});
