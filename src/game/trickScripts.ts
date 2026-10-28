import { seeded, type Rng } from '../engine/random';
import { LADDER_MATCHES } from '../meta/ladder';
import { createBrain, think, type AiBrain, type Difficulty } from './ai';
import { DOG_DIFFICULTY, TUNING_STATS } from './dog';
import { createDogBrain, dogThink, type DogBrain } from './dogAi';
import { BLOCKER_SEED, blockerIntent, blockerMemo, type BlockerMemo } from './dogScripts';
import { ballIsHis } from './dragBack';
import { HUMAN_AIM_ERROR_DEG } from './kick';
import { BEAT, harrisonIntent, harrisonStatsFor, scriptMemo, type MaxMatch, type ScriptMemo } from './maxScripts';
import { opponentHandling, opponentProfile, opponentStats, trickSetup, type HumanOpponentId } from './opponents';
import { NO_INTENT, type PlayerIntent } from './player';
import { SAM_TUNING_STATS } from './samScripts';
import { BASE_STATS, type Stats } from './stats';
import { maxHasBall } from './steal';
import { STICK_UP, TRICK_LANE, type TrickKind } from './tricks';
import { createWorld, stepWorld, type World } from './world';

/**
 * Scripted Harrisons for the tricks' tuning. `plain` is the opponent's own
 * tuning script (maxScripts' for the humans, the blocker for Biscuit), who
 * never presses RB. The `trickster` is plain plus one RB press an
 * exchange, once the defender in front of him, in his lane and facing him,
 * is inside a trigger gap he draws each exchange, so some are timed right
 * and some aren't. The `spammer` presses RB whenever a trick could start.
 * Either one, having fooled the defender, takes the opening as a player
 * would: on along his facing, round the defender on the roomier side,
 * until he's past him. Their draws come from their own seeded rng, never
 * the world's.
 */
export type TrickScript = 'plain' | 'trickster' | 'spammer';

const STEP = 1 / 60;
/** 90 s of play plus a pause for every goal, and golden goal, as the other scripts allow. */
const MAX_TICKS = 60 * 400;
/** The ball moving less than this in a tick is still. */
const STILL_PX = 0.05;
/** Mixed into a match's seed for the trickster's draws. */
const TRICK_SEED = 0x7ac;
/** The trickster's trigger gap, drawn each exchange, px. */
const TRIGGER = { from: 10, spread: 60 };
/** Taking the opening: he goes round this far either side of the defender's line, px, and is past him this far beyond him. */
const ROUND = { wide: 16, past: 14 };

export interface TrickMemo {
  script: TrickScript;
  /** The plain script underneath: the humans' or the dog's blocker. */
  plain: ScriptMemo;
  blocker: BlockerMemo;
  rng: Rng;
  /** This exchange's trigger gap and trick, and whether he has pressed yet. */
  gap: number;
  kind: TrickKind;
  pressed: boolean;
  /** The spammer's next trick: he alternates. */
  next: TrickKind;
  /** Taking the opening after a trick that fooled the defender: his facing then, the side he goes round on, and since when. */
  follow: { facing: 1 | -1; side: 1 | -1; sinceS: number } | null;
}

function draw(memo: TrickMemo): void {
  memo.gap = TRIGGER.from + memo.rng() * TRIGGER.spread;
  memo.kind = memo.rng() < 0.5 ? 'stepover' : 'flick';
  memo.pressed = false;
}

export function trickMemo(seed: number, script: TrickScript): TrickMemo {
  const memo: TrickMemo = {
    script,
    plain: scriptMemo(seed),
    blocker: blockerMemo(seeded(seed ^ BLOCKER_SEED)),
    rng: seeded(seed ^ TRICK_SEED),
    gap: 0,
    kind: 'stepover',
    pressed: false,
    next: 'stepover',
    follow: null,
  };
  draw(memo);
  return memo;
}

/** A trick could start now: the world's own start conditions, read from outside. */
function canTrick(w: World): boolean {
  const h = w.home;
  const ready = h.state === 'ground' && h.y === 0 && h.turnS === 0 && h.stumbleS === 0 && h.trickCooldownS === 0 && h.trick === null;
  return w.tricks !== null && w.match.phase === 'playing' && ready && !w.wave?.live && ballIsHis(w);
}

/** The other side has the ball: a fooled defender can't play it, so a ball rolling past his feet isn't his. */
const theirs = (w: World): boolean => (w.dog ? w.dog.carrying : w.away.fooled === null && maxHasBall(w.away, w.ball));

/** The defender in front of him, in his lane, facing him: the gap along his facing, or null. */
function defenderAhead(w: World): number | null {
  const { home, away } = w;
  const gap = (away.x - home.x) * home.facing;
  return gap > 0 && Math.abs(away.z - home.z) <= TRICK_LANE && away.facing === -home.facing ? gap : null;
}

/** RB this tick, for `kind`: the stick up for a flick, never up for a stepover. */
const press = (intent: PlayerIntent, kind: TrickKind): PlayerIntent => ({ ...intent, skill: true, moveZ: kind === 'flick' ? 1 : Math.min(intent.moveZ, 0) });

/** Past a fooled defender: on along his facing, round him on the open side, until he's beyond him; null once that's done or off. */
function takeOpening(w: World, dt: number, memo: TrickMemo): PlayerIntent | null {
  if (w.events.trick.fooled) memo.follow = { facing: w.home.facing, side: w.home.z >= w.field.depth / 2 ? -1 : 1, sinceS: 0 };
  const f = memo.follow;
  if (!f) return null;
  f.sinceS += dt;
  const ahead = (w.home.x - w.away.x) * f.facing;
  if (ahead >= ROUND.past || f.sinceS >= BEAT.forS || theirs(w) || w.match.phase !== 'playing') {
    memo.follow = null;
    return null;
  }
  const dz = w.away.z + f.side * ROUND.wide - w.home.z;
  return { ...NO_INTENT, moveX: f.facing, moveZ: Math.abs(dz) > 1 ? Math.sign(dz) : 0 };
}

