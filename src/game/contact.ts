import { BALL_R } from '../art/ball';
import type { Rng } from '../engine/random';
import { BALL_REST_Y, type Ball } from './ball';
import { POST_R } from './constants';
import { roofSpan, type Field } from './field';
import { aimLine, chip, header, shot, volley } from './kick';
import { PLAYER_R, knockDown, type Player } from './player';
import { touchPush } from './stats';
import { ballIn, ballInBody, footZone, headZone, slideZone, touchPoint } from './zones';

export interface ContactEvents {
  touched: boolean;
  kicked: null | 'shot' | 'chip' | 'volley' | 'header';
  perfect: boolean;
  tackledBall: boolean;
  trippedOpponent: boolean;
}

/** A header needs the ball coming at him, or slow enough to meet. */
const HEADER_MAX_AWAY_SPEED = 300;
/** He must be running at least this fast to dribble. */
const DRIBBLE_MIN_SPEED = 20;
const TOUCH_COOLDOWN_S = 0.12;
const SLIDE_BALL_VX = 220;
const SLIDE_BALL_VY = 80;
/** A ball hitting his body keeps this fraction of its speed, reversed. */
const BODY_RESTITUTION = 0.4;
const PINNED_POP_VY = 160;
/** Clears both players' heads (PLAYER_H) with room to spare. */
const SQUEEZE_POP_VY = 300;
const SQUEEZE_SQUIRT_VX = 60;
/** A ball within this of his touch point (in x and z) meets his foot as he runs. */
const TOUCH_RADIUS = 7;
/** A ball that crossed into his body this recently came in from where it crossed. */
const FRESH_ENTRY_S = 0.02;

function hit(ball: Ball, k: { vx: number; vy: number; vz: number; spin: number }): void {
  ball.vx = k.vx;
  ball.vy = k.vy;
  ball.vz = k.vz;
  ball.spin = k.spin;
}

/** A slide wins the ball if it reaches it, otherwise it can take the opponent's feet. */
function slide(p: Player, opponent: Player, ball: Ball, ev: ContactEvents): void {
  if (p.state !== 'sliding' || !p.kick?.active) return;
  const reach = slideZone(p);
  if (ballIn(reach, ball, BALL_R)) {
    hit(ball, { vx: p.facing * SLIDE_BALL_VX, vy: SLIDE_BALL_VY, vz: 0, spin: 0 });
    p.kick.active = false;
    ev.tackledBall = true;
    return;
  }
  const onGround = opponent.y === 0 && opponent.state !== 'air';
  const feetX = opponent.x + PLAYER_R >= reach.x0 && opponent.x - PLAYER_R <= reach.x1;
  const feetZ = opponent.z + PLAYER_R >= reach.z0 && opponent.z - PLAYER_R <= reach.z1;
  if (onGround && opponent.state !== 'fallen' && feetX && feetZ) {
    knockDown(opponent);
    p.kick.active = false;
    ev.trippedOpponent = true;
  }
}

/** Shots, chips and volleys: the swing connects once if the ball is in reach of his foot. */
function strike(p: Player, ball: Ball, aimErrorDeg: number, rng: Rng, field: Field, ev: ContactEvents): void {
  const k = p.kick;
  if (!k?.active || !ballIn(footZone(p), ball, BALL_R)) return;
  const line = aimLine(ball, p.facing, k.aim, field);
  if (k.kind === 'shot' && p.state === 'kicking') {
    const result = shot(p.stats, k.charge, k.overchargeS, line, aimErrorDeg, rng);
    hit(ball, result);
    ev.perfect = result.perfect;
  } else if (k.kind === 'chip' && p.state === 'chipping') {
    hit(ball, chip(p.stats, k.charge, line));
  } else if (k.kind === 'volley' && p.state === 'air') {
    hit(ball, volley(p.stats, line));
  } else {
    return;
  }
  k.active = false;
  ev.kicked = k.kind;
}

