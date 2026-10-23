import type { Field } from './field';

export interface Camera {
  /** World x of the screen's left edge. */
  x: number;
}

export const VIEW_W = 320,
  CAMERA_LOOKAHEAD_S = 0.25,
  CAMERA_SMOOTHING = 6;
/** Screen row of the near touchline (z 0, y 0). */
export const NEAR_SY = 176;
/** Screen x gained per unit of depth: the oblique slant that makes goals and stripes lean. */
export const DEPTH_SHEAR = 0.3;
/** Closer than this, the camera snaps onto its target instead of creeping forever. */
const SNAP_PX = 0.05;

/** Screen position of a world point: depth runs up the screen and leans right, height straight up. */
export function project(x: number, y: number, z: number, camX: number): { sx: number; sy: number } {
  return { sx: x + z * DEPTH_SHEAR - camX, sy: NEAR_SY - z - y };
}

/** Follows the ball's slanted screen position with smoothing, looking ahead along its travel, clamped to the field. */
export function updateCamera(cam: Camera, ball: { x: number; z: number; vx: number }, dt: number, field: Field): void {
  const maxX = field.width + field.depth * DEPTH_SHEAR - VIEW_W;
  const clamp = (x: number) => Math.min(Math.max(x, 0), maxX);
  const target = clamp(ball.x + ball.z * DEPTH_SHEAR + ball.vx * CAMERA_LOOKAHEAD_S - VIEW_W / 2);
  const gap = target - cam.x;
  cam.x = Math.abs(gap) < SNAP_PX ? target : clamp(cam.x + gap * (1 - Math.exp(-CAMERA_SMOOTHING * dt)));
}

/** Where to point the off-screen arrow when the ball is above the top of the screen. */
export function offscreenArrow(ball: { x: number; y: number; z: number }, cam: Camera): null | { x: number } {
  const p = project(ball.x, ball.y, ball.z, cam.x);
  return p.sy < 0 ? { x: p.sx } : null;
}
