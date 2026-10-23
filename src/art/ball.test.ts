import { describe, expect, it } from 'vitest';
import { BALL_R, ballFrames } from './ball';

describe('ballFrames', () => {
  it('ball frames are 7×7 round sprites', () => {
    for (const f of ballFrames()) {
      expect([f.width, f.height]).toEqual([7, 7]);
      expect(f.get(0, 0)).toBe(0);
      expect(f.get(3, 3)).not.toBe(0);
    }
  });

  it('has four distinct rotation frames', () => {
    const frames = ballFrames();
    expect(frames).toHaveLength(4);
    expect(new Set(frames.map(f => f.data.join(''))).size).toBe(4);
  });

  it('is 2·BALL_R + 1 across', () => {
    expect(ballFrames()[0]!.width).toBe(2 * BALL_R + 1);
  });
});
