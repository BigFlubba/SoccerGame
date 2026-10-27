import { seeded } from '../engine/random';
import { outOfGoals, route } from './ai';
import { DOG_DIFFICULTY, TUNING_STATS, type Difficulty } from './dog';
import { createDogBrain, dogThink } from './dogAi';
import { HUMAN_AIM_ERROR_DEG } from './kick';
import { NO_INTENT, PLAYER_R, type PlayerIntent } from './player';
import { BASE_STATS } from './stats';
import { createWorld, stepWorld, type World } from './world';
import { ballAtFeet } from './zones';

/**
 * Three scripted Harrisons at the tuning stats, for playing whole boss
 * matches headlessly: the chaser, who runs at the ball wherever it is; the
 * blocker, who gets between the dog and his goal and shoots early; and the
 * freezer, who stands still on the ball. Biscuit's lesson is that the
 * chaser and the freezer lose and the blocker can win.
 */

/** The blocker waits this far goal-side of the dog... */
export const BLOCK_AHEAD = 36;
/** ...and slides in when the dog jinks within this far. */
export const SLIDE_AT = 20;
/** He shoots from this close to the line (the kickoff spot is 292 px out), with the dog more than CLEAR away, charging for CHARGE_S (a fixed script's hold). */
export const SHOOT_FROM = 400;
export const CLEAR = 40;
export const CHARGE_S = 0.8;
/**
 * The headless matches' blockers vary as players do, in how fast they react to each jink (and follow
 * its cut only once they have), so a win rate measures the lesson rather than one fixed script's timing.
 */
const REACT_S = { from: 0.05, spread: 0.4 };
/** ...and in how far off they wait for him, each time he has the ball... */
const HOLD_AT = { from: 26, spread: 20 };
/** ...and in how long they hold each shot, s. */
const CHARGE = { from: 0.5, spread: 0.4 };

const STEP = 1 / 60;
/** Mixed into a match's seed for its blocker's sharpness. */
const BLOCKER_SEED = 0x5eed;
/** 90 s of play plus a pause for every goal, and golden goal: even a 40-goal match runs well under this. */
const MAX_TICKS = 60 * 400;
/** Close enough to a spot to stop. */
const ARRIVE = 3;
/** A carried ball this far behind the blocker is behind him: he turns to slide at it. */
const BALL_BEHIND = 4;
/** Meeting a loose ball, the blocker comes in from this far behind it; on its wrong side (not FOOT_AHEAD in front of him), round it this wide. */
const BEHIND_BALL = 8;
const FOOT_AHEAD = 2;
const ROUND_BALL = 12;
/** Dribbling, he swerves round a dog within this far ahead and this close to his line. */
const SWERVE_AHEAD = 60;
const SWERVE_SIDE = 12;
/** The blocker winds up a shot only once the ball at his feet is slower than this, px/s... */
const SETTLED_SPEED = 40;
/** ...gathering it by slowing over this last stretch, px, so his touches don't knock it on. */
const GATHER_EASE = 24;
/** This close to the goal line, he taps the ball in rather than winding up. */
const TAP_IN_FROM = 40;
/** The ball counts as still when it moves less than this in a tick. */
const STILL_PX = 0.05;

const rightGoal = (w: World) => w.field.goals.find(g => g.side === 'right')!;
/** Presses alternate with releases, a tick each, so a held button still makes fresh presses. */
const pressNow = (t: number): boolean => Math.round(t / STEP) % 2 === 0;

/**
 * A stick toward (x, z), round a goal's corners as Max goes, sprinting, or still once there;
 * with `easeOver`, slowing over that last stretch, as a player gathering a ball does.
 */
function runTo(w: World, x: number, z: number, sprint = true, easeOver = 0): PlayerIntent {
  const spot = outOfGoals(w, x, z);
  const next = route(w, w.home, spot.x, spot.z);
  const [dx, dz] = [next.x - w.home.x, next.z - w.home.z];
  const d = Math.hypot(dx, dz);
  const pace = easeOver > 0 ? Math.min(1, d / easeOver) : 1;
  return d <= ARRIVE ? { ...NO_INTENT } : { ...NO_INTENT, moveX: (dx / d) * pace, moveZ: (dz / d) * pace, sprint };
}

/** Behind the ball, off its line on his side of it (the other where the boards are too close), so he passes it without a touch. */
function roundBall(w: World): { x: number; z: number } {
  const [me, b] = [w.home, w.ball];
  const lo = PLAYER_R;
  const hi = w.field.depth - PLAYER_R;
  const side = me.z >= b.z ? 1 : -1;
  const z = Math.min(Math.max(b.z + side * ROUND_BALL, lo), hi);
  return { x: b.x - BEHIND_BALL, z: Math.abs(z - b.z) >= ROUND_BALL / 2 ? z : Math.min(Math.max(b.z - side * ROUND_BALL, lo), hi) };
}

