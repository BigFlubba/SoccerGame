import type { Style } from './ai';
import type { Goal } from './field';
import { PLAYER_R, type Player } from './player';
import type { World } from './world';
import { REACH_Z } from './zones';

/**
 * What each opponent's style changes at the brain's decision points. Max
 * is allRound and plays exactly as before; each of the Park crew changes
 * one or two of these.
 */

export const attackDir = (me: Player): 1 | -1 => (me.team === 'home' ? 1 : -1);
export const goalCentreZ = (g: Goal): number => (g.z0 + g.z1) / 2;

/** allRound stands this far goal-side of the ball when defending... */
export const DEFEND_OFFSET = 20;
/** ...and this fraction of the way across from the ball toward its own goal's centre. */
export const DEFEND_COVER = 1 / 3;

/**
 * The blocker drops `cover` of the way from the ball back to his goal line,
 * at least `minAhead` goal-side of the ball and never within `offLine` of
 * the line, so a chip can drop in behind him. A ball up to `touchAhead`
 * in front of the opponent, within `touchSide` of their line, is still
 * theirs to him: a dribble touch.
 */
export const BLOCKER = { cover: 0.6, minAhead: 24, offLine: 48, touchAhead: 36, touchSide: 10 };

/** Where it stands while the opponent has the ball. allRound: Max's spot, as today. */
export function defendSpot(style: Style, w: World, me: Player, defending: Goal): { x: number; z: number } {
  const ball = w.ball;
  const dir = attackDir(me);
  const centre = goalCentreZ(defending);
  if (style !== 'blocker') return { x: ball.x - dir * DEFEND_OFFSET, z: ball.z + (centre - ball.z) * DEFEND_COVER };
  // Distances measured from the ball back toward his own goal line.
  const toLine = (defending.lineX - ball.x) * -dir;
  const back = Math.min(Math.max(toLine * BLOCKER.cover, BLOCKER.minAhead), toLine - BLOCKER.offLine);
  const x = ball.x - dir * back;
  // In the shot's lane: on the line from the ball to his goal's centre, at his x.
  const t = toLine === 0 ? 0 : back / toLine;
  const z = Math.min(Math.max(ball.z + (centre - ball.z) * t, PLAYER_R), w.field.depth - PLAYER_R);
  return { x, z };
}

/** The ball counts as at someone's feet within this distance, on the ground. */
export const POSSESSION_RANGE = 16;

/**
 * Whether the ball counts as the opponent's, so it defends rather than
 * going for it. allRound: any ball within POSSESSION_RANGE of them, as
 * today. The blocker: a ball ahead of them on their line, up to a dribble
 * touch away, so he holds his spot while they dribble at him, but goes for
 * a ball lying beside or behind them that they can't play.
 */
export function theirBall(style: Style, w: World, them: Player): boolean {
  const ball = w.ball;
  if (style !== 'blocker') return Math.hypot(ball.x - them.x, ball.z - them.z) <= POSSESSION_RANGE;
  const ahead = (ball.x - them.x) * them.facing;
  return ahead >= 0 && ahead <= BLOCKER.touchAhead && Math.abs(ball.z - them.z) <= BLOCKER.touchSide;
}
