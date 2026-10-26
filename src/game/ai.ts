import { BALL_R } from '../art/ball';
import { BALL_REST_Y } from './ball';
import { GRAVITY } from './constants';
import { inGoalBox, type Goal } from './field';
import type { Aim } from './kick';
import { NO_INTENT, PLAYER_R, type Player, type PlayerIntent } from './player';
import { maxGoal, waveTarget } from './power';
import type { World } from './world';
import { REACH_Z } from './zones';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface AiProfile {
  /** Seconds between decisions. */
  reactionS: number;
  aimErrorDeg: number;
  /** Chance (0..1) of sliding in when close to the ball carrier. */
  aggression: number;
  /** Distance from the goal line it starts shooting from. */
  shootRange: number;
  /** Seconds after Harrison starts powering up before it rushes him. */
  rushDelayS: number;
  /** Whether it sprints at him. */
  rushSprint: boolean;
}

export const DIFFICULTY: Record<Difficulty, AiProfile> = {
  easy: { reactionS: 0.32, aimErrorDeg: 10, aggression: 0.3, shootRange: 150, rushDelayS: 0.3, rushSprint: false },
  normal: { reactionS: 0.18, aimErrorDeg: 6, aggression: 0.55, shootRange: 180, rushDelayS: 0.1, rushSprint: false },
  hard: { reactionS: 0.1, aimErrorDeg: 3, aggression: 0.8, shootRange: 210, rushDelayS: 0, rushSprint: true },
};

export interface AiBrain {
  profile: AiProfile;
  nextDecisionS: number;
  intent: PlayerIntent;
  plan: 'chase' | 'dribble' | 'charge' | 'defend' | 'jump' | 'rush';
  /** Time left on the current charge before it releases the shot. */
  chargeLeftS: number;
  /** Time until it may slide again. */
  slideReadyS: number;
  /** How long the opponent has been powering up. */
  rushS: number;
}

/** The ball counts as at someone's feet within this distance, on the ground. */
const POSSESSION_RANGE = 16;
const BALL_LOW = 6;
/** It runs to this far behind a loose ball, so it pushes the ball toward goal. */
const CHASE_OFFSET = 8;
/** It stands this far goal-side of the ball when defending... */
const DEFEND_OFFSET = 20;
/** ...and this fraction of the way across from the ball toward its own goal's centre. */
const DEFEND_COVER = 1 / 3;
export const SLIDE_RANGE = 26;
const SLIDE_COOLDOWN_S = 1.2;
const HIGH_BALL = 30;
const HIGH_BALL_RANGE = 30;
/** On the wrong side of a ball this close, it goes round it rather than pushing it toward its own goal... */
const ROUND_BALL_RANGE = 40;
/** ...passing this far to the side of it. */
const ROUND_BALL_Z = 12;
/** An opponent this close ahead on its path, and this close to the path's line, is in the way: it sidesteps. */
const BLOCKER_AHEAD = 16;
const BLOCKER_SIDE = 10;
/** How far ahead it checks that a sidestep doesn't walk it into a goal. */
const SIDESTEP_LOOKAHEAD = 8;
/** A route that only touches a goal's edge (he stands on it after being pushed out) doesn't count as crossing it. */
const EDGE_SLACK = 0.5;
/** A spot it wants inside a goal moves out to this far from the goal's outline: a body radius and a little. */
const GOAL_CLEARANCE = PLAYER_R + 1;
const CHARGE_MIN_S = 0.25;
const CHARGE_SPREAD_S = 0.55;
const SPRINT_DISTANCE = 120;
const SPRINT_MIN_STAMINA = 0.4;
/** Close enough to a target spot to stop. */
const ARRIVE = 3;
/**
 * It rounds a goal's corners this far out, further than it needs to stop at
 * a spot, so from a corner the way on is always clear of the goal.
 */
const CORNER_CLEARANCE = PLAYER_R + ARRIVE + 1;
/** How far ahead it leads a rolling ball. */
const LEAD_S = 0.25;
/** Rushing a power-up, it runs at a spot on the beam's lane this far ahead of it, so it steps into the lane as it closes. */
const LANE_LOOKAHEAD = 12;
/** Where it aims its shots: mostly the far post, then the near post, sometimes straight. */
const AIM_ODDS: readonly (readonly [Aim, number])[] = [
  ['far', 1 / 2],
  ['near', 1 / 3],
  ['straight', 1 / 6],
];

export function createBrain(profile: AiProfile): AiBrain {
  return { profile, nextDecisionS: 0, intent: { ...NO_INTENT }, plan: 'chase', chargeLeftS: 0, slideReadyS: 0, rushS: 0 };
}

