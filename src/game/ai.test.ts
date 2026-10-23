import { describe, expect, it } from 'vitest';
import { DIFFICULTY, createBrain, think, type AiProfile } from './ai';
import { BALL_REST_Y } from './ball';
import { NO_INTENT, type Player } from './player';
import type { Aim } from './kick';
import { BASE_STATS } from './stats';
import { createWorld, stepWorld, type World } from './world';

const STEP = 1 / 60;

/** A world in play with the ball and both players placed by hand. */
function scene(ball: { x: number; y?: number; z?: number; vx?: number; vy?: number }, home: number, away: number): World {
  const w = createWorld(BASE_STATS, BASE_STATS, 3, { home: 4, away: DIFFICULTY.normal.aimErrorDeg });
  w.match.phase = 'playing';
  Object.assign(w.ball, { y: BALL_REST_Y, vx: 0, vy: 0, vz: 0, ...ball });
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

  it('turns to face a ball carrier it is close to but facing away from', () => {
    const w = scene({ x: 310 }, 300, 330);
    w.away.facing = 1;
    expect(think(brainFor({ aggression: 1 }), w, w.away, w.home, STEP).moveX).toBeLessThan(0);
  });

  it.each(['easy', 'normal', 'hard'] as const)('on %s it never freezes on its defend spot facing away from an idle Harrison', difficulty => {
    const w = scene({ x: 310 }, 300, 330);
    w.away.facing = 1;
    const brain = createBrain(DIFFICULTY[difficulty]);
    for (let t = 0; t < 5 * 60; t++) stepWorld(w, NO_INTENT, think(brain, w, w.away, w.home, STEP), STEP);
    expect(Math.abs(w.ball.x - 310) > 20 || w.match.score.away > 0).toBe(true);
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

  it('chases a ball off to the side in depth', () => {
    const w = scene({ x: 420, z: 50 }, 100, 500);
    w.away.z = 20;
    const i = think(brainFor(), w, w.away, w.home, STEP);
    expect(i.moveX).toBeLessThan(0);
    expect(i.moveZ).toBeGreaterThan(0);
  });

  it('defends goal-side across the pitch', () => {
    const w = scene({ x: 310, z: 50 }, 300, 450);
    w.home.z = 50;
    w.away.z = 10;
    const brain = brainFor({ aggression: 0 });
    const i = think(brain, w, w.away, w.home, STEP);
    expect(brain.plan).toBe('defend');
    expect(i.moveX).toBeLessThan(0);
    expect(i.moveZ).toBeGreaterThan(0);
    // Its spot: 20 px goal-side, a third of the way from the ball toward its goal's centre.
    Object.assign(w.away, { x: 330, z: 50 + (32 - 50) / 3 });
    brain.nextDecisionS = 0;
    const there = think(brain, w, w.away, w.home, STEP);
    expect([there.moveX, there.moveZ]).toEqual([0, 0]);
  });

  it('goes round a still Harrison between him and the ball', () => {
    for (const z of [32, 10, 54]) {
      const w = scene({ x: 300, z }, 330, 380);
      w.home.z = z;
      w.away.z = z;
      const brain = brainFor();
      let touched = false;
      for (let t = 0; t < 3 * 60 && !touched; t++) {
        stepWorld(w, NO_INTENT, think(brain, w, w.away, w.home, STEP), STEP);
        const max = w.events.kicks[1]!;
        touched = max.touched || max.kicked !== null || max.tackledBall;
      }
      expect(touched, `in line at z ${z}`).toBe(true);
    }
  });

  it('reaches a ball beside a post from the far side of the goal', () => {
    for (const [bx, bz, mx, mz, team] of [
      [21, 14.6, 29, 51, 'away'],
      [21, 14.6, 13, 51, 'home'],
      [619, 50, 625, 8, 'away'],
      [619, 50, 600, 6, 'home'],
    ] as const) {
      const w = scene({ x: bx, z: bz }, 320, 320);
      const [me, them] = team === 'home' ? [w.home, w.away] : [w.away, w.home];
      Object.assign(me, { x: mx, z: mz });
      Object.assign(them, { x: 320, z: 32 });
      const brain = brainFor();
      let reached = false;
      for (let t = 0; t < 4 * 60 && !reached; t++) {
        const i = think(brain, w, me, them, STEP);
        stepWorld(w, team === 'home' ? i : NO_INTENT, team === 'away' ? i : NO_INTENT, STEP);
        reached = Math.hypot(w.ball.x - bx, w.ball.z - bz) > 4;
      }
      expect(reached, `${team} from (${mx}, ${mz}) to the ball at (${bx}, ${bz})`).toBe(true);
    }
  });

  it('plays a ball it cannot get behind, against the fence it defends', () => {
    const w = scene({ x: 7.2, z: 14.3 }, 9, 320);
    w.home.z = 5;
    const brain = brainFor();
    for (let t = 0; t < 3 * 60; t++) stepWorld(w, think(brain, w, w.home, w.away, STEP), NO_INTENT, STEP);
    expect(Math.hypot(w.ball.x - 7.2, w.ball.z - 14.3)).toBeGreaterThan(15);
  });

  it('aims at both posts over many shots', () => {
    const aims: Record<Aim, number> = { far: 0, near: 0, straight: 0 };
    for (let seed = 0; seed < 120; seed++) {
      const w = scene({ x: 170 }, 500, 178);
      w.rng = (() => {
        let a = seed * 7919 + 1;
        return () => ((a = (a * 16807) % 2147483647) / 2147483647);
      })();
      w.away.facing = -1;
      aims[think(brainFor(), w, w.away, w.home, STEP).aim]++;
    }
    expect(aims.far).toBeGreaterThan(aims.near);
    expect(aims.near).toBeGreaterThan(aims.straight);
    expect(aims.straight).toBeGreaterThan(0);
  });

  it('a charge release is never swallowed by a same-tick decision', () => {
    const w = scene({ x: 170 }, 500, 178);
    w.away.facing = -1;
    const brain = brainFor();
    think(brain, w, w.away, w.home, STEP);
    expect(brain.intent.shootHeld).toBe(true);
    brain.chargeLeftS = STEP / 2;
    brain.nextDecisionS = 0;
    expect(think(brain, w, w.away, w.home, STEP).shootHeld).toBe(false);
  });

  it('Max scores against an idle Harrison on every difficulty', () => {
    for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      const w = createWorld(BASE_STATS, BASE_STATS, 7, { home: 4, away: DIFFICULTY[difficulty].aimErrorDeg });
      w.match.kickoffTeam = 'away';
      const brain = createBrain(DIFFICULTY[difficulty]);
      for (let t = 0; t < 30 * 60 && w.match.score.away === 0; t++) stepWorld(w, NO_INTENT, think(brain, w, w.away, w.home, STEP), STEP);
      expect(w.match.score.away, difficulty).toBeGreaterThan(0);
    }
  });

  it.each(['easy', 'normal', 'hard'] as const)(
    'a whole AI-vs-AI match on %s: result, no NaN, both sides score, the ball never rests unreached for over 5 s, and nobody stands still for over 10 s in play',
    difficulty => {
      const goals = { home: 0, away: 0 };
      for (const seed of [21, 22, 23]) {
        const w = createWorld(BASE_STATS, BASE_STATS, seed, { home: DIFFICULTY[difficulty].aimErrorDeg, away: DIFFICULTY[difficulty].aimErrorDeg });
        const home = createBrain(DIFFICULTY[difficulty]);
        const away = createBrain(DIFFICULTY[difficulty]);
        const still = new Map<Player, { x: number; z: number; s: number }>();
        let unreachedS = 0;
        for (let t = 0; w.match.phase !== 'fullTime' && t < 60 * 200; t++) {
          stepWorld(w, think(home, w, w.home, w.away, STEP), think(away, w, w.away, w.home, STEP), STEP);
          for (const v of [w.ball.x, w.ball.y, w.ball.z, w.home.x, w.home.z, w.away.x, w.away.z]) expect(Number.isFinite(v)).toBe(true);
          if (w.match.phase !== 'playing') {
            unreachedS = 0;
            still.clear();
            continue;
          }
          const resting = Math.hypot(w.ball.vx, w.ball.vz) < 1 && w.ball.y <= BALL_REST_Y + 0.5;
          const near = [w.home, w.away].some(p => Math.hypot(p.x - w.ball.x, p.z - w.ball.z) < 16);
          unreachedS = resting && !near ? unreachedS + STEP : 0;
          expect(unreachedS, `seed ${seed}: ball resting unreached at (${w.ball.x.toFixed(1)}, ${w.ball.z.toFixed(1)})`).toBeLessThanOrEqual(5);
          for (const p of [w.home, w.away]) {
            const a = still.get(p);
            if (!a || Math.hypot(p.x - a.x, p.z - a.z) > 2) still.set(p, { x: p.x, z: p.z, s: 0 });
            else a.s += STEP;
            expect(still.get(p)!.s, `seed ${seed}: ${p.team} stuck at (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`).toBeLessThanOrEqual(10);
          }
        }
        expect(w.match.result).not.toBeNull();
        goals.home += w.match.score.home;
        goals.away += w.match.score.away;
      }
      expect(goals.home).toBeGreaterThan(0);
      expect(goals.away).toBeGreaterThan(0);
    },
  );

  it('reaches a ball beside its own side netting past a still Harrison at the goal\u2019s front corner', () => {
    for (const [difficulty, mx, mz] of [
      ['normal', 616.7, 13],
      ['hard', 590, 8],
      ['easy', 600, 6],
    ] as const) {
      const w = scene({ x: 630.7, z: 14.7 }, 607, 590);
      Object.assign(w.home, { z: 16.7 });
      Object.assign(w.away, { x: mx, z: mz });
      const brain = createBrain(DIFFICULTY[difficulty]);
      let moved = false;
      for (let t = 0; t < 4 * 60 && !moved; t++) {
        stepWorld(w, NO_INTENT, think(brain, w, w.away, w.home, STEP), STEP);
        moved = Math.hypot(w.ball.x - 630.7, w.ball.z - 14.7) > 4;
      }
      expect(moved, difficulty).toBe(true);
    }
  });

  /** Plays a match with Harrison parked (or idle where he kicked off); returns the longest the ball sat still in play, and Max's goals. */
  function parkedMatch(difficulty: 'easy' | 'normal' | 'hard', seed: number, park?: { x: number; z: number }): { stuckS: number; maxGoals: number } {
    const w = createWorld(BASE_STATS, BASE_STATS, seed, { home: 4, away: DIFFICULTY[difficulty].aimErrorDeg });
    const brain = createBrain(DIFFICULTY[difficulty]);
    let anchor = { x: w.ball.x, z: w.ball.z, s: 0 };
    let stuckS = 0;
    for (let t = 0; t < 60 * 90 && w.match.phase !== 'fullTime'; t++) {
      if (park && w.match.phase === 'playing') Object.assign(w.home, { ...park, vx: 0, vz: 0 });
      stepWorld(w, NO_INTENT, think(brain, w, w.away, w.home, STEP), STEP);
      if (w.match.phase !== 'playing' || Math.hypot(w.ball.x - anchor.x, w.ball.z - anchor.z) > 4) anchor = { x: w.ball.x, z: w.ball.z, s: 0 };
      else stuckS = Math.max(stuckS, (anchor.s += STEP));
    }
    return { stuckS, maxGoals: w.match.score.away };
  }

  it.each(['easy', 'normal', 'hard'] as const)('on %s, against an idle Harrison, Max always plays the ball and scores', difficulty => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = parkedMatch(difficulty, seed);
      expect(r.stuckS, `seed ${seed}: ball sat still`).toBeLessThanOrEqual(10);
      expect(r.maxGoals, `seed ${seed}: Max never scored`).toBeGreaterThan(0);
    }
  });

  it('reaches a ball in the far pocket beside the goal it attacks, from in front of that goal', () => {
    for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      const w = scene({ x: 11.8, z: 49.4 }, 36, 33);
      Object.assign(w.home, { z: 18 });
      Object.assign(w.away, { z: 27.4 });
      const brain = createBrain(DIFFICULTY[difficulty]);
      let moved = false;
      for (let t = 0; t < 5 * 60 && !moved; t++) {
        Object.assign(w.home, { x: 36, z: 18, vx: 0, vz: 0 });
        stepWorld(w, NO_INTENT, think(brain, w, w.away, w.home, STEP), STEP);
        moved = Math.hypot(w.ball.x - 11.8, w.ball.z - 49.4) > 4;
      }
      expect(moved, difficulty).toBe(true);
    }
  });

  it('against Harrison parked in his goal mouth, the ball never sits still for long', () => {
    for (let seed = 1; seed <= 20; seed++) {
      expect(parkedMatch('normal', seed, { x: 36, z: 32 }).stuckS, `seed ${seed}`).toBeLessThanOrEqual(10);
    }
  });
});
