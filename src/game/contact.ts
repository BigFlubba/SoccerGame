import { BALL_R } from '../art/ball';
import type { Rng } from '../engine/random';
import { BALL_REST_Y, type Ball } from './ball';
import { roofSpan, type Field } from './field';
import { aimLine, chip, header, shot, volley } from './kick';
import { PLAYER_W, knockDown, type Player } from './player';
import { touchPush } from './stats';
import { ballIn, bodyBox, footZone, headZone, slideZone, touchZone } from './zones';

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
/** How close counts as touching a wall. */
const TOUCH_EPS = 0.5;

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
  const feet = bodyBox(opponent);
  const onGround = opponent.y === 0 && opponent.state !== 'air';
  if (onGround && opponent.state !== 'fallen' && feet.x0 <= reach.x1 && feet.x1 >= reach.x0) {
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

/** Running into a ball on the ground knocks it ahead of him with a small touch. */
function dribble(p: Player, ball: Ball, ev: ContactEvents): void {
  const running = p.vx * p.facing > DRIBBLE_MIN_SPEED;
  if (p.state !== 'ground' || !running || p.touchCooldown > 0 || !ballIn(touchZone(p), ball, BALL_R)) return;
  ball.vx = p.vx + p.facing * touchPush(p.stats);
  p.touchCooldown = TOUCH_COOLDOWN_S;
  ev.touched = true;
}

/**
 * His body is solid: a ball running into him bounces back off the side it
 * came from, unless that would put it back up on a net roof.
 */
function block(p: Player, ball: Ball, field: Field): void {
  if (!ballIn(bodyBox(p), ball, BALL_R)) return;
  const side = ball.x === p.x ? -p.facing : Math.sign(ball.x - p.x);
  const closing = (ball.vx - p.vx) * side < 0;
  const x = p.x + side * (PLAYER_W / 2 + BALL_R);
  if (!closing || onRoof({ x, y: ball.y }, field)) return;
  ball.x = x;
  ball.vx = p.vx - BODY_RESTITUTION * (ball.vx - p.vx);
}

/** A ball wedged between his body and a fence or the back of a net pops up so it can't stay stuck. */
function unpin(p: Player, ball: Ball, field: Field): void {
  if (ball.vy > 0 || !ballIn(bodyBox(p), ball, BALL_R)) return;
  const atFence = ball.x - BALL_R <= field.fenceL + TOUCH_EPS || ball.x + BALL_R >= field.fenceR - TOUCH_EPS;
  const atNet = field.goals.some(
    g => ball.y < g.barY && (g.side === 'right' ? ball.x + BALL_R >= g.backX - TOUCH_EPS : ball.x - BALL_R <= g.backX + TOUCH_EPS),
  );
  if (atFence || atNet) ball.vy = PINNED_POP_VY;
}

/**
 * A ball sitting on a net roof, or rolling over its edge, is on top of the
 * goal, out of reach of the players' bodies under it.
 */
function onRoof(ball: { x: number; y: number }, field: Field): boolean {
  return field.goals.some(g => {
    const [x0, x1] = roofSpan(field, g);
    return ball.x >= x0 - BALL_R && ball.x <= x1 + BALL_R && ball.y >= g.barY + g.barThick;
  });
}

const squeezed = (p: Player, opponent: Player, ball: Ball): boolean =>
  ballIn(bodyBox(p), ball, BALL_R) && ballIn(bodyBox(opponent), ball, BALL_R);

/**
 * A 50/50: a ball squeezed between both players on the ground pops up over
 * their heads midway between them and squirts out to a random side, so
 * neither body shoves it through the other and neither side always wins.
 */
function squirt(p: Player, opponent: Player, ball: Ball, rng: Rng): void {
  if (ball.vy > 0 || ball.y > BALL_REST_Y) return;
  ball.x = (p.x + opponent.x) / 2;
  ball.vy = SQUEEZE_POP_VY;
  ball.vx = (p.vx + opponent.vx) / 2 + (rng() < 0.5 ? -1 : 1) * SQUEEZE_SQUIRT_VX;
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
    unpin(p, ball, field);
  }
  // Also catches a block that pushed the ball out into the other player.
  if (squeezed(p, opponent, ball)) squirt(p, opponent, ball, rng);
  return ev;
}