const attackDir = (me: Player): 1 | -1 => (me.team === 'home' ? 1 : -1);
const goalCentreZ = (g: Goal): number => (g.z0 + g.z1) / 2;

/** Where a loose ball will be: its landing spot if airborne, a little ahead if rolling. */
function predictBall(w: World): { x: number; z: number } {
  const b = w.ball;
  const drop = b.y - BALL_REST_Y;
  const airborne = drop > 1 || b.vy > 0;
  const t = airborne ? (b.vy + Math.sqrt(b.vy * b.vy + 2 * GRAVITY * Math.max(drop, 0))) / GRAVITY : LEAD_S;
  return {
    x: Math.min(Math.max(b.x + b.vx * t, w.field.fenceL), w.field.fenceR),
    z: Math.min(Math.max(b.z + b.vz * t, BALL_R), w.field.depth - BALL_R),
  };
}

/** A unit stick direction from `me` toward (x, z), or still once there. */
function steer(me: Player, x: number, z: number): [number, number] {
  const [dx, dz] = [x - me.x, z - me.z];
  const d = Math.hypot(dx, dz);
  return d <= ARRIVE ? [0, 0] : [dx / d, dz / d];
}

/** The side (+1 deeper, −1 nearer) with more room to pass something standing at depth z. */
const roomySide = (w: World, z: number, from: number): number =>
  z === w.field.depth / 2 ? Math.sign(from - z) || 1 : Math.sign(w.field.depth / 2 - z);

/**
 * Bodies are solid: if the opponent stands just ahead on its path, it adds
 * a sidestep, toward where it's heading if that's off to one side, otherwise
 * toward the side with more room.
 */
function goRound(w: World, me: Player, them: Player, move: [number, number], goalZ: number): [number, number] {
  const [mx, mz] = move;
  if (mx === 0 && mz === 0) return move;
  const [rx, rz] = [them.x - me.x, them.z - me.z];
  const along = rx * mx + rz * mz;
  const across = rx * mz - rz * mx;
  if (along <= 0 || along > BLOCKER_AHEAD || Math.abs(across) >= BLOCKER_SIDE) return move;
  const preferred = Math.abs(goalZ - them.z) > BLOCKER_SIDE / 2 ? Math.sign(goalZ - them.z) : roomySide(w, them.z, me.z);
  // Never sidestep into a goal: the goal would push him straight back, every tick.
  for (const side of [preferred, -preferred]) {
    const [sx, sz] = [mx, mz + side];
    const d = Math.hypot(sx, sz);
    const ahead = { x: me.x + (sx / d) * SIDESTEP_LOOKAHEAD, z: me.z + (sz / d) * SIDESTEP_LOOKAHEAD };
    if (!w.field.goals.some(g => inGoalBox(g, ahead.x, ahead.z, PLAYER_R))) return [sx / d, sz / d];
  }
  return move;
}

interface Box {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

/** A goal's footprint on the ground, grown by `margin`. */
function goalBox(g: Goal, margin: number): Box {
  return { x0: Math.min(g.lineX, g.backX) - margin, x1: Math.max(g.lineX, g.backX) + margin, z0: g.z0 - margin, z1: g.z1 + margin };
}

/** Whether the segment from a to b passes through a box (Liang–Barsky). */
function crosses(a: { x: number; z: number }, b: { x: number; z: number }, box: Box): boolean {
  let [t0, t1] = [0, 1];
  const [dx, dz] = [b.x - a.x, b.z - a.z];
  for (const [p, q] of [
    [-dx, a.x - box.x0],
    [dx, box.x1 - a.x],
    [-dz, a.z - box.z0],
    [dz, box.z1 - a.z],
  ] as const) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 > t1) return false;
  }
  return true;
}

/** A spot inside a goal moved out to the nearest place he can stand: in front of it, or past either post. */
function outOfGoals(w: World, x: number, z: number): { x: number; z: number } {
  for (const g of w.field.goals) {
    if (!inGoalBox(g, x, z, PLAYER_R)) continue;
    const box = goalBox(g, GOAL_CLEARANCE);
    const front = g.side === 'right' ? box.x0 : box.x1;
    const exits = [
      { x: front, z },
      { x, z: box.z0 },
      { x, z: box.z1 },
    ];
    return exits.reduce((m, e) => (Math.hypot(e.x - x, e.z - z) < Math.hypot(m.x - x, m.z - z) ? e : m));
  }
  return { x, z };
}

/**
 * The next spot on the way to (x, z): straight there, unless a goal is in
 * the way, in which case round its front, corner by corner.
 */
