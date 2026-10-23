import { describe, expect, it } from 'vitest';
import { depthSorted, type Drawable } from './depthSort';

const item = (name: string, z: number, log: string[]): Drawable => ({ z, draw: () => void log.push(name) });

describe('depthSorted', () => {
  it('draws far things first and near things last', () => {
    const log: string[] = [];
    const sorted = depthSorted([item('near', 5, log), item('far', 60, log), item('middle', 30, log)]);
    for (const d of sorted) d.draw({} as CanvasRenderingContext2D);
    expect(log).toEqual(['far', 'middle', 'near']);
  });

  it('a post sorts between a player behind it and a player in front', () => {
    const log: string[] = [];
    const sorted = depthSorted([item('in front', 12, log), item('far post', 46, log), item('behind', 50, log), item('near post', 18, log)]);
    for (const d of sorted) d.draw({} as CanvasRenderingContext2D);
    expect(log).toEqual(['behind', 'far post', 'near post', 'in front']);
  });

  it('keeps the input order for things at the same depth', () => {
    const log: string[] = [];
    for (const d of depthSorted([item('player', 20, log), item('ball', 20, log)])) d.draw({} as CanvasRenderingContext2D);
    expect(log).toEqual(['player', 'ball']);
  });

  it('leaves its input alone', () => {
    const items = [{ z: 1, draw: () => {} }, { z: 2, draw: () => {} }];
    depthSorted(items);
    expect(items.map(i => i.z)).toEqual([1, 2]);
  });
});
