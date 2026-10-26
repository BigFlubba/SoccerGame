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
 * Two scripted Harrisons at the tuning stats, for playing whole boss
 * matches headlessly: the chaser, who runs at the ball wherever it is, and
 * the blocker, who gets between the dog and his goal and shoots early.
 * Biscuit's lesson is that the chaser loses and the blocker can win.
 */

/** The blocker waits this far goal-side of the dog... */
export const BLOCK_AHEAD = 36;
/** ...and slides in when the dog jinks within this far. */
export const SLIDE_AT = 20;
/** He shoots from this close to the line (the kickoff spot is 292 px out), with the dog more than CLEAR away, charging for CHARGE_S. */
export const SHOOT_FROM = 400;
export const CLEAR = 40;
export const CHARGE_S = 0.8;
/**
 * The headless matches' blockers vary as players do, in how fast they react to a jink, so a win
 * rate measures the lesson rather than one fixed script's timing.
 */
const REACT_S = { from: 0.05, spread: 0.3 };

const STEP = 1 / 60;
/** Mixed into a match's seed for its blocker's sharpness. */
const BLOCKER_SEED = 0x5eed;
/** A match with golden goal and every pause runs well under this. */
const MAX_TICKS = 60 * 200;
/** Close enough to a spot to stop. */
const ARRIVE = 3;
/** A carried ball this far behind the blocker is behind him: he turns to slide at it. */
const BALL_BEHIND = 4;
/** Meeting a loose ball, the blocker comes in from this far behind it, until he's this close. */
const BEHIND_BALL = 8;
const MEET_BALL_AT = 14;
/** Dribbling, he swerves round a dog within this far ahead and this close to his line. */
const SWERVE_AHEAD = 60;
const SWERVE_SIDE = 12;
/** The ball counts as still when it moves less than this in a tick. */
const STILL_PX = 0.05;

const rightGoal = (w: World) => w.field.goals.find(g => g.side === 'right')!;
/** Presses alternate with releases, a tick each, so a held button still makes fresh presses. */
const pressNow = (t: number): boolean => Math.round(t / STEP) % 2 === 0;

/** A stick toward (x, z), round a goal's corners as Max goes, sprinting, or still once there. */
function runTo(w: World, x: number, z: number, sprint = true): PlayerIntent {
  const spot = outOfGoals(w, x, z);
  const next = route(w, w.home, spot.x, spot.z);
  const [dx, dz] = [next.x - w.home.x, next.z - w.home.z];
  const d = Math.hypot(dx, dz);
  return d <= ARRIVE ? { ...NO_INTENT } : { ...NO_INTENT, moveX: dx / d, moveZ: dz / d, sprint };
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
  /** How long this blocker takes to react to a jink. */
  reactS: number;
}

/** A blocker who reacts to a jink at once, or, with `rng`, one who takes a human moment. */
export function blockerMemo(rng?: () => number): BlockerMemo {
  return { chargingSinceS: null, jinkSeenS: null, reactS: rng ? REACT_S.from + rng() * REACT_S.spread : 0 };
}

/**
 * A Harrison who, when the dog has the ball, drops to a spot between the dog and his own goal
 * (BLOCK_AHEAD px goal-side of the dog, on the dog's depth), faces him, and slides when the dog is
 * jinking within SLIDE_AT px; otherwise runs the ball at the right goal and, within SHOOT_FROM px of
 * its line with the dog more than CLEAR px away, charges for CHARGE_S and lets go.
 *
 * Waiting, he holds his ground in the dog's lane rather than backing off, so the dog has to come
 * to him. He meets a loose ball from behind, facing the goal, and dribbles round the dog, not into him.
 */
