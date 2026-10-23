import { describe, expect, it } from 'vitest';
import { BACKYARD, goalScored, inGoalBox, playerSpan } from './field';

describe('goalScored', () => {
  it('scores only between the posts', () => {
    expect(goalScored(BACKYARD, { x: 615, y: 10, z: 32 })).toBe('right');
    expect(goalScored(BACKYARD, { x: 615, y: 10, z: 46 - 2 })).toBeNull(); // ball pokes past the far post
    expect(goalScored(BACKYARD, { x: 615, y: 10, z: 10 })).toBeNull(); // wide of the near post
  });

  it('needs the whole ball past the line and under the bar', () => {
    expect(goalScored(BACKYARD, { x: 612 + 2, y: 10, z: 32 })).toBeNull();
    expect(goalScored(BACKYARD, { x: 620, y: 27, z: 32 })).toBeNull();
    expect(goalScored(BACKYARD, { x: 28 - 3, y: 3, z: 32 })).toBe('left');
    expect(goalScored(BACKYARD, { x: 320, y: 3, z: 32 })).toBeNull();
  });
});

describe('inGoalBox', () => {
  const right = BACKYARD.goals[1];

  it('covers the space between the line, the net back and the posts', () => {
    expect(inGoalBox(right, 620, 32)).toBe(true);
    expect(inGoalBox(right, 620, 10)).toBe(false);
    expect(inGoalBox(right, 600, 32)).toBe(false);
  });

  it('grows by the margin', () => {
    expect(inGoalBox(right, 620, 15, 4)).toBe(true);
    expect(inGoalBox(right, 609, 32, 4)).toBe(true);
    expect(inGoalBox(right, 607, 32, 4)).toBe(false);
  });
});

describe('playerSpan', () => {
  it('runs fence to fence, so players can walk round the goals', () => {
    expect(playerSpan(BACKYARD)).toEqual([BACKYARD.fenceL, BACKYARD.fenceR]);
  });
});
