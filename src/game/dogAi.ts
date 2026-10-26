import { BALL_R } from '../art/ball';
import { BACK_OFF_GOAL_ROOM, rollBackOff } from './ai';
import { BALL_REST_Y } from './ball';
import { GRAVITY } from './constants';
import { JINK_COOLDOWN_S, JINK_S, type DogProfile } from './dog';
import type { Goal } from './field';
import { NO_INTENT, PLAYER_R, type Player, type PlayerIntent } from './player';
import type { Wave } from './wave';
import type { World } from './world';

/**
 * Biscuit's brain. With the ball he runs it at the left goal flat out and
 * jinks round anyone in his lane; without it he runs down the ball, wherever
 * it is. A powered-up Harrison he answers exactly as Max does.
 */
export interface DogBrain {
  profile: DogProfile;
  nextDecisionS: number;
  intent: PlayerIntent;
  plan: 'chase' | 'carry' | 'jink' | 'pant' | 'backOff' | 'hesitate' | 'faceWave';
  /** As Max's: while Harrison is powered up, where it means to stand and when it starts, or 'stay'. */
  backOff: null | 'stay' | { gap: number; inS: number };
  /** The depth the current jink cuts to. */
  jinkZ: number;
}

/** How far ahead he leads a rolling ball, as Max does. */
const LEAD_S = 0.25;
/** Close enough to a spot to stop. */
const ARRIVE = 3;
/** Harrison is in his lane within this of his line in depth. */
const LANE_HALF = PLAYER_R + 6;
/** Chasing, Harrison this close ahead on his path, and this close to its line, is in the way: he goes round. */
const ROUND_AHEAD = 16;
const ROUND_SIDE = 2 * PLAYER_R;
/** With the ball beside or behind the goal, he first runs out to this far in front of its line. */
const FRONT_OF_GOAL = 14;
/** Backing off, as Max does: this fraction of the way across from the ball toward his own goal's centre... */
const BACK_OFF_COVER = 1 / 3;
/** ...and facing a wave, at a spot on its line this far ahead of him. */
const LANE_LOOKAHEAD = 12;

export function createDogBrain(profile: DogProfile): DogBrain {
  return { profile, nextDecisionS: 0, intent: { ...NO_INTENT }, plan: 'chase', backOff: null, jinkZ: 0 };
}

const goal = (w: World, side: 'left' | 'right'): Goal => w.field.goals.find(g => g.side === side)!;
const centreZ = (g: Goal): number => (g.z0 + g.z1) / 2;
const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);
const faceBall = (w: World, me: Player): 1 | -1 => (Math.sign(w.ball.x - me.x) >= 0 ? 1 : -1);

/** A unit stick direction from `me` toward (x, z), or still once there. */
function steer(me: Player, x: number, z: number): [number, number] {
  const [dx, dz] = [x - me.x, z - me.z];
  const d = Math.hypot(dx, dz);
  return d <= ARRIVE ? [0, 0] : [dx / d, dz / d];
}

/** Where the ball will be: its landing spot if airborne, a little ahead if rolling. */
function predictBall(w: World): { x: number; z: number } {
  const b = w.ball;
  const drop = b.y - BALL_REST_Y;
  const airborne = drop > 1 || b.vy > 0;
  const t = airborne ? (b.vy + Math.sqrt(b.vy * b.vy + 2 * GRAVITY * Math.max(drop, 0))) / GRAVITY : LEAD_S;
  return { x: clamp(b.x + b.vx * t, w.field.fenceL, w.field.fenceR), z: clamp(b.z + b.vz * t, BALL_R, w.field.depth - BALL_R) };
}

/** The side of the band (+1 deeper, −1 nearer) with more room at depth z. */
const roomySide = (w: World, z: number): 1 | -1 => (z <= w.field.depth / 2 ? 1 : -1);

