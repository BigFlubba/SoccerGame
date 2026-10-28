import { seeded } from '../engine/random';
import { createBrain, think, type Difficulty } from './ai';
import { pressNow, roundBall, runTo } from './dogScripts';
import { HUMAN_AIM_ERROR_DEG } from './kick';
import type { MaxMatch } from './maxScripts';
import { NO_INTENT, PLAYER_R, type PlayerIntent } from './player';
import { SAM_HANDLING, SAM_PROFILES, SAM_STATS } from './sam';
import type { Stats } from './stats';
import { inStealReach, maxHasBall } from './steal';
import { createWorld, stepWorld, type World } from './world';
import { REACH_Z, ballAtFeet } from './zones';

/**
 * Two scripted Harrisons at the tuning stats, for playing whole matches
 * against Speedy Sam headlessly: the racer, who races him for every ball;
 * and the matador, who waits goal-side, steps into the gaps in his dribble
 * with the steal, drags the ball back as he flies in, and shoots early.
 * Sam's lesson is that the racer loses and the matador can win.
 */

/** One level above Pete's: what Harrison can afford by the time he meets Sam. */
export const SAM_TUNING_STATS: Readonly<Stats> = { speed: 7, power: 5, jump: 4, control: 5 };

/**
 * The racer slides at Sam's ball within `slideAt` px of it, and shoots within `shootFrom` px of the line,
 * holding the shot `chargeS`: each the middle of what he draws, exchange by exchange (RACER_DRAWS).
 */
export const RACER = { slideAt: 26, shootFrom: 300, chargeS: 0.7 };
/** The racer varies as players do: when he dives in (px from Sam's ball) and how long he holds each shot (s). */
const RACER_DRAWS = { slideAt: { from: 18, spread: 16 }, chargeS: { from: 0.5, spread: 0.4 } };

/**
 * The matador sees Sam flying in at his ball within `seeAt` px of it, faster
 * than `closing` px/s, and drags it back a reaction later; Sam on its far
 * side or `near` px of a loose ball counts as Sam's to defend. He shoots
 * from within `shootFrom` px of the line once Sam is behind him or more
 * than `clear` px away.
 */
export const MATADOR = { seeAt: 105, closing: 150, near: 40, shootFrom: 400, clear: 150 };
/** A ball sitting still this long, this close to him (wedged in a corner, say), he goes straight at it and pokes it, as a kid would. */
const UNSTICK = { afterS: 1, within: 40 };

/** Each exchange the matador draws how fast he reacts to Sam flying in, s... */
const REACT_S = { from: 0.05, spread: 0.35 };
/** ...how far ahead of Sam he waits, px... */
const HOLD_AT = { from: 30, spread: 30 };
/** ...and how long he holds each shot, s. */
const CHARGE = { from: 0.5, spread: 0.4 };

const STEP = 1 / 60;
/** Mixed into a match's seed for its matador's draws. */
const MATADOR_SEED = 0x5a3;
/** 90 s of play plus a pause for every goal, and golden goal: even a 40-goal match runs well under this. */
const MAX_TICKS = 60 * 400;
/** The ball counts as still when it moves less than this in a tick. */
const STILL_PX = 0.05;
/** The ball is still on the centre spot within this, px. */
const ON_SPOT = 0.5;
/** A ball on the wrong side of him by this much is behind him, px. */
const FOOT_AHEAD = 2;
/** He winds up a shot only once the ball at his feet is slower than this, px/s, gathering it over the last stretch, px. */
const SETTLED_SPEED = 40;
const GATHER_EASE = 24;
const BEHIND_BALL = 8;

const rightGoal = (w: World) => w.field.goals.find(g => g.side === 'right')!;
const onSpot = (w: World): boolean => Math.hypot(w.ball.x - w.field.width / 2, w.ball.z - w.field.depth / 2) <= ON_SPOT;
const settled = (w: World): boolean => Math.hypot(w.ball.vx, w.ball.vz) < SETTLED_SPEED;
const toGoal = (w: World): number => rightGoal(w).lineX - w.home.x;

