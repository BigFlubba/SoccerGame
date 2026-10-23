import { describe, expect, it } from 'vitest';
import { BALL_REST_Y, type Ball } from './ball';
import { CAMERA_LOOKAHEAD_S, VIEW_W, offscreenArrow, updateCamera } from './camera';

const STEP = 1 / 60;
const ball = (p: Partial<Ball>): Ball => ({ x: 320, y: BALL_REST_Y, vx: 0, vy: 0, spin: 0, spinAngle: 0, ...p });

function settle(camX: number, b: Ball): number {
  const cam = { x: camX };
  for (let i = 0; i < 600; i++) updateCamera(cam, b, STEP, 640);
  return cam.x;
}

describe('updateCamera', () => {
  it('centres on the ball with lookahead in its direction of travel', () => {
    expect(settle(0, ball({ x: 300, vx: 100 }))).toBeCloseTo(300 + 100 * CAMERA_LOOKAHEAD_S - VIEW_W / 2);
    expect(settle(300, ball({ x: 300, vx: -100 }))).toBeCloseTo(300 - 100 * CAMERA_LOOKAHEAD_S - VIEW_W / 2);
  });

  it('clamps at both ends of the field', () => {
    expect(settle(100, ball({ x: 10 }))).toBe(0);
    expect(settle(100, ball({ x: 630 }))).toBe(320);
  });

  it('moves smoothly, not instantly', () => {
    const cam = { x: 0 };
    updateCamera(cam, ball({ x: 600 }), STEP, 640);
    expect(cam.x).toBeGreaterThan(0);
    expect(cam.x).toBeLessThan(0.25 * 320);
  });
});

describe('offscreenArrow', () => {
  it('shows an arrow only when the ball is above the screen', () => {
    expect(offscreenArrow(ball({ x: 400, y: 170 }), { x: 250 })).toEqual({ x: 150 });
    expect(offscreenArrow(ball({ x: 400, y: 100 }), { x: 250 })).toBeNull();
  });
});
