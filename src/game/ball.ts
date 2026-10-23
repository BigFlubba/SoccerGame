import { BALL_R } from '../art/ball';
import {
  AIR_DRAG,
  BALL_RESTITUTION,
  BALL_SUBSTEP_PX,
  BAR_RESTITUTION,
  BAR_ROLL_SPEED,
  GRAVITY,
  NET_DAMPING,
  ROLL_FRICTION,
  SETTLE_SPEED,
  SPIN_DECAY,
  SPIN_DIP,
  SPIN_SKIP,
  WALL_RESTITUTION,
} from './constants';
import type { Field, Goal } from './field';

/** World: x right, y = height above the ground (up). */
export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Positive is topspin, negative backspin. */
  spin: number;
  /** Rolling animation angle, radians. */
  spinAngle: number;
}

export interface BallEvents {
  bounced: boolean;
  hitBar: boolean;
  hitWall: boolean;
  hitNet: boolean;
}

const towardZero = (v: number, by: number): number => (v > 0 ? Math.max(0, v - by) : Math.min(0, v + by));

/**
 * The crossbar as a solid box. Its top (the net roof) runs on from the bar to
 * the end fence, so nothing can drop into the gap behind the net and stick.
 */
function barBox(g: Goal, field: Field) {
  const [x0, x1] = g.side === 'right' ? [g.lineX, field.fenceR] : [field.fenceL, g.lineX];
  return { x0, x1, y0: g.barY, y1: g.barY + g.barThick };
}

/** Circle–box contact: pushes the ball out and reflects its velocity. Returns true on a hit. */
function collideBar(b: Ball, g: Goal, field: Field): boolean {
  const { x0, x1, y0, y1 } = barBox(g, field);
  const dx = b.x - Math.min(Math.max(b.x, x0), x1);
  const dy = b.y - Math.min(Math.max(b.y, y0), y1);
  const d = Math.hypot(dx, dy);
  if (d >= BALL_R) return false;
  let nx = 0;
  let ny: number;
  if (d === 0) {
    // Centre inside the bar (only from a bad start position): leave by the nearer of top and bottom.
    ny = b.y >= (y0 + y1) / 2 ? 1 : -1;
    b.y = ny > 0 ? y1 + BALL_R : y0 - BALL_R;
  } else {
    nx = dx / d;
    ny = dy / d;
    b.x += nx * (BALL_R - d);
    b.y += ny * (BALL_R - d);
  }
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    b.vx -= (1 + BAR_RESTITUTION) * vn * nx;
    b.vy -= (1 + BAR_RESTITUTION) * vn * ny;
  }
  const onTop = ny > 0.7;
  if (onTop) {
    if (Math.abs(b.vy) < SETTLE_SPEED) b.vy = 0;
    // The top is slightly rounded: a resting ball always rolls off toward the field.
    const towardField = g.side === 'right' ? -1 : 1;
    if (Math.abs(b.vx) < BAR_ROLL_SPEED) b.vx = towardField * BAR_ROLL_SPEED;
  }
  return vn < -SETTLE_SPEED;
}

/** The net back: a wall from the ground to the bar that soaks up most of the ball's pace. */
function collideNet(b: Ball, g: Goal): boolean {
  if (b.y >= g.barY) return false;
  if (g.side === 'right' && b.x > g.lineX && b.x + BALL_R > g.backX) {
    b.x = g.backX - BALL_R;
    b.vx = -Math.abs(b.vx) * NET_DAMPING;
    return true;
  }
  if (g.side === 'left' && b.x < g.lineX && b.x - BALL_R < g.backX) {
    b.x = g.backX + BALL_R;
    b.vx = Math.abs(b.vx) * NET_DAMPING;
    return true;
  }
  return false;
}

function substep(b: Ball, h: number, field: Field, ev: BallEvents): void {
  const airborne = b.y > 0 || b.vy > 0;
  if (airborne) {
    b.vy -= (GRAVITY + Math.max(b.spin, 0) * SPIN_DIP) * h;
    const drag = 1 - AIR_DRAG * h;
    b.vx *= drag;
    b.vy *= drag;
  } else {
    b.vx = towardZero(b.vx, ROLL_FRICTION * h);
  }
  b.spin = towardZero(b.spin, SPIN_DECAY * h);
  b.x += b.vx * h;
  b.y += b.vy * h;
  b.spinAngle += (b.vx * h) / BALL_R;

  if (b.y < 0) {
    b.y = 0;
    if (b.vy < 0) {
      const up = -b.vy * BALL_RESTITUTION;
      if (up < SETTLE_SPEED) {
        b.vy = 0;
      } else {
        b.vy = up;
        b.vx += b.vx * SPIN_SKIP * b.spin;
        ev.bounced = true;
      }
    }
  }
  if (b.x - BALL_R < field.fenceL) {
    b.x = field.fenceL + BALL_R;
    b.vx = Math.abs(b.vx) * WALL_RESTITUTION;
    ev.hitWall = true;
  } else if (b.x + BALL_R > field.fenceR) {
    b.x = field.fenceR - BALL_R;
    b.vx = -Math.abs(b.vx) * WALL_RESTITUTION;
    ev.hitWall = true;
  }
  for (const g of field.goals) {
    if (collideBar(b, g, field)) ev.hitBar = true;
    if (collideNet(b, g)) ev.hitNet = true;
  }
}

/**
 * Advances the ball by dt in substeps of at most BALL_SUBSTEP_PX, so even a
 * full-power shot can't tunnel through the bar, net or fences.
 */
export function stepBall(ball: Ball, dt: number, field: Field): BallEvents {
  const ev: BallEvents = { bounced: false, hitBar: false, hitWall: false, hitNet: false };
  const fastest = Math.max(Math.abs(ball.vx), Math.abs(ball.vy) + GRAVITY * dt);
  const n = Math.max(1, Math.ceil((fastest * dt) / BALL_SUBSTEP_PX));
  for (let i = 0; i < n; i++) substep(ball, dt / n, field, ev);
  return ev;
}
