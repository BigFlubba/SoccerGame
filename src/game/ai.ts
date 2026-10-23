import { BALL_REST_Y } from './ball';
import { GRAVITY } from './constants';
import type { Aim } from './kick';
import { NO_INTENT, type Player, type PlayerIntent } from './player';
import type { World } from './world';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface AiProfile {
  /** Seconds between decisions. */
  reactionS: number;
  aimErrorDeg: number;
  /** Chance (0..1) of sliding in when close to the ball carrier. */
  aggression: number;
  /** Distance from the goal line it starts shooting from. */
  shootRange: number;
}

export const DIFFICULTY: Record<Difficulty, AiProfile> = {
  easy: { reactionS: 0.32, aimErrorDeg: 10, aggression: 0.3, shootRange: 150 },
  normal: { reactionS: 0.18, aimErrorDeg: 6, aggression: 0.55, shootRange: 180 },
  hard: { reactionS: 0.1, aimErrorDeg: 3, aggression: 0.8, shootRange: 210 },
};

export interface AiBrain {
  profile: AiProfile;
  nextDecisionS: number;
  intent: PlayerIntent;
  plan: 'chase' | 'dribble' | 'charge' | 'defend' | 'jump';
  /** Time left on the current charge before it releases the shot. */
  chargeLeftS: number;
  /** Time until it may slide again. */
  slideReadyS: number;
}

/** The ball counts as at someone's feet within this distance, on the ground. */
const POSSESSION_RANGE = 16;
const BALL_LOW = 6;
/** It runs to this far behind a loose ball, so it pushes the ball toward goal. */
const CHASE_OFFSET = 8;
/** It stands this far goal-side of the ball when defending. */
const DEFEND_OFFSET = 20;
const SLIDE_RANGE = 26;
const SLIDE_COOLDOWN_S = 1.2;
const HIGH_BALL = 30;
const HIGH_BALL_RANGE = 30;
/** On the wrong side of a ball this close, it hops over it rather than pushing it toward its own goal. */
const HOP_RANGE = 24;
const CHARGE_MIN_S = 0.25;
const CHARGE_SPREAD_S = 0.55;
const SPRINT_DISTANCE = 120;
const SPRINT_MIN_STAMINA = 0.4;
/** Close enough to a target spot to stop. */
const ARRIVE = 3;
/** How far ahead it leads a rolling ball. */
const LEAD_S = 0.25;

export function createBrain(profile: AiProfile): AiBrain {
  return { profile, nextDecisionS: 0, intent: { ...NO_INTENT }, plan: 'chase', chargeLeftS: 0, slideReadyS: 0 };
}

const attackDir = (me: Player): 1 | -1 => (me.team === 'home' ? 1 : -1);

/** Where a loose ball will be: its landing spot if airborne, a little ahead if rolling. */
function predictBallX(w: World): number {
  const b = w.ball;
  const drop = b.y - BALL_REST_Y;
  const airborne = drop > 1 || b.vy > 0;
  const t = airborne ? (b.vy + Math.sqrt(b.vy * b.vy + 2 * GRAVITY * Math.max(drop, 0))) / GRAVITY : LEAD_S;
  return Math.min(Math.max(b.x + b.vx * t, w.field.fenceL), w.field.fenceR);
}

const toward = (from: number, to: number): number => (Math.abs(to - from) <= ARRIVE ? 0 : Math.sign(to - from));

function decide(brain: AiBrain, w: World, me: Player, them: Player): void {
  const { profile } = brain;
  const dir = attackDir(me);
  const ball = w.ball;
  const low = ball.y <= BALL_LOW;
  const ahead = (ball.x - me.x) * dir;
  const sprint = Math.abs(ball.x - me.x) > SPRINT_DISTANCE && me.stamina > SPRINT_MIN_STAMINA;
  const intent: PlayerIntent = { ...NO_INTENT, sprint };

  // Has the ball: dribble at goal, and shoot once in range.
  if (low && ahead >= 0 && ahead <= POSSESSION_RANGE) {
    const goalLine = w.field.goals.find(g => g.side === (dir > 0 ? 'right' : 'left'))!.lineX;
    const charging = brain.plan === 'charge' && brain.intent.shootHeld;
    if (charging) return;
    if ((goalLine - me.x) * dir <= profile.shootRange) {
      const aim: Aim = w.rng() < 0.5 ? 'level' : 'up';
      brain.plan = 'charge';
      brain.chargeLeftS = CHARGE_MIN_S + w.rng() * CHARGE_SPREAD_S;
      brain.intent = { ...intent, moveX: dir, shootHeld: true, aim };
      return;
    }
    brain.plan = 'dribble';
    brain.intent = { ...intent, moveX: dir };
    return;
  }

  // The opponent has it: get goal-side, and slide in when close.
  if (low && Math.abs(ball.x - them.x) <= POSSESSION_RANGE) {
    brain.plan = 'defend';
    const facingBall = Math.sign(ball.x - me.x) === me.facing;
    if (Math.abs(ball.x - me.x) <= SLIDE_RANGE && brain.slideReadyS === 0 && facingBall && w.rng() < profile.aggression) {
      brain.slideReadyS = SLIDE_COOLDOWN_S;
      brain.intent = { ...intent, chipHeld: true };
      return;
    }
    brain.intent = { ...intent, moveX: toward(me.x, ball.x - dir * DEFEND_OFFSET) };
    return;
  }

  // Loose ball: head it if it's overhead, otherwise get behind it.
  if (ball.y > HIGH_BALL && Math.abs(ball.x - me.x) <= HIGH_BALL_RANGE) {
    brain.plan = 'jump';
    brain.intent = { ...intent, moveX: toward(me.x, ball.x), jump: true, aim: 'level' };
    return;
  }
  brain.plan = 'chase';
  const target = predictBallX(w) - dir * CHASE_OFFSET;
  const wrongSide = low && ahead < 0 && -ahead <= HOP_RANGE;
  brain.intent = { ...intent, moveX: toward(me.x, target), jump: wrongSide };
}

/**
 * The computer player's intent for this tick. It re-decides every
 * reactionS and holds its intent in between; a charged shot releases on
 * its own timer. Jumps and slides are one-tick presses.
 */
export function think(brain: AiBrain, w: World, me: Player, them: Player, dt: number): PlayerIntent {
  brain.nextDecisionS -= dt;
  brain.slideReadyS = Math.max(0, brain.slideReadyS - dt);
  if (brain.plan === 'charge' && brain.intent.shootHeld) {
    brain.chargeLeftS -= dt;
    if (brain.chargeLeftS <= 0) brain.intent = { ...brain.intent, shootHeld: false };
  }
  if (brain.nextDecisionS <= 1e-9) {
    decide(brain, w, me, them);
    brain.nextDecisionS = brain.profile.reactionS;
  }
  const out = { ...brain.intent };
  brain.intent = { ...brain.intent, jump: false, chipHeld: false };
  return out;
}