/** Without the ball: round it from its wrong side (or, with no room round it by the fence, play it from there), else run onto it, gathering it softly in shooting range. */
function fetchBall(w: World, shootFrom: number): PlayerIntent {
  if (w.home.x > w.ball.x - FOOT_AHEAD) {
    const round = roundBall(w);
    if (round.x < w.field.fenceL + PLAYER_R) return runTo(w, w.ball.x, w.ball.z);
    return runTo(w, round.x, round.z);
  }
  return runTo(w, w.ball.x, w.ball.z, true, toGoal(w) <= shootFrom ? GATHER_EASE : 0);
}

/** With the ball facing Sam's goal and nothing to wait for: gather a rolling ball, else run it at the goal. */
function carryOn(w: World): PlayerIntent {
  if (!settled(w)) return runTo(w, w.ball.x - BEHIND_BALL, w.ball.z, false, GATHER_EASE);
  const goal = rightGoal(w);
  return runTo(w, goal.lineX, (goal.z0 + goal.z1) / 2);
}

/**
 * A Harrison who races Sam for every ball: he sprints at it wherever it is,
 * slides at Sam head-on once he's within slideAt of Sam's ball, and shoots
 * as soon as he has the ball within RACER.shootFrom of the goal. He never
 * taps steal, never pulls the stick back with the ball and never waits.
 */
export interface RacerMemo {
  /** How close to Sam's ball he dives in, and how long he holds his shot, this exchange. */
  slideAt: number;
  chargeS: number;
  /** Whether Sam had the ball last tick, to draw afresh when he takes it. */
  samHad: boolean;
  rng: (() => number) | null;
}

/** A racer at the middle of his draws every time, or, with `rng`, one who varies exchange by exchange. */
export function racerMemo(rng?: () => number): RacerMemo {
  return { slideAt: RACER.slideAt, chargeS: RACER.chargeS, samHad: false, rng: rng ?? null };
}

export function racerIntent(w: World, t: number, memo: RacerMemo = racerMemo()): PlayerIntent {
  const [me, ball] = [w.home, w.ball];
  const samHas = maxHasBall(w.away, ball);
  if (samHas && !memo.samHad && memo.rng) {
    memo.slideAt = RACER_DRAWS.slideAt.from + memo.rng() * RACER_DRAWS.slideAt.spread;
    memo.chargeS = RACER_DRAWS.chargeS.from + memo.rng() * RACER_DRAWS.chargeS.spread;
  }
  memo.samHad = samHas;
  if (me.state === 'charging') return { ...NO_INTENT, faceX: 1, shootHeld: me.stateT < memo.chargeS };
  if (samHas && Math.hypot(ball.x - me.x, ball.z - me.z) <= memo.slideAt && Math.abs(ball.z - me.z) <= REACH_Z) {
    return { ...NO_INTENT, faceX: ball.x >= me.x ? 1 : -1, chipHeld: pressNow(t) };
  }
  if (!ballAtFeet(me, ball) || me.facing !== 1) return fetchBall(w, RACER.shootFrom);
  if (toGoal(w) <= RACER.shootFrom && settled(w) && me.state === 'ground') return { ...NO_INTENT, faceX: 1, shootHeld: true };
  return carryOn(w);
}

export interface MatadorMemo {
  /** When he started the shot he's charging; null when he isn't. */
  chargingSinceS: number | null;
  /** How long he holds this shot. */
  chargeS: number;
  /** When he first saw Sam flying in at his ball this time; null when Sam isn't. */
  seenS: number | null;
  /** How long he takes to drag back this time. */
  reactS: number;
  /** How far ahead of Sam he waits this time. */
  holdAt: number;
  /** Whether Sam had the ball last tick, to draw a new holdAt when he takes it. */
  samHad: boolean;
  /** Where the ball was last tick, and how long it has sat still. */
  lastBall: { x: number; z: number };
  stillS: number;
  rng: () => number;
}