const onHisFeet = (p: Player): boolean => p.y === 0 && p.state !== 'fallen' && p.state !== 'blown' && p.state !== 'sliding' && p.state !== 'air';

/** Harrison standing or running in his path: within jinkAhead ahead along his facing, and in his depth lane. */
function inLane(brain: DogBrain, me: Player, them: Player): boolean {
  const ahead = (them.x - me.x) * me.facing;
  return onHisFeet(them) && ahead > 0 && ahead <= brain.profile.jinkAhead && Math.abs(them.z - me.z) <= LANE_HALF;
}

/** Away from Harrison if he's off the line, else toward the roomier side; never into the boards. */
function jinkSide(brain: DogBrain, w: World, me: Player, them: Player): 1 | -1 {
  const side: 1 | -1 = Math.abs(them.z - me.z) >= 2 ? (me.z > them.z ? 1 : -1) : roomySide(w, me.z);
  const fits = (s: number) => me.z + s * brain.profile.jinkWidth <= w.field.depth - PLAYER_R && me.z + s * brain.profile.jinkWidth >= PLAYER_R;
  return fits(side) || !fits(-side) ? side : (-side as 1 | -1);
}

/** The jink's cut: on toward goal, and across the band until he's gone jinkWidth wide. */
function jinkIntent(brain: DogBrain, w: World, me: Player): PlayerIntent {
  brain.plan = 'jink';
  const toward = Math.sign(goal(w, 'left').lineX - me.x) || -1;
  const moveZ = Math.abs(brain.jinkZ - me.z) > ARRIVE ? w.dog!.jinkSide : 0;
  return { ...NO_INTENT, moveX: toward, moveZ, sprint: true };
}

/** With the ball: at the left goal flat out, round its corner first if he's beside it; a jink when Harrison is in the way. */
function carry(brain: DogBrain, w: World): PlayerIntent {
  const d = w.dog!;
  const [me, them] = [w.away, w.home];
  if (d.jinkS > 0) return jinkIntent(brain, w, me);
  if (d.jinkCooldownS === 0 && inLane(brain, me, them)) {
    d.jinkS = JINK_S;
    d.jinkSide = jinkSide(brain, w, me, them);
    d.jinkCooldownS = JINK_COOLDOWN_S;
    brain.jinkZ = clamp(me.z + d.jinkSide * brain.profile.jinkWidth, PLAYER_R, w.field.depth - PLAYER_R);
    return jinkIntent(brain, w, me);
  }
  brain.plan = 'carry';
  const g = goal(w, 'left');
  const beside = me.x < g.lineX + PLAYER_R + FRONT_OF_GOAL && (me.z < g.z0 || me.z > g.z1);
  const [x, z] = beside ? [g.lineX + PLAYER_R + FRONT_OF_GOAL, me.z < g.z0 ? g.z0 + PLAYER_R : g.z1 - PLAYER_R] : [g.lineX, centreZ(g)];
  const [moveX, moveZ] = steer(me, x, z);
  return { ...NO_INTENT, moveX, moveZ, sprint: true };
}

/** Bodies are solid: with Harrison just ahead on the way to the ball, and the ball beyond him, he sidesteps round. */
function goRound(w: World, me: Player, them: Player, [mx, mz]: [number, number], dist: number): [number, number] {
  const [rx, rz] = [them.x - me.x, them.z - me.z];
  const along = rx * mx + rz * mz;
  const across = rx * mz - rz * mx;
  if (along <= 0 || along > ROUND_AHEAD || along >= dist || Math.abs(across) >= ROUND_SIDE) return [mx, mz];
  const side = Math.abs(me.z - them.z) >= 1 ? Math.sign(me.z - them.z) : roomySide(w, me.z);
  const [sx, sz] = [mx, mz + side];
  const d = Math.hypot(sx, sz);
  return [sx / d, sz / d];
}