function route(w: World, me: Player, x: number, z: number): { x: number; z: number } {
  for (const g of w.field.goals) {
    const box = goalBox(g, PLAYER_R - EDGE_SLACK);
    if (!crosses(me, { x, z }, box)) continue;
    const corners = goalBox(g, CORNER_CLEARANCE);
    const front = g.side === 'right' ? corners.x0 : corners.x1;
    // In front means on the pitch side of the goal line; beside the goal means behind it.
    const inFront = g.side === 'right' ? me.x < g.lineX : me.x > g.lineX;
    const middle = (g.z0 + g.z1) / 2;
    const sideOf = (depth: number) => (depth < middle ? corners.z0 : corners.z1);
    const corner = { x: front, z: sideOf(inFront ? z : me.z) };
    // Already at that corner: the target's side corner is next, then the target.
    if (Math.hypot(corner.x - me.x, corner.z - me.z) <= ARRIVE) return inFront ? { x, z } : { x: front, z: sideOf(z) };
    return corner;
  }
  return { x, z };
}

function pickAim(w: World): Aim {
  let r = w.rng();
  for (const [aim, odds] of AIM_ODDS) {
    if (r < odds) return aim;
    r -= odds;
  }
  return 'straight';
}

/**
 * The opponent is powering up: it comes for him. It runs at the ball along
 * the beam's lane, facing him all the way, and slides in once close and in
 * line. It never plants and waits, so every standoff ends: it braces from
 * far, is blown away in range, or tackles him if he waits too long.
 */
function rush(brain: AiBrain, w: World, me: Player, them: Player): void {
  brain.plan = 'rush';
  const ball = w.ball;
  const goal = maxGoal(w);
  const dist = Math.hypot(ball.x - me.x, ball.z - me.z);
  // Hard sprints all the way in; the others only from far, as they would to any distant ball.
  const sprint = brain.profile.rushSprint ? !me.exhausted : dist > SPRINT_DISTANCE && me.stamina > SPRINT_MIN_STAMINA;
  if (dist <= SLIDE_RANGE && Math.abs(ball.z - me.z) <= REACH_Z && brain.slideReadyS === 0 && Math.sign(ball.x - me.x) === me.facing) {
    brain.slideReadyS = SLIDE_COOLDOWN_S;
    brain.intent = { ...NO_INTENT, chipHeld: true };
    return;
  }
  const toward = Math.sign(ball.x - me.x) || -me.facing;
  const x = Math.abs(ball.x - me.x) > LANE_LOOKAHEAD ? me.x + toward * LANE_LOOKAHEAD : ball.x;
  const laneZ = ball.z + ((waveTarget(goal, them.aim) - ball.z) * (x - ball.x)) / Math.max(1, Math.abs(goal.lineX - ball.x));
  const [moveX, moveZ] = steer(me, x, dist <= LANE_LOOKAHEAD ? ball.z : laneZ);
  brain.intent = { ...NO_INTENT, sprint, moveX: moveX || toward, moveZ };
}