/** A Harrison who runs at the ball wherever it is, sprinting, and shoots as soon as it's at his feet (facing the dog's goal: else he gets behind it first). */
export function chaserIntent(w: World, t: number): PlayerIntent {
  if (!ballAtFeet(w.home, w.ball)) return runTo(w, w.ball.x, w.ball.z);
  if (w.home.facing === 1) return { ...NO_INTENT, sprint: true, shootHeld: pressNow(t) };
  return runTo(w, w.ball.x - BEHIND_BALL, w.ball.z);
}

export interface BlockerMemo {
  chargingSinceS: number | null;
  /** When he first saw the current jink. */
  jinkSeenS: number | null;
  /** How long he takes to react to the current jink. */
  reactS: number;
  /** How far goal-side of the dog he waits this time: BLOCK_AHEAD, or drawn each time the dog has the ball. */
  holdAt: number;
  /** Whether the dog had the ball last tick, to draw a new holdAt when he takes it. */
  dogHad: boolean;
  /** The depth he guards: the dog's, held where it was through a jink until he reacts to it. */
  laneZ: number;
  /** How long he holds the current shot: CHARGE_S, or drawn for each shot. */
  chargeS: number;
  /** Draws each jink's reaction, hold distance and shot; none means a fixed script. */
  rng: (() => number) | null;
}

/** A blocker who reacts to a jink at once, or, with `rng`, one who takes a human moment, different every time. */
export function blockerMemo(rng?: () => number): BlockerMemo {
  return { chargingSinceS: null, jinkSeenS: null, reactS: 0, rng: rng ?? null, holdAt: BLOCK_AHEAD, dogHad: false, chargeS: CHARGE_S, laneZ: 0 };
}

/** Winds up a shot at the right goal, held for CHARGE_S or, with an rng, a human's varying hold. */
function startCharge(memo: BlockerMemo, t: number): PlayerIntent {
  memo.chargingSinceS = t;
  memo.chargeS = memo.rng ? CHARGE.from + memo.rng() * CHARGE.spread : CHARGE_S;
  return { ...NO_INTENT, faceX: 1, shootHeld: true };
}

/** Holds the shot until its time is up, then lets go; null once he isn't charging. */
function holdCharge(w: World, t: number, memo: BlockerMemo): PlayerIntent | null {
  if (memo.chargingSinceS === null) return null;
  if (w.home.state === 'charging' && t - memo.chargingSinceS < memo.chargeS) return { ...NO_INTENT, faceX: 1, shootHeld: true };
  memo.chargingSinceS = null;
  return { ...NO_INTENT };
}

/**
 * A Harrison who, when the dog has the ball, drops to a spot between the dog and his own goal
 * (BLOCK_AHEAD px goal-side of the dog, on the dog's depth), faces him, and slides when the dog is
 * jinking within SLIDE_AT px; otherwise runs the ball at the right goal and, within SHOOT_FROM px of
 * its line with the dog more than CLEAR px away, gathers it, charges and lets go; at the goal's
 * mouth he taps it in.
 *
 * Waiting, he holds his ground in the dog's lane rather than backing off, so the dog has to come
 * to him. He meets a loose ball from behind, facing the goal (round it, not through it, from its
 * wrong side), and dribbles round the dog, not into him.
 */