export function matadorMemo(rng: () => number): MatadorMemo {
  return { chargingSinceS: null, chargeS: CHARGE.from + rng() * CHARGE.spread, seenS: null, reactS: REACT_S.from + rng() * REACT_S.spread, holdAt: HOLD_AT.from + rng() * HOLD_AT.spread, samHad: false, lastBall: { x: 0, z: 0 }, stillS: 0, rng };
}

function startCharge(memo: MatadorMemo, t: number): PlayerIntent {
  memo.chargingSinceS = t;
  memo.chargeS = CHARGE.from + memo.rng() * CHARGE.spread;
  return { ...NO_INTENT, faceX: 1, shootHeld: true };
}

/** With the ball: drag it back as Sam flies in, turn back once he's past, and shoot early once he's behind him or clear. */
function onTheBall(w: World, t: number, memo: MatadorMemo): PlayerIntent {
  const [me, sam, ball] = [w.home, w.away, w.ball];
  const gap = Math.hypot(sam.x - me.x, sam.z - me.z);
  const past = sam.x < me.x;
  if (me.facing === -1) {
    // Facing his own goal after a drag-back: once Sam has flown past (or is well off), he turns back to Sam's goal.
    memo.seenS = null;
    return past || gap > MATADOR.clear ? { ...NO_INTENT, moveX: 1 } : { ...NO_INTENT };
  }
  const [dx, dz] = [ball.x - sam.x, ball.z - sam.z];
  const toBall = Math.hypot(dx, dz) || 1;
  const closing = (sam.vx * dx + sam.vz * dz) / toBall;
  const flyingIn = !past && toBall <= MATADOR.seeAt && closing > MATADOR.closing;
  if (flyingIn && memo.seenS === null) {
    memo.seenS = t;
    memo.reactS = REACT_S.from + memo.rng() * REACT_S.spread;
  }
  if (!flyingIn) memo.seenS = null;
  if (memo.seenS !== null) return t - memo.seenS >= memo.reactS ? { ...NO_INTENT, moveX: -1 } : { ...NO_INTENT, faceX: 1 };
  const clear = past || gap > MATADOR.clear;
  if (clear && toGoal(w) <= MATADOR.shootFrom && settled(w) && me.state === 'ground') return startCharge(memo, t);
  return carryOn(w);
}

/**
 * A Harrison who answers Sam: when Sam has the ball, or it's loose near him,
 * he stands goal-side in Sam's lane, holdAt ahead of him, facing him, and
 * waits, tapping steal whenever the ball is in his reach but not at Sam's
 * feet (the gap between Sam's touches, or a slow range shot rolling past).
 * With the ball he drags it back a reaction after Sam comes flying in, turns
 * back once Sam has flown past, and shoots once Sam is behind him or clear.
 * He takes the kickoff shot.
 */