/** Without the ball: run it down, flat out, wherever it is. stepDog decides the grab. */
function chase(brain: DogBrain, w: World): PlayerIntent {
  brain.plan = 'chase';
  const [me, them] = [w.away, w.home];
  const at = predictBall(w);
  const move = goRound(w, me, them, steer(me, at.x, at.z), Math.hypot(at.x - me.x, at.z - me.z));
  return { ...NO_INTENT, moveX: move[0], moveZ: move[1], sprint: true };
}

/**
 * As Max does: back toward his own goal, facing Harrison, to `gap` from the
 * ball in line with it, at Max's pace. Any part of the way that would close
 * on the ball is dropped, so he never moves toward a powered-up Harrison.
 */
function backOff(brain: DogBrain, w: World, gap: number): PlayerIntent {
  brain.plan = 'backOff';
  const me = w.away;
  const ball = w.ball;
  const own = goal(w, 'right');
  const x = Math.min(ball.x + gap, own.lineX - BACK_OFF_GOAL_ROOM);
  const z = ball.z + (centreZ(own) - ball.z) * BACK_OFF_COVER;
  let [mx, mz] = steer(me, x, z);
  const [ux, uz] = [ball.x - me.x, ball.z - me.z];
  const u = Math.hypot(ux, uz);
  const closing = u > 0 ? (mx * ux + mz * uz) / u : 0;
  if (closing > 0) [mx, mz] = [mx - (closing * ux) / u, mz - (closing * uz) / u];
  return { ...NO_INTENT, moveX: mx, moveZ: mz, faceX: faceBall(w, me) };
}

/** As Max does: square to the wave on its way, coming along its line, so the wave decides whether he braces. */
function faceWave(brain: DogBrain, w: World, wave: Wave): PlayerIntent {
  brain.plan = 'faceWave';
  const me = w.away;
  const ball = w.ball;
  const toward = Math.sign(ball.x - me.x) || -me.facing;
  const x = Math.abs(ball.x - me.x) > LANE_LOOKAHEAD ? me.x + toward * LANE_LOOKAHEAD : ball.x;
  const laneZ = wave.originZ + (wave.dirZ / Math.max(wave.dirX, 1e-3)) * (x - wave.originX);
  const [moveX, moveZ] = steer(me, x, laneZ);
  return { ...NO_INTENT, moveX: moveX || toward, moveZ };
}

/**
 * His intent this tick. moveX/moveZ are a unit direction; `sprint` true
 * means flat out (DOG_SPEED), false means DOG_BACKPEDAL_SPEED. The chase is
 * re-decided every reactionS; carrying, he steers and checks for a jink
 * every tick.
 */
export function dogThink(brain: DogBrain, w: World, dt: number): PlayerIntent {
  const d = w.dog!;
  const me = w.away;
  brain.nextDecisionS -= dt;
  const wave = w.wave?.live && w.wave.outcome === null ? w.wave : null;
  const powered = (w.power?.activeS ?? 0) > 0;
  if (!powered) brain.backOff = null;
  else if (brain.backOff === null) brain.backOff = rollBackOff(brain.profile, w.rng);
  const backing = brain.backOff !== null && brain.backOff !== 'stay' ? brain.backOff : null;
  if (backing) backing.inS -= dt;
  if (wave) brain.intent = faceWave(brain, w, wave);
  else if (backing && backing.inS <= 0) brain.intent = backOff(brain, w, backing.gap);
  else if (powered || d.pantS > 0) {
    // Before he reacts, or when he doesn't back off at all, he hesitates where he is; panting, he just stands.
    brain.plan = powered ? 'hesitate' : 'pant';
    brain.intent = { ...NO_INTENT, faceX: faceBall(w, me) };
  } else if (d.carrying) brain.intent = carry(brain, w);
  else if (brain.plan !== 'chase' || brain.nextDecisionS <= 1e-9) {
    brain.intent = chase(brain, w);
    brain.nextDecisionS = brain.profile.reactionS;
  }
  return { ...brain.intent };
}
