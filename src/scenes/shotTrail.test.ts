import { describe, expect, it } from 'vitest';
import type { Ball } from '../game/ball';
import { TRAIL_LEN, TRAIL_MIN_SPEED, stepTrail, type TrailPoint } from './shotTrail';

const ball = (x: number, speed: number): Ball => ({ x, y: 10, z: 32, vx: speed, vy: 0, vz: 0, spin: 0, spinAngle: 0 });

describe('shot trail', () => {
  it('follows a fast ball, newest first, up to TRAIL_LEN points', () => {
    const trail: TrailPoint[] = [];
    for (let i = 0; i < TRAIL_LEN + 3; i++) stepTrail(trail, ball(100 + i * 8, TRAIL_MIN_SPEED));
    expect(trail).toHaveLength(TRAIL_LEN);
    expect(trail[0]!.x).toBe(100 + (TRAIL_LEN + 2) * 8);
    expect(trail[1]!.x).toBeLessThan(trail[0]!.x);
  });

  it('shrinks away a point per tick once the ball slows', () => {
    const trail: TrailPoint[] = [];
    for (let i = 0; i < 4; i++) stepTrail(trail, ball(100 + i * 8, 500));
    stepTrail(trail, ball(130, TRAIL_MIN_SPEED - 1));
    expect(trail).toHaveLength(3);
    for (let i = 0; i < 5; i++) stepTrail(trail, ball(130, 0));
    expect(trail).toHaveLength(0);
  });

  it('starts fresh when the ball jumps (a kickoff reset), instead of streaking across the pitch', () => {
    const trail: TrailPoint[] = [];
    for (let i = 0; i < 4; i++) stepTrail(trail, ball(600 + i * 8, 500));
    stepTrail(trail, ball(320, 0));
    expect(trail).toHaveLength(0);
  });

  it('a slow ball leaves no trail', () => {
    const trail: TrailPoint[] = [];
    for (let i = 0; i < 10; i++) stepTrail(trail, ball(100 + i, 100));
    expect(trail).toHaveLength(0);
  });
});