function decide(brain: AiBrain, w: World, me: Player, them: Player): void {
  const { profile } = brain;
  const dir = attackDir(me);
  const ball = w.ball;
  const low = ball.y <= BALL_LOW;
  const ahead = (ball.x - me.x) * dir;
  const inLine = Math.abs(ball.z - me.z) <= REACH_Z;
  const dist = Math.hypot(ball.x - me.x, ball.z - me.z);
  const sprint = dist > SPRINT_DISTANCE && me.stamina > SPRINT_MIN_STAMINA;
  const intent: PlayerIntent = { ...NO_INTENT, sprint };
  const attacking = w.field.goals.find(g => g.side === (dir > 0 ? 'right' : 'left'))!;
  const defending = w.field.goals.find(g => g !== attacking)!;
  const moveTo = (x: number, z: number, aimZ = z): PlayerIntent => {
    const spot = outOfGoals(w, x, z);
    const next = route(w, me, spot.x, spot.z);
    // Rounding a goal, it passes the opponent on the side of the corner it's heading for.
    const sideZ = next.x === spot.x && next.z === spot.z ? aimZ : next.z;
    const [moveX, moveZ] = goRound(w, me, them, steer(me, next.x, next.z), sideZ);
    return { ...intent, moveX, moveZ };
  };
  const toGoal = (attacking.lineX - me.x) * dir;

  // Has the ball: dribble at goal, and shoot once in range.
  if (low && ahead >= 0 && ahead <= POSSESSION_RANGE && inLine) {
    const charging = brain.plan === 'charge' && brain.intent.shootHeld;
    if (charging) return;
    if (toGoal > 0 && toGoal <= profile.shootRange) {
      brain.plan = 'charge';
      brain.chargeLeftS = CHARGE_MIN_S + w.rng() * CHARGE_SPREAD_S;
      brain.intent = { ...intent, moveX: dir, shootHeld: true, aim: pickAim(w) };
      return;
    }
    brain.plan = 'dribble';
    // Behind the line it attacks, the ball is in a pocket beside the goal with no room to get round it:
    // run into it, so it is touched or popped back out toward the pitch.
    const behindLine = (attacking.lineX - ball.x) * dir < 0;
    brain.intent = behindLine ? moveTo(ball.x, ball.z) : moveTo(attacking.lineX, goalCentreZ(attacking));
    return;
  }

  // The opponent has it: get goal-side across the pitch, and slide in when close.
  if (low && Math.hypot(ball.x - them.x, ball.z - them.z) <= POSSESSION_RANGE) {
    brain.plan = 'defend';
    const facingBall = Math.sign(ball.x - me.x) === me.facing;
    const close = dist <= SLIDE_RANGE;
    if (close && !facingBall) {
      // Turn to face the ball, or it would stand on its spot facing away and never challenge.
      // Steer at it in depth too: a full-speed run along x alone overshoots a ball off his line.
      const [moveX, moveZ] = steer(me, ball.x, ball.z);
      brain.intent = { ...intent, moveX: moveX || Math.sign(ball.x - me.x), moveZ };
      return;
    }
    if (close && inLine && brain.slideReadyS === 0 && w.rng() < profile.aggression) {
      brain.slideReadyS = SLIDE_COOLDOWN_S;
      brain.intent = { ...intent, chipHeld: true };
      return;
    }
    const spotZ = ball.z + (goalCentreZ(defending) - ball.z) * DEFEND_COVER;
    brain.intent = moveTo(ball.x - dir * DEFEND_OFFSET, spotZ);
    return;
  }

  // Loose ball: head it if it's overhead, otherwise get behind it.
  if (ball.y > HIGH_BALL && Math.abs(ball.x - me.x) <= HIGH_BALL_RANGE && inLine) {
    brain.plan = 'jump';
    brain.intent = { ...intent, moveX: Math.sign(ball.x - me.x), jump: true, aim: 'straight' };
    return;
  }
  brain.plan = 'chase';
  const at = predictBall(w);
  const behindX = at.x - dir * CHASE_OFFSET;
  // Against a fence there's no room to get behind the ball: play it from where it is.
  if (behindX < w.field.fenceL + PLAYER_R || behindX > w.field.fenceR - PLAYER_R) {
    brain.intent = moveTo(at.x, at.z);
    return;
  }
  // On the wrong side of the ball, pass it to one side instead of running it back toward its own goal.
  const wrongSide = low && ahead < 0 && -ahead <= ROUND_BALL_RANGE;
  const side = Math.sign(me.z - ball.z) || roomySide(w, ball.z, me.z);
  const z = wrongSide ? Math.min(Math.max(ball.z + side * ROUND_BALL_Z, PLAYER_R), w.field.depth - PLAYER_R) : at.z;
  brain.intent = moveTo(behindX, z, at.z);
}

/**
 * The computer player's intent for this tick. It re-decides every
 * reactionS and holds its intent in between; a charged shot releases on
 * its own timer. Jumps and slides are one-tick presses.
 */
export function think(brain: AiBrain, w: World, me: Player, them: Player, dt: number): PlayerIntent {
  brain.nextDecisionS -= dt;
  brain.slideReadyS = Math.max(0, brain.slideReadyS - dt);
  let released = false;
  if (brain.plan === 'charge' && brain.intent.shootHeld) {
    brain.chargeLeftS -= dt;
    if (brain.chargeLeftS <= 0) {
      brain.intent = { ...brain.intent, shootHeld: false };
      released = true;
    }
  }
  brain.rushS = them.state === 'poweringUp' ? brain.rushS + dt : 0;
  if (brain.rushS >= brain.profile.rushDelayS && them.state === 'poweringUp') {
    // Committed: it re-aims every tick until he fires or is stopped.
    rush(brain, w, me, them);
    brain.nextDecisionS = brain.profile.reactionS;
  } else if (!released && brain.nextDecisionS <= 1e-9) {
    // A decision on the release tick could start a new charge and swallow the shot, so it waits a tick.
    decide(brain, w, me, them);
    brain.nextDecisionS = brain.profile.reactionS;
  }
  const out = { ...brain.intent };
  brain.intent = { ...brain.intent, jump: false, chipHeld: false };
  return out;
}
