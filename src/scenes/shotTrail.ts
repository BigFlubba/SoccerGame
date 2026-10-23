import { HARD_KICK_SPEED } from '../audio/matchFeedback';
import type { Ball } from '../game/ball';

/** A short fading streak behind the ball on hard shots: where it was over the last few ticks. */
export interface TrailPoint {
  x: number;
  y: number;
  z: number;
}

export const TRAIL_LEN = 6;
/** The ball leaves a trail at the speed a kick sounds hard. */
export const TRAIL_MIN_SPEED = HARD_KICK_SPEED;
/** A ball this far from the trail's head has been placed (a kickoff), not kicked. */
const TRAIL_JUMP_PX = 40;

/** One tick: a fast ball adds its spot (newest first), a slower one lets the trail shrink away. */
export function stepTrail(trail: TrailPoint[], ball: Ball): void {
  const head = trail[0];
  if (head && Math.hypot(ball.x - head.x, ball.y - head.y, ball.z - head.z) > TRAIL_JUMP_PX) trail.length = 0;
  if (Math.hypot(ball.vx, ball.vy, ball.vz) >= TRAIL_MIN_SPEED) {
    trail.unshift({ x: ball.x, y: ball.y, z: ball.z });
    if (trail.length > TRAIL_LEN) trail.pop();
  } else {
    trail.pop();
  }
}