export function blockerIntent(w: World, t: number, memo: BlockerMemo): PlayerIntent {
  const [me, dog, d] = [w.home, w.away, w.dog!];
  if (memo.chargingSinceS !== null) {
    // Charging, he stands and faces the goal: walking on would shove the ball off his foot.
    if (me.state === 'charging' && t - memo.chargingSinceS < CHARGE_S) return { ...NO_INTENT, faceX: 1, shootHeld: true };
    memo.chargingSinceS = null;
    return { ...NO_INTENT };
  }
  if (d.carrying) {
    // He faces up the pitch, so a slide knocks the ball on toward the dog's goal, unless it's behind him.
    const faceX: 1 | -1 = w.ball.x >= me.x - BALL_BEHIND ? 1 : -1;
    memo.jinkSeenS = d.jinkS > 0 ? (memo.jinkSeenS ?? t) : null;
    const seen = memo.jinkSeenS !== null && t - memo.jinkSeenS >= memo.reactS;
    if (seen && Math.abs(dog.x - me.x) <= SLIDE_AT) return { ...NO_INTENT, faceX, chipHeld: pressNow(t) };
    const goalSide = me.x < dog.x;
    // Goal-side and close, he holds his line and only tracks the dog's depth; otherwise he gets there.
    const x = goalSide && dog.x - me.x <= BLOCK_AHEAD ? me.x : dog.x - BLOCK_AHEAD;
    return { ...runTo(w, x, dog.z), faceX };
  }
  if (!ballAtFeet(me, w.ball)) {
    // Behind a loose ball, so he runs onto it facing the goal; once close, straight at it.
    const behind = Math.hypot(w.ball.x - me.x, w.ball.z - me.z) > MEET_BALL_AT && me.x > w.ball.x - BEHIND_BALL;
    return runTo(w, behind ? w.ball.x - BEHIND_BALL : w.ball.x, w.ball.z);
  }
  const goal = rightGoal(w);
  // A dog still shaking off a lost ball, or panting, can't take it either.
  const clear = Math.hypot(dog.x - me.x, dog.z - me.z) > CLEAR || d.regrabS > 0 || d.pantS > 0;
  if (goal.lineX - me.x <= SHOOT_FROM && clear && me.state === 'ground') {
    memo.chargingSinceS = t;
    return { ...NO_INTENT, faceX: 1, shootHeld: true };
  }
  const goalZ = (goal.z0 + goal.z1) / 2;
  // The dog ahead in his lane: swerve wide of him.
  const inTheWay = dog.x > me.x && dog.x - me.x < SWERVE_AHEAD && Math.abs(dog.z - me.z) < SWERVE_SIDE;
  const side = me.z >= dog.z ? 1 : -1;
  const z = inTheWay ? Math.min(Math.max(dog.z + side * SWERVE_SIDE * 2, PLAYER_R), w.field.depth - PLAYER_R) : goalZ;
  return runTo(w, inTheWay ? me.x + SWERVE_AHEAD : goal.lineX, z);
}

export interface BossMatch {
  result: World['match']['result'];
  score: { home: number; away: number };
  /** The longest the ball sat still while in play, seconds. */
  longestStillS: number;
}

/** Plays a whole boss match headlessly at the tuning stats, and reports it from Harrison's side. */
export function bossMatch(d: Difficulty, seed: number, harrison: 'chaser' | 'blocker'): BossMatch {
  const w = createWorld({ ...TUNING_STATS }, { ...BASE_STATS }, seed, { home: HUMAN_AIM_ERROR_DEG, away: 0 }, null, DOG_DIFFICULTY[d]);
  const brain = createDogBrain(DOG_DIFFICULTY[d]);
  const memo = blockerMemo(seeded(seed ^ BLOCKER_SEED));
  let [t, stillS, longestStillS] = [0, 0, 0];
  for (let i = 0; i < MAX_TICKS && w.match.result === null; i++) {
    const home = harrison === 'chaser' ? chaserIntent(w, t) : blockerIntent(w, t, memo);
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
export function playBossMatch(d: Difficulty, seed: number, harrison: 'chaser' | 'blocker'): 'win' | 'draw' | 'lose' {
  return bossMatch(d, seed, harrison).result ?? 'draw';
}
