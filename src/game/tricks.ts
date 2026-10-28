import type { Difficulty } from './ai';
import { BALL_REST_Y } from './ball';
import { KEEP_OUT_X, canPlace } from './contact';
import { ballIsHis } from './dragBack';
import type { PlayerIntent } from './player';
import { FOOT_SPOT } from './steal';
import type { World } from './world';

/**
 * Harrison's skill moves, from level 4. RB with the ball at his feet is a
 * stepover, stick up + RB a rainbow flick. Either plays out in full once
 * started, the ball carried by the trick, and sells half way through: a
 * defender squared up to him then is fooled. The trick draws no random
 * numbers, so a match where RB is never pressed plays exactly as before.
 */

export type TrickKind = 'stepover' | 'flick';

/** The window a defender must be in at the sell (gap along Harrison's facing, px), and how long a fooled one's reaction lasts, s. */
export interface TrickProfile {
  near: number;
  far: number;
  confusedS: number;
  stumbleS: number;
}

/** This opponent's reaction times as a share of the difficulty's. */
export interface TrickScale {
  stepover: number;
  flick: number;
}

/** What a match's tricks are worth against this opponent; null in the world when Harrison hasn't the tricks. */
export interface TrickSetup {
  profile: TrickProfile;
  scale: TrickScale;
}

/** Mutable, for headless sweeps. */
export const TRICK_DIFFICULTY: Record<Difficulty, TrickProfile> = {
  easy: { near: 12, far: 56, confusedS: 0.9, stumbleS: 0.9 },
  normal: { near: 14, far: 46, confusedS: 0.7, stumbleS: 0.7 },
  hard: { near: 16, far: 38, confusedS: 0.5, stumbleS: 0.5 },
};

/** The stepover: its length and sell, s; his pace along his facing meanwhile; how far a confused defender sways, px. */
export const STEPOVER = { durationS: 0.4, sellS: 0.2, pace: 0.5, swayPx: 8 };

/**
 * The rainbow flick: its length and release, s; the launch, px/s; how high
 * the ball rides up the back of his leg and how far behind his feet it
 * leaves his heel, px. From rideY it peaks about 85 px up, clears a
 * standing player 12-56 px ahead and lands about 80 px on, just ahead of
 * him running after it.
 */
export const FLICK = { durationS: 0.5, sellS: 0.25, vx: 130, vy: 360, rideY: 12, behind: 6 };

/** After a trick ends, RB does nothing for this long, s. */
export const TRICK_COOLDOWN_S = 1;
/** The stick pushed up at least this far on the press makes it a flick. */
export const STICK_UP = 0.5;

/** What the tricks did this tick. */
export interface TrickEvents {
  started: TrickKind | null;
  /** The flick left his heel. */
  released: boolean;
  /** A trick sold and fooled the defender. */
  fooled: TrickKind | null;
}

export const quietTricks = (): TrickEvents => ({ started: null, released: false, fooled: null });

/** Facing his own goal inside the keep-out zone, where a flick could drop into his own net. */
function facingOwnGoalNear(w: World): boolean {
  const own = w.field.goals.find(g => g.side === 'left')!;
  return w.home.facing === -1 && w.home.x - own.lineX <= KEEP_OUT_X;
}

/**
 * Starts a trick on RB when he has the tricks, is on his feet in play, not
 * already in a trick, a drag-back or a stumble, the cooldown is over, no
 * wave is live, and the ball is his. Stick up makes it a flick, except
 * facing his own goal near it. The stepover dips toward the tighter side.
 */
export function startTrick(w: World, intent: PlayerIntent): TrickKind | null {
  const { home } = w;
  if (!w.tricks || !intent.skill || w.match.phase !== 'playing') return null;
  const ready = home.state === 'ground' && home.y === 0 && home.turnS === 0 && home.stumbleS === 0 && home.trickCooldownS === 0 && home.trick === null;
  if (!ready || w.wave?.live || !ballIsHis(w)) return null;
  const kind: TrickKind = intent.moveZ >= STICK_UP && !facingOwnGoalNear(w) ? 'flick' : 'stepover';
  const side = home.z >= w.field.depth / 2 ? 1 : -1;
  home.trick = { kind, t: 0, side, sold: false, pace: kind === 'stepover' ? STEPOVER.pace : 0, onBall: true };
  w.ball.touchedBy = 'home';
  return kind;
}

/** Puts the ball at (x, y) beside him if it can go there; otherwise it's no longer the trick's to carry. */
function carry(w: World, x: number, y: number): void {
  const { ball, home } = w;
  const trick = home.trick!;
  if (!canPlace({ ...ball, y }, x, ball.z, w.field)) {
    trick.onBall = false;
    return;
  }
  Object.assign(ball, { x, y, vx: home.vx, vy: 0, vz: 0, spin: 0 });
}

/**
 * One tick of the trick under way, and the cooldown. Play stopping or him
 * leaving his feet ends it at once. Someone else playing the ball, the dog
 * taking it, or its spot being behind a fence, a post or a net leaves it
 * where it is, and the trick plays out without it.
 *
 * The stepover holds the ball FOOT_SPOT ahead. The flick rolls it from
 * there up behind his heel to rideY, and launches it at the sell, when he
 * sets off after it at his full run.
 */
export function stepTrick(w: World, dt: number): TrickEvents {
  const ev = quietTricks();
  const { home, ball } = w;
  home.trickCooldownS = Math.max(0, home.trickCooldownS - dt);
  const trick = home.trick;
  if (!trick) return ev;
  if (w.match.phase !== 'playing' || home.state !== 'ground') {
    home.trick = null;
    return ev;
  }
  if (ball.touchedBy !== 'home' || w.dog?.carrying) trick.onBall = false;
  trick.t += dt;
  const timing = trick.kind === 'stepover' ? STEPOVER : FLICK;
  const selling = !trick.sold && trick.t >= timing.sellS - 1e-9;
  if (trick.kind === 'stepover') {
    if (trick.onBall) carry(w, home.x + home.facing * FOOT_SPOT, BALL_REST_Y);
  } else if (!trick.sold && trick.onBall) {
    const k = Math.min(1, trick.t / FLICK.sellS);
    carry(w, home.x + home.facing * (FOOT_SPOT - (FOOT_SPOT + FLICK.behind) * k), BALL_REST_Y + (FLICK.rideY - BALL_REST_Y) * k);
  }
  if (selling) {
    trick.sold = true;
    if (trick.kind === 'flick') {
      trick.pace = 1;
      if (trick.onBall) {
        Object.assign(ball, { vx: home.facing * FLICK.vx, vy: FLICK.vy, vz: 0 });
        ev.released = true;
      }
    }
  }
  if (trick.t >= timing.durationS - 1e-9) {
    home.trick = null;
    home.trickCooldownS = TRICK_COOLDOWN_S;
  }
  return ev;
}