export function blockerIntent(w: World, t: number, memo: BlockerMemo): PlayerIntent {
  const [me, dog, d] = [w.home, w.away, w.dog!];
  // Charging, he stands and faces the goal: walking on would shove the ball off his foot.
  const held = holdCharge(w, t, memo);
  if (held) return held;
  if (d.carrying && !memo.dogHad && memo.rng) memo.holdAt = HOLD_AT.from + memo.rng() * HOLD_AT.spread;
  memo.dogHad = d.carrying;
  if (d.carrying) {
    // He faces up the pitch, so a slide knocks the ball on toward the dog's goal, unless it's behind him.
    const faceX: 1 | -1 = w.ball.x >= me.x - BALL_BEHIND ? 1 : -1;
    if (d.jinkS > 0 && memo.jinkSeenS === null) memo.reactS = memo.rng ? REACT_S.from + memo.rng() * REACT_S.spread : 0;
    memo.jinkSeenS = d.jinkS > 0 ? (memo.jinkSeenS ?? t) : null;
    const seen = memo.jinkSeenS !== null && t - memo.jinkSeenS >= memo.reactS;
    if (seen && Math.abs(dog.x - me.x) <= SLIDE_AT) return { ...NO_INTENT, faceX, chipHeld: pressNow(t) };
    // He follows the dog's depth, but the jink's cut only once he's reacted to it.
    if (memo.jinkSeenS === null || seen) memo.laneZ = dog.z;
    const goalSide = me.x < dog.x;
    // Goal-side and close, he holds his line and only tracks the dog's depth; otherwise he gets there.
    const x = goalSide && dog.x - me.x <= memo.holdAt ? me.x : dog.x - memo.holdAt;
    return { ...runTo(w, x, memo.laneZ), faceX };
  }
  const goal = rightGoal(w);
  // In range he gathers the ball softly to shoot: running onto it at speed would only knock it on again.
  const inRange = goal.lineX - me.x <= SHOOT_FROM;
  // On the wrong side of the ball he goes round it, not through it, to take it facing the goal.
  if (me.x > w.ball.x - FOOT_AHEAD) {
    const round = roundBall(w);
    return runTo(w, round.x, round.z);
  }
  if (!ballAtFeet(me, w.ball)) return runTo(w, w.ball.x, w.ball.z, true, inRange ? GATHER_EASE : 0);
  // A dog still shaking off a lost ball, or panting, can't take it either.
  const clear = Math.hypot(dog.x - me.x, dog.z - me.z) > CLEAR || d.regrabS > 0 || d.pantS > 0;
  // He only winds up with the ball under control: a ball still rolling away would be gone by the strike.
  const settled = Math.hypot(w.ball.vx, w.ball.vz) < SETTLED_SPEED;
  // At the goal's mouth he just taps it in.
  if (goal.lineX - me.x <= TAP_IN_FROM) return { ...NO_INTENT, faceX: 1, shootHeld: pressNow(t) };
  if (inRange && clear && settled && me.state === 'ground') return startCharge(memo, t);
  if (!settled) return runTo(w, w.ball.x - BEHIND_BALL, w.ball.z, false, GATHER_EASE);
  const goalZ = (goal.z0 + goal.z1) / 2;
  // The dog ahead in his lane: swerve wide of him.
  const inTheWay = dog.x > me.x && dog.x - me.x < SWERVE_AHEAD && Math.abs(dog.z - me.z) < SWERVE_SIDE;
  const side = me.z >= dog.z ? 1 : -1;
  const z = inTheWay ? Math.min(Math.max(dog.z + side * SWERVE_SIDE * 2, PLAYER_R), w.field.depth - PLAYER_R) : goalZ;
  return runTo(w, inTheWay ? me.x + SWERVE_AHEAD : goal.lineX, z);
}

/**
 * The freezer stands still on the ball while the dog is this close, and shoots once he's further off:
 * further than the dog stands at Harrison's kickoff (82 px), so his test measures standing still,
 * not the kickoff shot every strategy gets.
 */
export const FREEZE_NEAR = 100;

/**
 * A Harrison who, with the ball, stands still on it while the dog is within FREEZE_NEAR and takes a
 * full charged shot once he's further off; without it, chases like the chaser. Standing on the ball
 * must not beat the dog: the snatch's dwell is his answer to it.
 */
export function freezerIntent(w: World, t: number, memo: BlockerMemo): PlayerIntent {
  const me = w.home;
  const held = holdCharge(w, t, memo);
  if (held) return held;
  if (!ballAtFeet(me, w.ball)) return chaserIntent(w, t);
  if (Math.hypot(w.away.x - me.x, w.away.z - me.z) <= FREEZE_NEAR || me.state !== 'ground') return { ...NO_INTENT };
  return startCharge(memo, t);
}

export type ScriptedHarrison = 'chaser' | 'blocker' | 'freezer';

export interface BossMatch {
  result: World['match']['result'];
  score: { home: number; away: number };
  /** The longest the ball sat still while in play, seconds. */
  longestStillS: number;
}

/** Plays a whole boss match headlessly at the tuning stats, and reports it from Harrison's side. */
export function bossMatch(d: Difficulty, seed: number, harrison: ScriptedHarrison): BossMatch {
  const w = createWorld({ ...TUNING_STATS }, { ...BASE_STATS }, seed, { home: HUMAN_AIM_ERROR_DEG, away: 0 }, null, DOG_DIFFICULTY[d]);
  const brain = createDogBrain(DOG_DIFFICULTY[d]);
  const memo = blockerMemo(seeded(seed ^ BLOCKER_SEED));
  let [t, stillS, longestStillS] = [0, 0, 0];
  for (let i = 0; i < MAX_TICKS && w.match.result === null; i++) {
    const home = harrison === 'chaser' ? chaserIntent(w, t) : harrison === 'freezer' ? freezerIntent(w, t, memo) : blockerIntent(w, t, memo);
    const [x, y, z] = [w.ball.x, w.ball.y, w.ball.z];
    stepWorld(w, home, dogThink(brain, w, STEP), STEP);
    t += STEP;
    const still = Math.hypot(w.ball.x - x, w.ball.y - y, w.ball.z - z) < STILL_PX;
    stillS = w.match.phase === 'playing' && still ? stillS + STEP : 0;
    longestStillS = Math.max(longestStillS, stillS);
  }
  return { result: w.match.result, score: { ...w.match.score }, longestStillS };
}

/** Plays a whole boss match headlessly and returns the result from Harrison's side. */
export function playBossMatch(d: Difficulty, seed: number, harrison: ScriptedHarrison): 'win' | 'draw' | 'lose' {
  return bossMatch(d, seed, harrison).result ?? 'draw';
}