/** The plain script's intent, with the trickster's or spammer's RB on top. */
export function trickIntent(w: World, t: number, dt: number, memo: TrickMemo): PlayerIntent {
  const plain = w.dog ? blockerIntent(w, t, memo.blocker) : harrisonIntent(w, t, dt, memo.plain);
  if (memo.script === 'plain') return plain;
  const opening = takeOpening(w, dt, memo);
  if (opening) return opening;
  if (memo.script === 'spammer') {
    if (!canTrick(w)) return plain;
    const kind = memo.next;
    memo.next = kind === 'stepover' ? 'flick' : 'stepover';
    return press(plain, kind);
  }
  // A new exchange once the other side has had the ball, or play stopped.
  if (memo.pressed && (theirs(w) || w.match.phase !== 'playing')) draw(memo);
  const gap = defenderAhead(w);
  if (memo.pressed || gap === null || gap > memo.gap || !canTrick(w)) return plain;
  memo.pressed = true;
  return press(plain, memo.kind);
}

export interface TrickStats {
  /** Tricks started. */
  tricks: number;
  /** Tricks that fooled the defender, by kind... */
  fooled: Record<TrickKind, number>;
  /** ...and of those, the ones that got him past the defender with the ball (BEAT's rule: 10 px past, ball within 24 px, inside 1.5 s). */
  beats: Record<TrickKind, number>;
  /** How far behind Harrison, along his facing at the sell, each fooled defender was when his reaction ended, px. */
  pastPx: number[];
}

export interface TrickMatch extends MaxMatch {
  trickStats: TrickStats;
}

/** Harrison's stats for the opponent's own tuning. */
function harrisonFor(opponent: HumanOpponentId | 'biscuit'): Stats {
  if (opponent === 'biscuit') return { ...TUNING_STATS };
  if (opponent === 'sam') return { ...SAM_TUNING_STATS };
  return harrisonStatsFor(opponentStats(opponent, LADDER_MATCHES));
}

/** A whole headless match with Harrison owning the tricks, at the stats the opponent's own tuning uses. */
export function trickMatch(opponent: HumanOpponentId | 'biscuit', d: Difficulty, seed: number, script: TrickScript): TrickMatch {
  const dog = opponent === 'biscuit';
  const human: HumanOpponentId = dog ? 'max' : opponent;
  const profile = opponentProfile(human, d);
  const w = createWorld(
    harrisonFor(opponent),
    dog ? { ...BASE_STATS } : opponentStats(human, LADDER_MATCHES),
    seed,
    { home: HUMAN_AIM_ERROR_DEG, away: dog ? 0 : profile.aimErrorDeg },
    null,
    dog ? DOG_DIFFICULTY[d] : null,
    dog ? null : profile,
    opponentHandling(human),
    trickSetup(d, opponent),
  );
  const brain: AiBrain | null = dog ? null : createBrain(profile);
  const dogBrain: DogBrain | null = dog ? createDogBrain(DOG_DIFFICULTY[d]) : null;
  const memo = trickMemo(seed, script);
  const stats: TrickStats = { tricks: 0, fooled: { stepover: 0, flick: 0 }, beats: { stepover: 0, flick: 0 }, pastPx: [] };
  /** A fooled defender being watched for the beat, and for where he is when his reaction ends. */
  let beat: { kind: TrickKind; facing: 1 | -1; sinceS: number } | null = null;
  let past: { facing: 1 | -1 } | null = null;
  let [t, stillS, longestStillS] = [0, 0, 0];
  for (let i = 0; i < MAX_TICKS && w.match.result === null; i++) {
    const home = trickIntent(w, t, STEP, memo);
    const away = dogBrain ? dogThink(dogBrain, w, STEP) : think(brain!, w, w.away, w.home, STEP);
    const [x, y, z] = [w.ball.x, w.ball.y, w.ball.z];
    const wasFooled = w.away.fooled !== null;
    stepWorld(w, home, away, STEP);
    t += STEP;
    const ev = w.events.trick;
    if (ev.started) stats.tricks++;
    if (ev.fooled) {
      stats.fooled[ev.fooled]++;
      beat = { kind: ev.fooled, facing: w.home.facing, sinceS: 0 };
      past = { facing: w.home.facing };
    } else if (beat) {
      beat.sinceS += STEP;
      const ahead = (w.home.x - w.away.x) * beat.facing;
      const kept = Math.hypot(w.ball.x - w.home.x, w.ball.z - w.home.z) <= BEAT.keep;
      if (ahead >= BEAT.past && kept) {
        stats.beats[beat.kind]++;
        beat = null;
      } else if (beat.sinceS >= BEAT.forS || theirs(w) || w.match.phase !== 'playing') beat = null;
    }
    if (past && wasFooled && w.away.fooled === null) {
      if (w.match.phase === 'playing') stats.pastPx.push((w.home.x - w.away.x) * past.facing);
      past = null;
    }
    const still = Math.hypot(w.ball.x - x, w.ball.y - y, w.ball.z - z) < STILL_PX;
    stillS = w.match.phase === 'playing' && still ? stillS + STEP : 0;
    longestStillS = Math.max(longestStillS, stillS);
  }
  return { result: w.match.result, score: { ...w.match.score }, longestStillS, trickStats: stats };
}
