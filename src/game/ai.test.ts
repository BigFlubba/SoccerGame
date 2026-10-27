import { describe, expect, it } from 'vitest';
import { seeded } from '../engine/random';
import { DIFFICULTY, KICKOFF_HOLD_S, createBrain, think, type AiBrain, type AiProfile } from './ai';
import { BALL_REST_Y } from './ball';
import { inGoalBox } from './field';
import { NO_INTENT, PLAYER_R, type Player, type PlayerIntent } from './player';
import type { Aim } from './kick';
import { METER_MIN_REFILL_S, WAVE_READY_S, canStartPower } from './power';
import { BASE_STATS, STAT_NAMES, type StatName, type Stats } from './stats';
import { BRACE_DISTANCE } from './wave';
import { createWorld, placeForKickoff, stepWorld, type World } from './world';

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

  it('robbed by a steal, Max stands wrong-footed for his beat, never sliding, then challenges again', () => {
    // Harrison has the ball close in front of Max: a Max that always slides would slide at once.
    const w = scene({ x: 288 }, 280, 300);
    w.away.facing = -1;
    const brain = brainFor({ aggression: 1 });
    w.events.steal = 'stole';
    for (let t = 0; t < DIFFICULTY.normal.wrongFootedS - 1e-9; t += STEP) {
      const i = think(brain, w, w.away, w.home, STEP);
      expect([i.moveX, i.moveZ, i.chipHeld], `at ${t.toFixed(3)} s`).toEqual([0, 0, false]);
      w.events.steal = null;
    }
    let challenged = false;
    for (let k = 0; k < 30 && !challenged; k++) {
      const i = think(brain, w, w.away, w.home, STEP);
      challenged = i.chipHeld || i.moveX !== 0;
    }
    expect(challenged).toBe(true);
  });

  it("the brain playing Harrison isn't wrong-footed by his own steal", () => {
    const w = scene({ x: 400 }, 100, 500);
    w.events.steal = 'stole';
    expect(think(brainFor(), w, w.home, w.away, STEP).moveX).toBeGreaterThan(0);
  });

  it("Max holds his spot at Harrison's kickoff until the ball is played, or for 2 s", () => {
    const kickoff = () => {
      const w = createWorld(BASE_STATS, BASE_STATS, 3, { home: 4, away: 6 }, null, null, DIFFICULTY.normal);
      const brain = brainFor({ aggression: 1 });
      think(brain, w, w.away, w.home, STEP);
      w.match.phase = 'playing';
      return { w, brain };
    };
    const { w, brain } = kickoff();
    const start = { x: w.away.x, z: w.away.z };
    for (let t = 0; t < KICKOFF_HOLD_S - 1e-9; t += STEP) {
      const i = think(brain, w, w.away, w.home, STEP);
      expect([i.moveX, i.moveZ, i.chipHeld], `at ${t.toFixed(3)} s`).toEqual([0, 0, false]);
    }
    expect([w.away.x, w.away.z]).toEqual([start.x, start.z]);
    let moved = false;
    for (let k = 0; k < 30 && !moved; k++) moved = think(brain, w, w.away, w.home, STEP).moveX !== 0;
    expect(moved, 'he comes after the timeout').toBe(true);

    const nudged = kickoff();
    nudged.w.ball.x += 2;
    expect(think(nudged.brain, nudged.w, nudged.w.away, nudged.w.home, STEP).moveX).not.toBe(0);
  });

  it('standing at his spot, Max sees Harrison play the kickoff ball and reacts after his reaction time', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 3, { home: 4, away: 6 }, null, null, DIFFICULTY.normal);
    const brain = brainFor({ reactionS: 0.2 });
    think(brain, w, w.away, w.home, STEP);
    w.match.phase = 'playing';
    for (let i = 0; i < 30; i++) think(brain, w, w.away, w.home, STEP);
    w.ball.x += 10;
    for (let t = 0; t < 0.2 - 1e-9; t += STEP) {
      const i = think(brain, w, w.away, w.home, STEP);
      expect([i.moveX, i.moveZ], `at ${t.toFixed(3)} s`).toEqual([0, 0]);
    }
    expect(think(brain, w, w.away, w.home, STEP).moveX).not.toBe(0);
  });

  it('on Easy and Normal Max comes as soon as Harrison winds up at his kickoff; on Hard he waits for the kick', () => {
    for (const d of ['easy', 'normal', 'hard'] as const) {
      const w = createWorld(BASE_STATS, BASE_STATS, 3, { home: 4, away: 6 }, null, null, DIFFICULTY[d]);
      const brain = createBrain(DIFFICULTY[d]);
      think(brain, w, w.away, w.home, STEP);
      w.match.phase = 'playing';
      for (let i = 0; i < 6; i++) think(brain, w, w.away, w.home, STEP);
      w.home.state = 'charging';
      let moved = false;
      for (let t = 0; t < 0.5 && !moved; t += STEP) moved = think(brain, w, w.away, w.home, STEP).moveX !== 0;
      expect(moved, d).toBe(d !== 'hard');
    }
  });

  it("Max doesn't hold at his own kickoff, and Harrison's brain never holds", () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 3, { home: 4, away: 6 }, null, null, DIFFICULTY.normal);
    w.match.kickoffTeam = 'away';
    placeForKickoff(w);
    const [max, harrison] = [brainFor(), brainFor()];
    think(max, w, w.away, w.home, STEP);
    think(harrison, w, w.home, w.away, STEP);
    w.match.phase = 'playing';
    expect(think(harrison, w, w.home, w.away, STEP).moveX).not.toBe(0);
    for (let k = 0; k < 30; k++) think(max, w, w.away, w.home, STEP);
    expect(max.plan).not.toBe('chase');
  });

  it("Max plays at his profile's pace, except backing off from a powered-up Harrison", () => {
    const w = scene({ x: 400 }, 100, 500);
    expect(think(brainFor({ paceFactor: 1.1 }), w, w.away, w.home, STEP).pace).toBe(1.1);
    const powered = createWorld(BASE_STATS, BASE_STATS, 3, { home: 4, away: 6 }, { golden: false });
    powered.match.phase = 'playing';
    powered.power!.activeS = 1;
    const brain = brainFor({ paceFactor: 1.1, braceSense: 1, backOffS: 0 });
    let backing = { ...NO_INTENT };
    for (let i = 0; i < 3; i++) backing = think(brain, powered, powered.away, powered.home, STEP);
    expect(brain.plan).toBe('backOff');
    expect(backing.pace ?? 1).toBe(1);
  });

  it("Max's back-off from a powered-up Harrison keeps its own reaction, whatever his reactions in play", () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 3, { home: 4, away: 6 }, { golden: false });
    w.match.phase = 'playing';
    w.power!.activeS = 1;
    const brain = brainFor({ reactionS: 0.05, backOffS: 0.3, braceSense: 1 });
    let t = 0;
    for (; t < 1 && brain.plan !== 'backOff'; t += STEP) think(brain, w, w.away, w.home, STEP);
    expect(t).toBeCloseTo(0.3, 1);
  });

  it('difficulty profiles match the plan', () => {
    expect(DIFFICULTY.easy).toEqual({
      reactionS: 0.22, aimErrorDeg: 8, aggression: 0.3, shootRange: 150, braceSense: 0.5, backOffS: 0.32,
      cleanSteal: 0.9, wrongFootedS: 0.35, kickoffSpot: { back: 110, off: 20 }, kickoffRush: true, paceFactor: 1,
    });
    expect(DIFFICULTY.normal).toEqual({
      reactionS: 0.16, aimErrorDeg: 6, aggression: 0.55, shootRange: 180, braceSense: 0.75, backOffS: 0.18,
      cleanSteal: 0.75, wrongFootedS: 0.35, kickoffSpot: { back: 110, off: 24 }, kickoffRush: true, paceFactor: 1.03,
    });
    expect(DIFFICULTY.hard).toEqual({
      reactionS: 0.1, aimErrorDeg: 2, aggression: 0.8, shootRange: 210, braceSense: 0.9, backOffS: 0.1,
      cleanSteal: 0.55, wrongFootedS: 0.2, kickoffSpot: { back: 70, off: 0 }, kickoffRush: false, paceFactor: 1.1,
    });
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
   * Test-only Harrison who uses his power move a lot. He plays as the AI;
   * whenever a power-up can start he presses Y, then shoots with X once
   * the wave is ready, up to 2 s later (his own seeded generator picks),
   * so some run out, some are ended by Max, and the rest fire at whatever
   * range they find. Half are staged at random ranges: just before X, Max
   * is put 20 to 260 px down the lane facing him. The meter is refilled
   * whenever no wave is live, to force many waves.
   */
  function powerBot(brain: AiBrain, seed: number): (w: World) => PlayerIntent {
    const rng = seeded(seed * 7 + 1);
    let shootInS = -1;
    let staged = false;
    let lastShoot = false;
    return w => {
      const intent = think(brain, w, w.home, w.away, STEP);
      if (w.power && !w.wave?.live) w.power.meter = 1;
      if (w.power && w.power.activeS > 0 && shootInS >= 0) {
        shootInS -= STEP;
        const shoot = shootInS <= 0 && !lastShoot;
        if (shoot && staged) {
          const x = Math.min(w.ball.x + 20 + rng() * 240, w.field.fenceR - PLAYER_R);
          Object.assign(w.away, { x, z: w.ball.z + (rng() - 0.5) * 20, facing: -1, vx: 0, vz: 0 });
        }
        lastShoot = shoot;
        return { ...intent, shootHeld: shoot };
      }
      lastShoot = false;
      if (!canStartPower(w) || w.home.held.power) return intent;
      staged = rng() < 0.5;
      shootInS = WAVE_READY_S + (staged ? 2 * STEP : rng() * 2);
      return { ...intent, shootHeld: false, powerHeld: true };
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

describe('Max and the Energy Wave', () => {
  /** Harrison on the ball at x 200 with a full meter, Max at maxX facing him; Harrison presses Y. */
  function poweredUp(profile: AiProfile, seed: number, maxX = 240) {
    const w = createWorld(BASE_STATS, BASE_STATS, seed, { home: 0, away: profile.aimErrorDeg }, { golden: false });
    w.match.phase = 'playing';
    w.power!.meter = 1;
    Object.assign(w.home, { x: 200, z: 32, facing: 1 });
    Object.assign(w.ball, { x: 208, y: BALL_REST_Y, z: 32, vx: 0, vy: 0, vz: 0 });
    Object.assign(w.away, { x: maxX, z: 32, facing: -1 });
    const brain = createBrain(profile);
    const step = (home: PlayerIntent = NO_INTENT) => stepWorld(w, home, think(brain, w, w.away, w.home, STEP), STEP);
    step({ ...NO_INTENT, powerHeld: true });
    return { w, brain, step };
  }

  /** Steps until the wave is ready. */
  const untilReady = (w: World, step: (h?: PlayerIntent) => void) => {
    for (let i = 0; i < 120 && !w.events.power.ready; i++) step();
  };

  /** What the wave does to Max once fired; null if it never reached him. */
  const result = (w: World, step: (h?: PlayerIntent) => void): 'braced' | 'blown' | 'none' => {
    for (let i = 0; i < 40; i++) {
      step();
      if (w.events.power.braced) return 'braced';
      if (w.events.power.blown) return 'blown';
    }
    return 'none';
  };

  const sure = (p: AiProfile) => ({ ...p, braceSense: 1 });
  const unsure = { ...DIFFICULTY.normal, braceSense: 0 };

  it('when Harrison powers up, Max backs off to bracing range, facing him, and stands square', () => {
    const { w, step } = poweredUp(sure(DIFFICULTY.normal), 4);
    for (let i = 0; i < 100; i++) step();
    expect(w.away.x - w.ball.x).toBeGreaterThan(BRACE_DISTANCE + PLAYER_R + 20);
    expect(w.away.facing).toBe(-1);
    expect(Math.abs(w.away.vx)).toBeLessThan(5);
  });

  it.each(['easy', 'normal', 'hard'] as const)('on %s, a Max who got it right braces a wave fired from far, square', difficulty => {
    for (const maxX of [360, 460, 560]) {
      const { w, step } = poweredUp(sure(DIFFICULTY[difficulty]), 4, maxX);
      untilReady(w, step);
      step({ ...NO_INTENT, shootHeld: true });
      expect(result(w, step), `from ${maxX}`).toBe('braced');
    }
  });

  it('on Normal, firing as soon as it is ready, a Max who got it right braces it, every time', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const { w, step } = poweredUp(sure(DIFFICULTY.normal), seed);
      untilReady(w, step);
      step({ ...NO_INTENT, shootHeld: true });
      expect(result(w, step), `seed ${seed}`).toBe('braced');
    }
  });

  it('he backs off slower than Harrison sprints: chased down once it is ready and fired from close, he is blown away', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const { w, step } = poweredUp(sure(DIFFICULTY.normal), seed);
      untilReady(w, step);
      let fired = false;
      for (let i = 0; i < 90 && !fired; i++) {
        step({ ...NO_INTENT, moveX: 1, sprint: true, shootHeld: w.away.x - w.ball.x < BRACE_DISTANCE - 10 });
        fired = w.events.power.fired;
      }
      expect(fired, `seed ${seed}`).toBe(true);
      expect(result(w, step), `seed ${seed}`).toBe('blown');
    }
  });

  it('getting it wrong (late, too close, or not backing off), he is mostly blown away by a wave fired as soon as it is ready', () => {
    let blown = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const { w, step } = poweredUp(unsure, seed);
      untilReady(w, step);
      step({ ...NO_INTENT, shootHeld: true });
      if (result(w, step) === 'blown') blown++;
    }
    expect(blown).toBeGreaterThanOrEqual(8);
  });

  it('Easy gets it right about half the time, Normal three in four, Hard nine in ten', () => {
    expect([DIFFICULTY.easy.braceSense, DIFFICULTY.normal.braceSense, DIFFICULTY.hard.braceSense]).toEqual([0.5, 0.75, 0.9]);
  });
});
