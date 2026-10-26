import { describe, expect, it } from 'vitest';
import { seeded } from '../engine/random';
import { DIFFICULTY, SLIDE_RANGE, createBrain, think, type AiBrain, type AiProfile } from './ai';
import { BALL_REST_Y } from './ball';
import { inGoalBox } from './field';
import { NO_INTENT, PLAYER_R, type Player, type PlayerIntent } from './player';
import type { Aim } from './kick';
import { METER_MIN_REFILL_S, canStartPower, maxGoal, waveTarget } from './power';
import { BASE_STATS, STAT_NAMES, type StatName, type Stats } from './stats';
import { BRACE_DISTANCE, WAVE_HALF_WIDTH } from './wave';
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
    expect(DIFFICULTY.easy).toEqual({ reactionS: 0.32, aimErrorDeg: 10, aggression: 0.3, shootRange: 150, rushDelayS: 0.3, rushSprint: false, rushPace: 0.75 });
    expect(DIFFICULTY.normal).toMatchObject({ rushDelayS: 0.1, rushSprint: false, rushPace: 1 });
    expect(DIFFICULTY.hard).toEqual({ reactionS: 0.1, aimErrorDeg: 3, aggression: 0.8, shootRange: 210, rushDelayS: 0, rushSprint: true, rushPace: 1 });
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

  /**
   * Plays whole AI-vs-AI matches and checks every guarantee: a result, no NaN, the ball never
   * resting unreached for over 5 s, and nobody standing still for over 10 s in play. With
   * `bothScore`, each side must also score at least once across the seeds.
   */
  function wholeMatches(
    difficulty: 'easy' | 'normal' | 'hard',
    homeStats: Stats,
    awayStats: Stats,
    seeds: readonly number[],
    bothScore: boolean,
    opts: { power?: boolean } = {},
  ): { braced: number; blown: number; waveGoals: number } {
    const goals = { home: 0, away: 0 };
    const waves = { braced: 0, blown: 0, waveGoals: 0 };
    for (const seed of seeds) {
      const kit = opts.power ? { golden: false } : null;
      const w = createWorld({ ...homeStats }, { ...awayStats }, seed, { home: DIFFICULTY[difficulty].aimErrorDeg, away: DIFFICULTY[difficulty].aimErrorDeg }, kit);
      const home = createBrain(DIFFICULTY[difficulty]);
      const away = createBrain(DIFFICULTY[difficulty]);
      const bot = powerBot(home, seed);
      const still = new Map<Player, { x: number; z: number; s: number }>();
      let unreachedS = 0;
      for (let t = 0; w.match.phase !== 'fullTime' && t < 60 * 200; t++) {
        const homeIntent = opts.power ? bot(w) : think(home, w, w.home, w.away, STEP);
        stepWorld(w, homeIntent, think(away, w, w.away, w.home, STEP), STEP);
        for (const v of [w.ball.x, w.ball.y, w.ball.z, w.home.x, w.home.z, w.away.x, w.away.z]) expect(Number.isFinite(v)).toBe(true);
        if (opts.power) {
          for (const g of w.field.goals)
            for (const p of [w.home, w.away]) expect(inGoalBox(g, p.x, p.z, 0), `seed ${seed}: ${p.team} in a goal`).toBe(false);
          if (w.events.power.braced) waves.braced++;
          if (w.events.power.blown) waves.blown++;
          if (w.events.goal === 'home' && w.wave && w.wave.outcome !== 'braced') waves.waveGoals++;
        }
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
      expect(w.match.result, `seed ${seed}`).not.toBeNull();
      goals.home += w.match.score.home;
      goals.away += w.match.score.away;
    }
    if (bothScore) {
      expect(goals.home).toBeGreaterThan(0);
      expect(goals.away).toBeGreaterThan(0);
    }
    return waves;
  }

  /**
   * Test-only Harrison who uses his power move a lot. He plays as the AI,
   * and whenever a power-up can start he holds it (his own seeded generator
   * picks how long). Half the time it plays out as it would: held 0.2 to
   * 2 s, so it's let go early, tackled, or fired. The other half are staged
   * at random ranges, since Max rarely stands far off while Harrison has the
   * ball: Max is put 20 to 260 px down the lane facing him, the charge
   * completes at once, and it's held 0 to 0.6 s more. The meter is refilled
   * whenever no wave is live, to force many waves.
   */
  function powerBot(brain: AiBrain, seed: number): (w: World) => PlayerIntent {
    const rng = seeded(seed * 7 + 1);
    let holdS = 0;
    let staged = false;
    return w => {
      const intent = think(brain, w, w.home, w.away, STEP);
      if (w.power && !w.wave?.live) w.power.meter = 1;
      if (holdS > 0) {
        if (staged && w.home.state === 'poweringUp') w.home.charge = 1;
        holdS -= STEP;
        return { ...NO_INTENT, aim: intent.aim, powerHeld: holdS > 0 };
      }
      if (!canStartPower(w) || w.home.held.power) return intent;
      staged = rng() < 0.5;
      if (staged) {
        const x = Math.min(w.ball.x + 20 + rng() * 240, w.field.fenceR - PLAYER_R);
        Object.assign(w.away, { x, z: w.ball.z + (rng() - 0.5) * 20, facing: -1, vx: 0, vz: 0 });
        holdS = STEP + rng() * 0.6;
      } else {
        holdS = 0.2 + rng() * 1.8;
      }
      return { ...NO_INTENT, aim: intent.aim, powerHeld: true };
    };
  }

  const allAt = (n: number): Stats => Object.fromEntries(STAT_NAMES.map(k => [k, n])) as Record<StatName, number>;

  it.each(['easy', 'normal', 'hard'] as const)(
    'a whole AI-vs-AI match on %s: result, no NaN, both sides score, the ball never rests unreached for over 5 s, and nobody stands still for over 10 s in play',
    difficulty => void wholeMatches(difficulty, BASE_STATS, BASE_STATS, [21, 22, 23], true),
  );

  it.each([
    [10, 10],
    [10, 1],
    [1, 10],
  ] as const)('a whole AI-vs-AI match at stats %s vs %s on normal keeps every guarantee', (home, away) => {
    wholeMatches('normal', allAt(home), allAt(away), [31, 32, 33], home === 10 && away === 10);
  });

  it.each(['easy', 'normal', 'hard'] as const)('with Energy Waves in play on %s, every guarantee holds, and Max both braces and is blown away', difficulty => {
    const waves = wholeMatches(difficulty, BASE_STATS, BASE_STATS, [41, 42, 43], false, { power: true });
    expect(waves.braced).toBeGreaterThan(0);
    expect(waves.blown).toBeGreaterThan(0);
    expect(waves.waveGoals).toBeGreaterThan(0);
  });

  it('with no refills, the meter fills about once or twice in an AI-vs-AI match on Normal', () => {
    const fills: number[][] = [];
    for (const seed of [51, 52, 53, 54, 55]) {
      const w = createWorld(BASE_STATS, BASE_STATS, seed, { home: 6, away: 6 }, { golden: false });
      const home = createBrain(DIFFICULTY.normal);
      const away = createBrain(DIFFICULTY.normal);
      const at: number[] = [];
      for (let t = 0; w.match.phase !== 'fullTime' && t < 60 * 200; t++) {
        stepWorld(w, think(home, w, w.home, w.away, STEP), think(away, w, w.away, w.home, STEP), STEP);
        // He'd use it at once: spend it as a fired wave would, so the next fill counts.
        if (w.power!.meter === 1) {
          at.push(t * STEP);
          w.power!.meter = 0;
        }
      }
      fills.push(at);
    }
    for (const at of fills) {
      expect(at.length, JSON.stringify(fills)).toBeLessThanOrEqual(3);
      for (let i = 1; i < at.length; i++) expect(at[i]! - at[i - 1]!).toBeGreaterThanOrEqual(METER_MIN_REFILL_S);
    }
    expect(fills.filter(at => at.length >= 1).length, JSON.stringify(fills)).toBeGreaterThanOrEqual(3);
  });

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

describe('Max and the power-up', () => {
  const hold: PlayerIntent = { ...NO_INTENT, powerHeld: true };

  /** Harrison on the ball at x 200 with a full meter, about to power up; Max placed by hand. */
  function standoff(max: { x: number; z?: number }, profile: AiProfile = DIFFICULTY.normal): { w: World; brain: AiBrain } {
    const w = createWorld(BASE_STATS, BASE_STATS, 5, { home: 0, away: profile.aimErrorDeg }, { golden: false });
    w.match.phase = 'playing';
    w.power!.meter = 1;
    Object.assign(w.home, { x: 200, z: 32, facing: 1 });
    Object.assign(w.ball, { x: 208, y: BALL_REST_Y, z: 32, vx: 0, vy: 0, vz: 0 });
    Object.assign(w.away, { x: max.x, z: max.z ?? 32, facing: -1 });
    return { w, brain: createBrain(profile) };
  }

  const step = (w: World, brain: AiBrain, home: PlayerIntent = hold) => stepWorld(w, home, think(brain, w, w.away, w.home, STEP), STEP);
  const laneZ = (w: World, x: number, aim: Aim) => {
    const goal = maxGoal(w);
    return w.ball.z + ((waveTarget(goal, aim, w.ball) - w.ball.z) * (x - w.ball.x)) / (goal.lineX - w.ball.x);
  };

  it('when Harrison powers up far away, Max steps into the lane and runs at him', () => {
    const { w, brain } = standoff({ x: 450, z: 12 });
    const far = { ...hold, aim: 'far' as Aim };
    for (let i = 0; i < 30; i++) step(w, brain, far);
    expect(w.home.state).toBe('poweringUp');
    expect(w.away.x).toBeLessThan(420);
    expect(Math.abs(w.away.z - laneZ(w, w.away.x, 'far'))).toBeLessThanOrEqual(WAVE_HALF_WIDTH);
    expect(w.away.facing).toBe(-1);
  });

  it('when Harrison powers up close, Max slides in', () => {
    const { w, brain } = standoff({ x: 230 });
    let slid = false;
    for (let i = 0; i < 40; i++) {
      step(w, brain);
      slid ||= w.away.state === 'sliding';
    }
    expect(slid).toBe(true);
    expect(w.home.state).not.toBe('poweringUp');
  });

  /** Seconds from the press until Max rushes, and until he's inside the bracing distance of the ball. */
  function closeIn(profile: AiProfile): { rushS: number; inRangeS: number } {
    const { w, brain } = standoff({ x: 400 }, profile);
    let rushS = Infinity;
    for (let i = 1; i < 300; i++) {
      step(w, brain);
      if (brain.plan === 'rush') rushS = Math.min(rushS, i * STEP);
      if (w.away.x - w.ball.x < BRACE_DISTANCE + PLAYER_R) return { rushS, inRangeS: i * STEP };
    }
    return { rushS, inRangeS: Infinity };
  }

  it('Easy Max starts later than Hard Max', () => {
    const [easy, normal, hard] = [closeIn(DIFFICULTY.easy), closeIn(DIFFICULTY.normal), closeIn(DIFFICULTY.hard)];
    expect(easy.rushS).toBeGreaterThan(normal.rushS);
    expect(normal.rushS).toBeGreaterThan(hard.rushS);
    // Easy jogs in; Normal runs; Hard sprints.
    expect(easy.inRangeS).toBeGreaterThan(normal.inRangeS);
  });

  /**
   * Seconds between Max coming inside the bracing distance and his tackle
   * ending a held, full power-up: the window to let go and blow him away.
   */
  function releaseWindow(profile: AiProfile, startX: number): number {
    const { w, brain } = standoff({ x: startX }, profile);
    let inRange: number | null = null;
    for (let i = 1; i < 600; i++) {
      step(w, brain);
      if (inRange === null && w.away.x - w.ball.x < BRACE_DISTANCE + PLAYER_R) inRange = i * STEP;
      if (w.home.state !== 'poweringUp') return inRange === null ? 0 : i * STEP - inRange;
    }
    return Infinity;
  }

  it('the release window on Normal is about half a second', () => {
    for (const startX of [400, 500]) {
      const window = releaseWindow(DIFFICULTY.normal, startX);
      expect(window, `from ${startX}`).toBeGreaterThanOrEqual(0.35);
      expect(window, `from ${startX}`).toBeLessThanOrEqual(0.65);
    }
  });

  it("Easy's window is wider than Normal's, and Hard's tighter", () => {
    const [easy, normal, hard] = [DIFFICULTY.easy, DIFFICULTY.normal, DIFFICULTY.hard].map(p => releaseWindow(p, 450));
    expect(easy).toBeGreaterThan(normal + 0.1);
    expect(hard).toBeLessThan(normal - 0.05);
  });

  it('Max never plants and waits while Harrison holds a full charge', () => {
    const { w, brain } = standoff({ x: 500 });
    let minSpeed = Infinity;
    for (let i = 0; i < 120; i++) {
      step(w, brain);
      if (i > 30 && w.home.state === 'poweringUp') minSpeed = Math.min(minSpeed, Math.abs(w.away.vx));
    }
    expect(minSpeed).toBeGreaterThan(50);
  });

  /**
   * Max's AI in the loop: Harrison powers up with Max coming from the far
   * end, and lets go once the charge is full and Max is nearer than `gap`
   * (never, for null). What stopped it, or didn't.
   */
  function standoffOutcome(profile: AiProfile, gap: number | null): 'braced' | 'blown' | 'tackled' | 'none' {
    const w = createWorld(BASE_STATS, BASE_STATS, 9, { home: 0, away: profile.aimErrorDeg }, { golden: false });
    w.match.phase = 'playing';
    w.power!.meter = 1;
    Object.assign(w.home, { x: 60, z: 32, facing: 1 });
    Object.assign(w.ball, { x: 68, y: BALL_REST_Y, z: 32, vx: 0, vy: 0, vz: 0 });
    Object.assign(w.away, { x: 600, z: 32, facing: -1 });
    const brain = createBrain(profile);
    let holding = true;
    for (let i = 0; i < 60 * 8; i++) {
      if (holding && gap !== null && w.home.charge >= 1 && w.away.x - w.ball.x < gap) holding = false;
      stepWorld(w, { ...NO_INTENT, powerHeld: holding }, think(brain, w, w.away, w.home, STEP), STEP);
      if (w.events.power.braced) return 'braced';
      if (w.events.power.blown) return 'blown';
      if (w.events.power.cancelled) return 'tackled';
    }
    return 'none';
  }

  it.each(['easy', 'normal', 'hard'] as const)('on %s, firing at once into a far, square Max is braced', difficulty => {
    for (const gap of [150, 250, 350]) expect(standoffOutcome(DIFFICULTY[difficulty], gap), `gap ${gap}`).toBe('braced');
  });

  it.each(['easy', 'normal', 'hard'] as const)('on %s, firing as Max closes inside the bracing distance blows him away', difficulty => {
    expect(standoffOutcome(DIFFICULTY[difficulty], BRACE_DISTANCE - 10)).toBe('blown');
  });

  it.each(['easy', 'normal', 'hard'] as const)('on %s, holding on too long gets him tackled', difficulty => {
    expect(standoffOutcome(DIFFICULTY[difficulty], null)).toBe('tackled');
  });
});

