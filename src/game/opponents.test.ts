import { describe, expect, it } from 'vitest';
import { maxStats } from '../meta/ladder';
import { DIFFICULTY, createBrain, think, type Difficulty } from './ai';
import { BALL_REST_Y } from './ball';
import { CREW_PROFILES, CREW_STATS, type CrewId } from './crew';
import { NO_INTENT } from './player';
import { opponentProfile, opponentStats } from './opponents';
import { cleanStealOdds } from './steal';
import { BASE_STATS } from './stats';
import { createWorld, placeForKickoff, stepWorld } from './world';

const DIFFS: readonly Difficulty[] = ['easy', 'normal', 'hard'];
const CREW: readonly CrewId[] = ['brick', 'leo', 'tia', 'pete'];
const STEP = 1 / 60;

describe('opponents', () => {
  it('Max goes through the ladder, as today', () => {
    expect(opponentStats('max', 7)).toEqual(maxStats(7));
    for (const d of DIFFS) expect(opponentProfile('max', d)).toBe(DIFFICULTY[d]);
  });

  it('each crew kid plays at their own stats, whatever the rung', () => {
    expect(CREW_STATS).toEqual({
      brick: { speed: 3, power: 4, jump: 2, control: 4 },
      leo: { speed: 4, power: 6, jump: 2, control: 3 },
      tia: { speed: 5, power: 3, jump: 2, control: 6 },
      pete: { speed: 6, power: 4, jump: 3, control: 4 },
    });
    for (const id of CREW) expect(opponentStats(id, 3)).toEqual(CREW_STATS[id]);
  });

  it("each crew profile has its kid's style, and keeps Max's Energy Wave answers", () => {
    const styles = { brick: 'blocker', leo: 'shooter', tia: 'dribbler', pete: 'presser' } as const;
    for (const id of CREW)
      for (const d of DIFFS) {
        const p = opponentProfile(id, d);
        expect(p, `${id} ${d}`).toBe(CREW_PROFILES[id][d]);
        expect(p.style, `${id} ${d}`).toBe(styles[id]);
        expect([p.braceSense, p.backOffS], `${id} ${d}`).toEqual([DIFFICULTY[d].braceSense, DIFFICULTY[d].backOffS]);
      }
  });

  it("every Easy number is gentler than Normal's, and Normal's than Hard's", () => {
    for (const id of CREW) {
      const [e, n, h] = DIFFS.map(d => CREW_PROFILES[id][d]);
      for (const k of ['reactionS', 'aimErrorDeg', 'cleanSteal', 'wrongFootedS'] as const) {
        expect(e![k], `${id} ${k}`).toBeGreaterThanOrEqual(n![k]);
        expect(n![k], `${id} ${k}`).toBeGreaterThanOrEqual(h![k]);
      }
      for (const k of ['paceFactor', 'aggression'] as const) {
        expect(e![k], `${id} ${k}`).toBeLessThanOrEqual(n![k]);
        expect(n![k], `${id} ${k}`).toBeLessThanOrEqual(h![k]);
      }
    }
  });

  it('Sam is a stand-in for now: Pete', () => {
    expect(opponentStats('sam', 1)).toEqual(CREW_STATS.pete);
    for (const d of DIFFS) expect(opponentProfile('sam', d)).toBe(CREW_PROFILES.pete[d]);
  });
});

describe('the fair rules hold against Leo with no new code', () => {
  const leoWorld = (d: Difficulty) => createWorld(BASE_STATS, CREW_STATS.leo, 1, { home: 0, away: 0 }, null, null, CREW_PROFILES.leo[d]);

  it("a steal tap on his ball uses Leo's own clean-steal odds", () => {
    for (const d of DIFFS) expect(cleanStealOdds(leoWorld(d))).toBeCloseTo(CREW_PROFILES.leo[d].cleanSteal, 9);
  });

  it('Harrison running at his own goal with the ball in the keep-out zone shields it', () => {
    const w = leoWorld('normal');
    w.match.phase = 'playing';
    const z = w.field.depth / 2;
    Object.assign(w.home, { x: 100, z, vx: -100, facing: -1 });
    Object.assign(w.ball, { x: 92, y: BALL_REST_Y, z, vx: -100, vy: 0, vz: 0 });
    Object.assign(w.away, { x: 300, z: 10 });
    for (let i = 0; i < 40; i++) {
      stepWorld(w, { ...NO_INTENT, moveX: -1 }, NO_INTENT, STEP);
      expect(w.home.x - w.ball.x, `tick ${i}`).toBeLessThanOrEqual(16);
      expect(w.events.goal, `tick ${i}`).toBeNull();
    }
  });

  it("at Harrison's kickoff Leo waits on his own kickoff spot, and holds it", () => {
    for (const d of DIFFS) {
      const w = leoWorld(d);
      w.match.kickoffTeam = 'home';
      placeForKickoff(w);
      const spot = CREW_PROFILES.leo[d].kickoffSpot;
      expect([w.away.x, w.away.z], d).toEqual([w.field.width / 2 + spot.back, w.field.depth / 2 + spot.off]);
      const brain = createBrain(CREW_PROFILES.leo[d]);
      think(brain, w, w.away, w.home, STEP);
      w.match.phase = 'playing';
      const held = think(brain, w, w.away, w.home, STEP);
      expect([held.moveX, held.moveZ], d).toEqual([0, 0]);
    }
  });
});
