import { describe, expect, it } from 'vitest';
import { createPlayer } from './player';
import { BASE_STATS } from './stats';
import { ballIn, bodyBox, footZone, headZone, slideZone, touchZone } from './zones';

describe('zones', () => {
  it('zones mirror with facing', () => {
    const left = createPlayer('home', BASE_STATS, 100, -1);
    expect(footZone(left)).toMatchObject({ x0: 86, x1: 98 });
    const right = createPlayer('home', BASE_STATS, 100, 1);
    expect(footZone(right)).toMatchObject({ x0: 102, x1: 114 });
  });

  it('places the zones from the zone table', () => {
    const p = createPlayer('home', BASE_STATS, 100, 1);
    p.y = 10;
    expect(footZone(p)).toEqual({ x0: 102, x1: 114, y0: 10, y1: 22 });
    expect(headZone(p)).toEqual({ x0: 96, x1: 110, y0: 40, y1: 54 });
    expect(touchZone(p)).toMatchObject({ x0: 104, x1: 110 });
    expect(slideZone(p)).toMatchObject({ x0: 100, x1: 116, y0: 10, y1: 18 });
    expect(bodyBox(p)).toEqual({ x0: 96, x1: 104, y0: 10, y1: 50 });
  });

  it('ballIn is a circle–rect overlap', () => {
    const r = { x0: 0, x1: 10, y0: 0, y1: 10 };
    expect(ballIn(r, { x: 12, y: 5 }, 3)).toBe(true);
    expect(ballIn(r, { x: 14, y: 5 }, 3)).toBe(false);
    expect(ballIn(r, { x: 12, y: 12 }, 3)).toBe(true);
    expect(ballIn(r, { x: 13, y: 13 }, 3)).toBe(false);
  });
});