export function matadorIntent(w: World, t: number, dt: number, memo: MatadorMemo): PlayerIntent {
  const [me, sam, ball] = [w.home, w.away, w.ball];
  memo.stillS = Math.hypot(ball.x - memo.lastBall.x, ball.z - memo.lastBall.z) < STILL_PX ? memo.stillS + dt : 0;
  memo.lastBall = { x: ball.x, z: ball.z };
  if (memo.chargingSinceS !== null) {
    if (me.state === 'charging' && t - memo.chargingSinceS < memo.chargeS) return { ...NO_INTENT, faceX: 1, shootHeld: true };
    memo.chargingSinceS = null;
    return { ...NO_INTENT };
  }
  const kickoff = w.match.phase === 'playing' && w.match.kickoffTeam === 'home' && onSpot(w);
  if (kickoff && me.state === 'ground' && ballAtFeet(me, ball)) return startCharge(memo, t);
  // Stuck still beside him, wedged by bodies and fences: he goes straight at it, facing it, and pokes it.
  if (memo.stillS >= UNSTICK.afterS && Math.hypot(ball.x - me.x, ball.z - me.z) <= UNSTICK.within && !maxHasBall(me, ball)) {
    const faceX: 1 | -1 = ball.x >= me.x ? 1 : -1;
    return { ...runTo(w, ball.x, ball.z, false), faceX, steal: me.stealCooldownS === 0 && me.facing === faceX && inStealReach(w) };
  }
  const samHas = maxHasBall(sam, ball);
  if (samHas && !memo.samHad) memo.holdAt = HOLD_AT.from + memo.rng() * HOLD_AT.spread;
  memo.samHad = samHas;
  // Sam's ball, or one he didn't play last, in his reach and not at Sam's feet: the gap, or a slow shot rolling by.
  if (me.stealCooldownS === 0 && (samHas || ball.touchedBy !== 'home') && inStealReach(w) && !ballAtFeet(sam, ball)) return { ...NO_INTENT, faceX: 1, steal: true };
  if (maxHasBall(me, ball)) return onTheBall(w, t, memo);
  memo.seenS = null;
  // A loose ball is Sam's to defend only near him and in front of him, with room goal-side of him:
  // one behind him (by his own goal) or by Harrison's own goal is a ball to go and play.
  const ownLine = w.field.goals.find(g => g.side === 'left')!.lineX;
  const inFront = ownLine + 2 * PLAYER_R + 1;
  const room = sam.x - memo.holdAt >= inFront;
  const looseNear = Math.hypot(ball.x - sam.x, ball.z - sam.z) <= MATADOR.near && ball.x <= sam.x && room;
  // A ball that has got past him toward his own goal, still in front of it: he turns and goes for it.
  if ((!samHas && !looseNear) || (ball.x < me.x && ball.x > inFront)) return fetchBall(w, MATADOR.shootFrom);
  // Goal-side and close, he holds his line and only tracks Sam's depth; otherwise he gets there.
  const goalSide = me.x < sam.x;
  const x = goalSide && sam.x - me.x <= memo.holdAt ? me.x : Math.max(sam.x - memo.holdAt, inFront);
  return { ...runTo(w, x, sam.z), faceX: 1 };
}

export type SamScript = 'racer' | 'matador';

export interface SamMatch extends MaxMatch {
  /** Harrison's goals that went in off Sam: he played the ball last. */
  ownGoals: number;
}

/** Plays a whole match against Sam headlessly at the tuning stats, and reports it from Harrison's side. */
export function samMatch(d: Difficulty, seed: number, harrison: SamScript): SamMatch {
  const profile = SAM_PROFILES[d];
  const w = createWorld({ ...SAM_TUNING_STATS }, { ...SAM_STATS }, seed, { home: HUMAN_AIM_ERROR_DEG, away: profile.aimErrorDeg }, null, null, profile, SAM_HANDLING);
  const brain = createBrain(profile);
  const memo = matadorMemo(seeded(seed ^ MATADOR_SEED));
  const racer = racerMemo(seeded(seed ^ MATADOR_SEED));
  let [t, stillS, longestStillS, ownGoals] = [0, 0, 0, 0];
  for (let i = 0; i < MAX_TICKS && w.match.result === null; i++) {
    const home = harrison === 'racer' ? racerIntent(w, t, racer) : matadorIntent(w, t, STEP, memo);
    const [x, y, z] = [w.ball.x, w.ball.y, w.ball.z];
    stepWorld(w, home, think(brain, w, w.away, w.home, STEP), STEP);
    t += STEP;
    if (w.events.goal === 'home' && w.ball.touchedBy === 'away') ownGoals++;
    const still = Math.hypot(w.ball.x - x, w.ball.y - y, w.ball.z - z) < STILL_PX;
    stillS = w.match.phase === 'playing' && still ? stillS + STEP : 0;
    longestStillS = Math.max(longestStillS, stillS);
  }
  return { result: w.match.result, score: { ...w.match.score }, longestStillS, ownGoals };
}
