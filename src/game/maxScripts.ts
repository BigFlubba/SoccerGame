import { BALL_R } from '../art/ball';
import { seeded } from '../engine/random';
import { LADDER_MATCHES, maxStats } from '../meta/ladder';
import { DIFFICULTY, createBrain, think, type AiBrain, type AiProfile, type Difficulty } from './ai';
import { HUMAN_AIM_ERROR_DEG } from './kick';
import { NO_INTENT, type PlayerIntent } from './player';
import { MAX_STAT_LEVEL, STAT_NAMES, type Stats } from './stats';
import { maxHasBall, stealZone } from './steal';
import { createWorld, stepWorld, type World } from './world';
import { ballAtFeet, ballIn } from './zones';

/**
 * A scripted Harrison for measuring Max headlessly: Max's own brain plays
 * Harrison's side with a human's reactions and aim, at stats a level above
 * Max's for the rung (the ladder's own assumption about what he can afford
 * by then). He takes the kickoff shot whenever the ball is on the spot at
 * his feet, so the measure sees what Max does at a kickoff, and taps steal
 * whenever Max's ball is in his reach, so it sees the steal's odds.
 */

/**
 * The scripted Harrison's brain, written out so retuning Max can't move it:
 * Normal's numbers as they were before this retune, with less sliding and a
 * longer range. reactionS is replaced per match (REACT); the fields only
 * Max uses do nothing for him.
 */
export const HARRISON_SCRIPT: AiProfile = {
  reactionS: 0.18,
  aimErrorDeg: 6,
  aggression: 0.4,
  shootRange: 200,
  braceSense: 0.75,
  backOffS: 0.18,
  cleanSteal: 0.75,
  wrongFootedS: 0.4,
  kickoffSpot: { back: 110, off: 18 },
  kickoffRush: true,
  paceFactor: 1,
};
/** Each match's Harrison reacts at his own pace, drawn here, s, so a win rate is a smooth measure. */
const REACT = { from: 0.3, spread: 0.16 };
/** How long he holds the kickoff shot, s. */
const KICKOFF_CHARGE = { from: 0.6, spread: 0.3 };

const STEP = 1 / 60;
/** Mixed into a match's seed for its Harrison's draws. */
const SCRIPT_SEED = 0x5eed;
/** 90 s of play plus a pause for every goal, and golden goal: even a 40-goal match runs well under this. */
const MAX_TICKS = 60 * 400;
/** The ball counts as still when it moves less than this in a tick. */
const STILL_PX = 0.05;
/** The ball is still on the centre spot within this, px. */
const ON_SPOT = 0.5;

/** Max's stats for the rung with every stat one level higher, capped. */
export function harrisonStats(rung: number): Stats {
  const max = maxStats(rung);
  const up = { ...max };
  for (const k of STAT_NAMES) up[k] = Math.min(max[k] + 1, MAX_STAT_LEVEL);
  return up;
}

export interface ScriptMemo {
  brain: AiBrain;
  /** When he started the kickoff shot he's charging; null when he isn't. */
  chargingSinceS: number | null;
  /** How long he holds it. */
  chargeS: number;
  rng: () => number;
}

export function scriptMemo(seed: number): ScriptMemo {
  const rng = seeded(seed ^ SCRIPT_SEED);
  const reactionS = REACT.from + rng() * REACT.spread;
  return { brain: createBrain({ ...HARRISON_SCRIPT, reactionS }), chargingSinceS: null, chargeS: 0, rng };
}

const onSpot = (w: World): boolean => Math.hypot(w.ball.x - w.field.width / 2, w.ball.z - w.field.depth / 2) <= ON_SPOT;

/** The scripted Harrison's intent this tick. */
export function harrisonIntent(w: World, t: number, dt: number, memo: ScriptMemo): PlayerIntent {
  if (memo.chargingSinceS !== null) {
    if (w.home.state === 'charging' && t - memo.chargingSinceS < memo.chargeS) return { ...NO_INTENT, faceX: 1, shootHeld: true };
    memo.chargingSinceS = null;
    return { ...NO_INTENT };
  }
  const kickoff = w.match.phase === 'playing' && w.match.kickoffTeam === 'home' && onSpot(w);
  if (kickoff && w.home.state === 'ground' && ballAtFeet(w.home, w.ball)) {
    memo.chargingSinceS = t;
    memo.chargeS = KICKOFF_CHARGE.from + memo.rng() * KICKOFF_CHARGE.spread;
    return { ...NO_INTENT, faceX: 1, shootHeld: true };
  }
  const intent = think(memo.brain, w, w.home, w.away, dt);
  const canSteal = w.home.stealCooldownS === 0 && maxHasBall(w.away, w.ball) && ballIn(stealZone(w.home), w.ball, BALL_R);
  return canSteal ? { ...intent, steal: true } : intent;
}

export interface MaxMatch {
  result: World['match']['result'];
  score: { home: number; away: number };
  /** The longest the ball sat still while in play, seconds. */
  longestStillS: number;
}

/** Plays a whole match against Max on rung `rung` headlessly, and reports it from Harrison's side. */
export function maxMatch(d: Difficulty, seed: number, rung = LADDER_MATCHES): MaxMatch {
  const profile = DIFFICULTY[d];
  const w = createWorld(harrisonStats(rung), maxStats(rung), seed, { home: HUMAN_AIM_ERROR_DEG, away: profile.aimErrorDeg }, null, null, profile);
  const brain = createBrain(profile);
  const memo = scriptMemo(seed);
  let [t, stillS, longestStillS] = [0, 0, 0];
  for (let i = 0; i < MAX_TICKS && w.match.result === null; i++) {
    const home = harrisonIntent(w, t, STEP, memo);
    const away = think(brain, w, w.away, w.home, STEP);
    const [x, y, z] = [w.ball.x, w.ball.y, w.ball.z];
    stepWorld(w, home, away, STEP);
    t += STEP;
    const still = Math.hypot(w.ball.x - x, w.ball.y - y, w.ball.z - z) < STILL_PX;
    stillS = w.match.phase === 'playing' && still ? stillS + STEP : 0;
    longestStillS = Math.max(longestStillS, stillS);
  }
  return { result: w.match.result, score: { ...w.match.score }, longestStillS };
}
