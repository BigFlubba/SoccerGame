import { PLAYER_H, PLAYER_W, type Player } from './player';

/** A world-space box: x right, y up. */
export interface Rect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** A box given facing-relative: `ahead0..ahead1` in front of him, `up0..up1` above his feet. */
function zone(p: Player, ahead0: number, ahead1: number, up0: number, up1: number): Rect {
  const [a, b] = [p.x + p.facing * ahead0, p.x + p.facing * ahead1];
  return { x0: Math.min(a, b), x1: Math.max(a, b), y0: p.y + up0, y1: p.y + up1 };
}

/** Ground kicks and chips; volleys in the air. */
export const footZone = (p: Player): Rect => zone(p, 2, 14, 0, 12);
/** Headers while airborne. */
export const headZone = (p: Player): Rect => zone(p, -4, 10, 30, 44);
/** Dribble touches: just ahead of him, ball on the ground. */
export const touchZone = (p: Player): Rect => zone(p, 4, 10, 0, 4);
/** A slide tackle's reach, low to the ground. */
export const slideZone = (p: Player): Rect => zone(p, 0, 16, 0, 8);
/** His body, which blocks the ball. */
export const bodyBox = (p: Player): Rect => zone(p, -PLAYER_W / 2, PLAYER_W / 2, 0, PLAYER_H);

/** Circle–rect overlap. */
export function ballIn(r: Rect, b: { x: number; y: number }, radius: number): boolean {
  const dx = b.x - Math.min(Math.max(b.x, r.x0), r.x1);
  const dy = b.y - Math.min(Math.max(b.y, r.y0), r.y1);
  return dx * dx + dy * dy <= radius * radius;
}
