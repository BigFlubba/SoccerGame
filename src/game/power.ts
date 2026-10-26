import { BALL_R } from '../art/ball';
import { GRAVITY } from './constants';
import type { Goal } from './field';
import { POST_INSET, type Aim } from './kick';
import type { World } from './world';
import { ballAtFeet } from './zones';

/** What Harrison brings to a match from the profile: present only once he owns a power move. */
export interface PowerKit {
  golden: boolean;
}

/** Harrison's super meter for one match, and the kick it credits a goal to. */
export interface PowerState {
  golden: boolean;
  /** 0..1; full pays for one Energy Wave. */
  meter: number;
  /** Seconds since the meter last became full. */
  sinceFullS: number;
  /** His last kick still in play, so a goal knows whether it was a style goal. */
  lastKind: 'shot' | 'chip' | 'volley' | 'header' | 'wave' | null;
}

/** What each thing he does adds to the meter, tuned so an ordinary match fills it about once. */
export const METER_GAIN = { touch: 0.01, tackle: 0.15, onTarget: 0.2, styleGoal: 0.4 };
/** Dribbling alone never fills it: touches add nothing from here up. */
export const TOUCH_CEILING = 0.5;
export const GOLDEN_GAIN = 1.1;
/** It can't fill twice within this long: until then, gains stop at REFILL_CAP. */
export const METER_MIN_REFILL_S = 20;
const REFILL_CAP = 0.99;
/** The ball must be this far in front of the goal line for a clean line into the mouth. */
export const WAVE_MIN_DX = 24;

export function createPower(kit: PowerKit): PowerState {
  return { golden: kit.golden, meter: 0, sinceFullS: Infinity, lastKind: null };
}

export function addMeter(s: PowerState, e: keyof typeof METER_GAIN): void {
  if (s.meter >= 1 || (e === 'touch' && s.meter >= TOUCH_CEILING)) return;
  const cap = Math.min(s.sinceFullS < METER_MIN_REFILL_S ? REFILL_CAP : 1, e === 'touch' ? TOUCH_CEILING : 1);
  const gain = METER_GAIN[e] * (s.golden ? GOLDEN_GAIN : 1);
  s.meter = Math.max(s.meter, Math.min(cap, s.meter + gain));
  if (s.meter >= 1) {
    s.meter = 1;
    s.sinceFullS = 0;
  }
}

export function tickPower(s: PowerState, dt: number): void {
  s.sinceFullS += dt;
}

/**
 * Whether the ball's flight crosses the goal line on the frame or inside it:
 * a shot that scores, hits a post or the bar, or would have if Max hadn't
 * blocked it. Bounces are ignored, with the height clamped at the ground.
 */
export function onTarget(ball: { x: number; y: number; z: number; vx: number; vy: number; vz: number }, goal: Goal): boolean {
  const t = (goal.lineX - ball.x) / ball.vx;
  if (!(t >= 0) || !Number.isFinite(t)) return false;
  const z = ball.z + ball.vz * t;
  const y = Math.max(0, ball.y + ball.vy * t - 0.5 * GRAVITY * t * t);
  return z >= goal.z0 - BALL_R && z <= goal.z1 + BALL_R && y - BALL_R <= goal.barY + goal.barThick;
}

/** Where in depth the wave crosses the goal line: inside a post, like a charged shot, or the middle of the mouth. */
export function waveTarget(goal: Goal, aim: Aim): number {
  if (aim === 'far') return goal.z1 - POST_INSET;
  if (aim === 'near') return goal.z0 + POST_INSET;
  return (goal.z0 + goal.z1) / 2;
}

/** A straight line from the ball can enter the mouth clear of the posts: it's far enough in front of the goal line. */
export function waveClear(ball: { x: number }, goal: Goal): boolean {
  const inFront = goal.side === 'right' ? goal.lineX - ball.x : ball.x - goal.lineX;
  return inFront >= WAVE_MIN_DX;
}

/** The goal Harrison attacks. */
export const maxGoal = (w: World): Goal => w.field.goals.find(g => g.side === 'right')!;

const facesMaxGoal = (w: World): boolean => w.home.facing === (maxGoal(w).side === 'right' ? 1 : -1);

/** Whether a power press now starts a power-up. Facing Max's goal already means the beam can never fly at his own. */
export function canStartPower(w: World): boolean {
  return (
    w.power !== null &&
    w.power.meter === 1 &&
    w.match.phase === 'playing' &&
    w.home.state === 'ground' &&
    facesMaxGoal(w) &&
    ballAtFeet(w.home, w.ball) &&
    waveClear(w.ball, maxGoal(w))
  );
}

/** The HUD's Y button: hidden until the meter is full, dimmed while the ball is at his feet but there's no clean line. */
export function powerHint(w: World): 'none' | 'lit' | 'dim' {
  if (!w.power || w.power.meter < 1) return 'none';
  if (ballAtFeet(w.home, w.ball) && (!facesMaxGoal(w) || !waveClear(w.ball, maxGoal(w)))) return 'dim';
  return 'lit';
}
