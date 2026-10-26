import { describe, expect, it } from 'vitest';
import { MILESTONES, milestonesDue } from './milestones';

describe('milestones', () => {
  it('the spec table', () => {
    expect(MILESTONES.map(m => [m.stars, m.coins])).toEqual([[10, 300], [25, 600], [50, 1000], [75, 1500]]);
    expect(MILESTONES.map(m => m.index)).toEqual([0, 1, 2, 3]);
  });
  it('pays what is reached and unpaid, in order', () => {
    expect(milestonesDue(9, 0)).toEqual([]);
    expect(milestonesDue(10, 0).map(m => m.coins)).toEqual([300]);
    expect(milestonesDue(13, 1)).toEqual([]);
    expect(milestonesDue(60, 0).map(m => m.index)).toEqual([0, 1, 2]);
    expect(milestonesDue(93, 4)).toEqual([]);
  });
});
