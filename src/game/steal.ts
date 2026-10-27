import { BALL_R } from '../art/ball';
import { DIFFICULTY } from './ai';
import { BALL_REST_Y, type Ball } from './ball';
import { TOUCH_COOLDOWN_S, canPlace } from './contact';
import { PLAYER_R, cancelCharge, type Player, type PlayerIntent } from './player';
import { touchPush } from './stats';
import type { World } from './world';
import { REACH_Z, ballIn, footZone, type Rect } from './zones';

/**
 * Harrison's steal button. A tap with Max's ball in reach jabs for it: a
 * clean steal traps it at his feet, otherwise it's poked loose along his
 * run. A loose ball in reach is always trapped. A tap with nothing in reach
 * is a whiff: he stumbles. Max doesn't get the button.
 */

export type StealOutcome = 'stole' | 'poked' | 'trapped' | 'whiff';

/** A ball this far ahead of Max along his facing, low and on his line, is his: his own possession test. */
const MAX_BALL_AHEAD = 16;
const BALL_LOW = BALL_REST_Y + 3;
/** The steal reaches from this far behind him to this far ahead, and this far either side in depth... */
const STEAL_BEHIND = 2;
export const STEAL_AHEAD = 20;
export const STEAL_SIDE = REACH_Z + 3;
/** ...from the ground to this high. */
const STEAL_HIGH = 12;
/** Each Control level above 1 adds this to the clean-steal odds, up to the cap. */
export const STEAL_PER_CONTROL = 0.01;
export const STEAL_ODDS_CAP = 0.98;
/** A clean steal or a trap leaves him and the ball at this fraction of his speed: he checks his run. */
export const TRAP_KEEP = 0.3;
/** A trapped ball sits this far ahead of him. */
export const FOOT_SPOT = 8;
export const STUMBLE_S = 0.25;
export const STEAL_COOLDOWN_S = 0.4;
/** A trapped ball beside Max sits this far clear of his body, px. */
const BODY_CLEARANCE = 0.5;

/** Whether the ball is at Max's feet: low, just ahead of him, on his line, and him on his feet. */
export function maxHasBall(max: Player, ball: Ball): boolean {
  const upright = max.y === 0 && max.state !== 'fallen' && max.state !== 'blown' && max.state !== 'bracing';
  const ahead = (ball.x - max.x) * max.facing;
  return upright && ball.y <= BALL_LOW && ahead >= 0 && ahead <= MAX_BALL_AHEAD && Math.abs(ball.z - max.z) <= REACH_Z;
}

/** The steal's reach: his foot and a little more, low to the ground. */
export function stealZone(p: Player): Rect {
  const [a, b] = [p.x - p.facing * STEAL_BEHIND, p.x + p.facing * STEAL_AHEAD];
  return { x0: Math.min(a, b), x1: Math.max(a, b), y0: p.y, y1: p.y + STEAL_HIGH, z0: p.z - STEAL_SIDE, z1: p.z + STEAL_SIDE };
}

/** The chance a tap with Max's ball in reach takes it cleanly: the difficulty's odds, a little better with Control. */
export function cleanStealOdds(w: World): number {
  const base = (w.maxProfile ?? DIFFICULTY.normal).cleanSteal;
  return Math.min(base + STEAL_PER_CONTROL * (w.home.stats.control - 1), STEAL_ODDS_CAP);
}

/**
 * Where a trapped ball goes: FOOT_SPOT ahead of him on his line, or, when
 * Max's body is there (he came from behind Max), beside Max on Harrison's
 * side, still at his feet. Null when there's nowhere to put it.
 */
function trapSpot(w: World): { x: number; z: number } | null {
  const { home, away, ball, field } = w;
  const x = home.x + home.facing * FOOT_SPOT;
  const clear = PLAYER_R + BALL_R + BODY_CLEARANCE;
  const spots = [{ x, z: home.z }];
  const dx = Math.abs(x - away.x);
  if (dx < clear) {
    const off = Math.sqrt(clear * clear - dx * dx);
    const side = Math.sign(home.z - away.z) || (away.z < field.depth / 2 ? 1 : -1);
    spots.push({ x, z: away.z + side * off }, { x, z: away.z - side * off });
  }
  const feet = footZone(home);
  return (
    spots.find(
      s => Math.hypot(s.x - away.x, s.z - away.z) >= clear - 1e-9 && ballIn(feet, { x: s.x, y: BALL_REST_Y, z: s.z }, BALL_R) && canPlace(ball, s.x, s.z, field),
    ) ?? null
  );
}

/** He traps the ball at his feet, and both slow to TRAP_KEEP of his speed; the trap is his touch, so his run doesn't knock it on at once. */
function trap(w: World): void {
  const { home, ball } = w;
  const spot = trapSpot(w);
  if (spot) [ball.x, ball.z, ball.y] = [spot.x, spot.z, BALL_REST_Y];
  home.touchCooldown = TOUCH_COOLDOWN_S;
  home.vx *= TRAP_KEEP;
  home.vz *= TRAP_KEEP;
  Object.assign(ball, { vx: home.vx, vy: 0, vz: home.vz, spin: 0 });
}

/**
 * Max, robbed cleanly, is wrong-footed: his wind-up or swing is lost, and
 * for his beat his feet can't dribble the ball straight back (his brain
 * stands him still for the same beat).
 */
function wrongFoot(max: Player, w: World): void {
  cancelCharge(max);
  if (max.kick) max.kick.active = false;
  max.touchCooldown = (w.maxProfile ?? DIFFICULTY.normal).wrongFootedS;
}

/** A toe to it but no control: it squirts on along his run (along his facing if he's standing), as a hard touch would. */
function poke(w: World): void {
  const { home, ball } = w;
  const speed = Math.hypot(home.vx, home.vz);
  const [ux, uz] = speed > 0 ? [home.vx / speed, home.vz / speed] : [home.facing, 0];
  const push = touchPush(home.stats);
  ball.vx = home.vx + ux * push;
  ball.vz = home.vz + uz * push;
}

/**
 * Harrison's steal press this tick, against Max. Null, and nothing changes,
 * unless he pressed it in play on his feet, not stumbling, not waiting to
 * try again and not powered up. Every other outcome makes him wait
 * STEAL_COOLDOWN_S before the next.
 */
export function resolveSteal(w: World, intent: PlayerIntent): StealOutcome | null {
  const home = w.home;
  const ready = home.state === 'ground' && home.y === 0 && home.stumbleS === 0 && home.stealCooldownS === 0;
  if (!intent.steal || w.match.phase !== 'playing' || w.dog !== null || !ready || (w.power?.activeS ?? 0) > 0) return null;
  home.stealCooldownS = STEAL_COOLDOWN_S;
  if (w.ball.y > BALL_LOW || !ballIn(stealZone(home), w.ball, BALL_R)) {
    home.stumbleS = STUMBLE_S;
    return 'whiff';
  }
  if (!maxHasBall(w.away, w.ball)) {
    trap(w);
    return 'trapped';
  }
  if (w.rng() < cleanStealOdds(w)) {
    trap(w);
    wrongFoot(w.away, w);
    return 'stole';
  }
  poke(w);
  return 'poked';
}