/** A ball meeting his head mid-jump is a header, aimed by the stick. Once per jump. */
function headBall(p: Player, ball: Ball, field: Field, ev: ContactEvents): void {
  if (p.state !== 'air' || p.kick || !ballIn(headZone(p), ball, BALL_R)) return;
  const speed = Math.hypot(ball.vx, ball.vy);
  const comingAtHim = ball.vx * p.facing < 0;
  if (!comingAtHim && speed >= HEADER_MAX_AWAY_SPEED) return;
  hit(ball, header(p.stats, aimLine(ball, p.facing, p.aim, field), speed));
  p.kick = { kind: 'header', charge: 0, overchargeS: 0, aim: p.aim, active: false };
  p.stateT = 0;
  ev.kicked = 'header';
}

/** Running into a ball on the ground knocks it on along his run with a small touch. */
function dribble(p: Player, ball: Ball, ev: ContactEvents): void {
  const at = touchPoint(p);
  if (p.state !== 'ground' || !at || p.touchCooldown > 0 || ball.y > BALL_REST_Y) return;
  if (Math.hypot(ball.x - at.x, ball.z - at.z) > TOUCH_RADIUS) return;
  const speed = Math.hypot(p.vx, p.vz);
  const push = touchPush(p.stats) / speed;
  ball.vx = p.vx * (1 + push);
  ball.vz = p.vz * (1 + push);
  p.touchCooldown = TOUCH_COOLDOWN_S;
  ev.touched = true;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

/** Whether moving the ball's centre from `from` to `to` (at height y) would pass through a goal's netting or a post. */
function throughGoal(field: Field, y: number, from: { x: number; z: number }, to: { x: number; z: number }): boolean {
  return field.goals.some(g => {
    if (y >= g.barY + g.barThick + BALL_R) return false;
    const posts = [g.z0, g.z1].some(z => Math.hypot(to.x - g.lineX, to.z - z) < BALL_R + POST_R);
    if (posts || y >= g.barY) return posts;
    const [x0, x1] = roofSpan(field, g);
    const crossesSide = [g.z0, g.z1].some(z => {
      if (Math.sign(from.z - z) === Math.sign(to.z - z)) return false;
      const x = from.x + ((z - from.z) / (to.z - from.z)) * (to.x - from.x);
      return x >= x0 - BALL_R - POST_R && x <= x1 + BALL_R + POST_R;
    });
    const crossesBack = Math.sign(from.x - g.backX) !== Math.sign(to.x - g.backX) && to.z >= g.z0 - BALL_R && to.z <= g.z1 + BALL_R;
    return crossesSide || crossesBack;
  });
}

/** Whether the ball's centre may be moved to (x, z): inside the walls, not up on a net roof, and not through a goal's netting or posts. */
function canPlace(ball: Ball, x: number, z: number, field: Field): boolean {
  const inside = x === clamp(x, field.fenceL + BALL_R, field.fenceR - BALL_R) && z === clamp(z, BALL_R, field.depth - BALL_R);
  return inside && !onRoof({ x, y: ball.y, z }, field) && !throughGoal(field, ball.y, ball, { x, z });
}

function placeBall(ball: Ball, x: number, z: number, field: Field): void {
  if (!canPlace(ball, x, z, field)) return;
  ball.x = x;
  ball.z = z;
}

/**
 * The outward normal of his body where the ball came in: from where it
 * crossed his outline if that was this tick (so even a hard shot that got
 * past his middle bounces back the way it came), otherwise straight out
 * from his middle.
 */
function bodyNormal(p: Player, ball: Ball): { nx: number; nz: number } {
  const reach = PLAYER_R + BALL_R;
  const [cx, cz] = [ball.x - p.x, ball.z - p.z];
  const [wx, wz] = [ball.vx - p.vx, ball.vz - p.vz];
  const w2 = wx * wx + wz * wz;
  if (w2 > 0) {
    const cw = cx * wx + cz * wz;
    const t = (cw + Math.sqrt(Math.max(0, cw * cw - w2 * (cx * cx + cz * cz - reach * reach)))) / w2;
    if (t <= FRESH_ENTRY_S) return { nx: (cx - t * wx) / reach, nz: (cz - t * wz) / reach };
  }
  const d = Math.hypot(cx, cz);
  return d > 0 ? { nx: cx / d, nz: cz / d } : { nx: -p.facing, nz: 0 };
}

/**
 * His body is solid: a ball running into him bounces back off the side it
 * came from. A ball wedged between his body and a wall, a net or a post
 * pops up so it can't stay stuck.
 */
function block(p: Player, ball: Ball, field: Field): void {
  if (!ballInBody(p, ball, BALL_R)) return;
  const { nx, nz } = bodyNormal(p, ball);
  const reach = PLAYER_R + BALL_R;
  const [x, z] = [p.x + nx * reach, p.z + nz * reach];
  if (!canPlace(ball, x, z, field)) {
    if (!onRoof(ball, field) && ball.vy <= 0) ball.vy = PINNED_POP_VY;
    return;
  }
  const closing = (ball.vx - p.vx) * nx + (ball.vz - p.vz) * nz;
  if (closing >= 0) return;
  [ball.x, ball.z] = [x, z];
  ball.vx -= (1 + BODY_RESTITUTION) * closing * nx;
  ball.vz -= (1 + BODY_RESTITUTION) * closing * nz;
}

/**
 * A ball sitting on a net roof, or rolling over its edge, is on top of the
 * goal, out of reach of the players' bodies under it.
 */
function onRoof(ball: { x: number; y: number; z: number }, field: Field): boolean {
  return field.goals.some(g => {
    const [x0, x1] = roofSpan(field, g);
    const over = ball.x >= x0 - BALL_R && ball.x <= x1 + BALL_R && ball.z >= g.z0 - BALL_R && ball.z <= g.z1 + BALL_R;
    return over && ball.y >= g.barY + g.barThick;
  });
}

const squeezed = (p: Player, opponent: Player, ball: Ball): boolean => ballInBody(p, ball, BALL_R) && ballInBody(opponent, ball, BALL_R);

/**
 * A 50/50: a ball squeezed between both players on the ground pops up over
 * their heads midway between them and squirts out to a random side of the
 * line between them, so it leaves both bodies at once, neither shoves it
 * through the other, and neither side always wins.
 */
function squirt(p: Player, opponent: Player, ball: Ball, rng: Rng, field: Field): void {
  if (ball.vy > 0 || ball.y > BALL_REST_Y) return;
  placeBall(ball, (p.x + opponent.x) / 2, (p.z + opponent.z) / 2, field);
  const [dx, dz] = [opponent.x - p.x, opponent.z - p.z];
  const d = Math.hypot(dx, dz);
  // Square to the line between them: pitch-wise that's in depth when they meet head-on.
  const [sx, sz] = d > 0 ? [-dz / d, dx / d] : [0, 1];
  const side = rng() < 0.5 ? -1 : 1;
  ball.vy = SQUEEZE_POP_VY;
  ball.vx = (p.vx + opponent.vx) / 2 + side * sx * SQUEEZE_SQUIRT_VX;
  ball.vz = (p.vz + opponent.vz) / 2 + side * sz * SQUEEZE_SQUIRT_VX;
}

/** Everything player `p` does to the ball (and to the opponent's feet) this tick. */
export function resolveContacts(p: Player, opponent: Player, ball: Ball, aimErrorDeg: number, rng: Rng, field: Field): ContactEvents {
  const ev: ContactEvents = { touched: false, kicked: null, perfect: false, tackledBall: false, trippedOpponent: false };
  slide(p, opponent, ball, ev);
  strike(p, ball, aimErrorDeg, rng, field, ev);
  if (!ev.kicked) headBall(p, ball, field, ev);
  if (ev.kicked || ev.tackledBall || onRoof(ball, field)) return ev;
  if (!squeezed(p, opponent, ball)) {
    dribble(p, ball, ev);
    block(p, ball, field);
  }
  // Also catches a block that pushed the ball out into the other player.
  if (squeezed(p, opponent, ball)) squirt(p, opponent, ball, rng, field);
  return ev;
}
