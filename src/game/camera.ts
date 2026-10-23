import type { Ball } from './ball';

export interface Camera {
  /** World x of the screen's left edge. */
  x: number;
}

export const VIEW_W = 320,
  CAMERA_LOOKAHEAD_S = 0.25,
  CAMERA_SMOOTHING = 6;
/** Screen row of the ground line; world height y sits at screen row GROUND_SY − y. */
export const GROUND_SY = 164;
/** Closer than this, the camera snaps onto its target instead of creeping forever. */
const SNAP_PX = 0.05;

/** Follows the ball with smoothing, looking ahead along its travel, clamped to the field. */
export function updateCamera(cam: Camera, ball: Ball, dt: number, fieldWidth: number): void {
  const clamp = (x: number) => Math.min(Math.max(x, 0), fieldWidth - VIEW_W);
  const target = clamp(ball.x + ball.vx * CAMERA_LOOKAHEAD_S - VIEW_W / 2);
  const gap = target - cam.x;
  cam.x = Math.abs(gap) < SNAP_PX ? target : clamp(cam.x + gap * (1 - Math.exp(-CAMERA_SMOOTHING * dt)));
}

/** Where to point the off-screen arrow when the ball is above the top of the screen. */
export function offscreenArrow(ball: Ball, cam: Camera): null | { x: number } {
  return ball.y > GROUND_SY ? { x: ball.x - cam.x } : null;
}
