import { describe, expect, it } from 'vitest';
import { M } from '../colors';
import { backyardLayers, goalSprites } from './backyard';

describe('backyardLayers', () => {
  it('builds layers at the documented widths and full height', () => {
    const L = backyardLayers();
    expect([L.far.width, L.ground.width, L.ground.height]).toEqual([320, 640, 180]);
    expect(L.mid.width).toBeGreaterThanOrEqual(480);
    expect(L.near.width).toBeGreaterThanOrEqual(576);
  });

  it('ground layer is opaque grass from the ground line down', () => {
    const g = backyardLayers().ground;
    for (const x of [0, 200, 639]) expect([M.grass, M.grassLight, M.grassDark, M.wood]).toContain(g.get(x, 170));
  });

  it('the far layer is an opaque sky', () => {
    const far = backyardLayers().far;
    expect(far.data.every(v => v !== 0)).toBe(true);
  });

  it('the far layer tiles without a seam: even width, only the repeating sky bands at its edges', () => {
    const far = backyardLayers().far;
    expect(far.width % 2).toBe(0);
    for (let y = 0; y < far.height; y++) {
      expect(far.get(0, y), `row ${y}`).toBe(far.get(2, y));
      expect(far.get(far.width - 1, y), `row ${y}`).toBe(far.get(far.width - 3, y));
    }
  });

  it('only the ground layer covers the field below the ground line', () => {
    const { mid, near } = backyardLayers();
    expect(mid.get(100, 170)).toBe(0);
    expect(near.get(100, 170)).toBe(0);
  });
});

describe('goalSprites', () => {
  it('goal crossbar sits at height 28–30', () => {
    const { back } = goalSprites(); // sprite origin: bottom-left at world (12, 0); row = spriteHeight − 1 − height
    expect(back.get(8, back.height - 1 - 29)).toBe(M.white);
    expect(back.get(8, back.height - 1 - 28)).toBe(M.white);
    expect(back.get(8, back.height - 1 - 27)).not.toBe(M.white);
  });

  it('spans the goal from the net back to the goal line', () => {
    const { back, front } = goalSprites();
    expect(back.width).toBe(28 - 12 + 1);
    expect(back.get(0, back.height - 1)).toBe(M.white); // back post at x 12
    expect(front.get(16, front.height - 1)).toBe(M.white); // front post on the goal line
    expect(front.get(8, front.height - 1)).toBe(0);
  });

  it('has a net mesh inside the frame', () => {
    const { back } = goalSprites();
    const inside = [];
    for (let y = 2; y < back.height; y++) for (let x = 1; x < back.width - 1; x++) inside.push(back.get(x, y));
    expect(inside).toContain(M.silver);
    expect(inside).toContain(0);
  });
});
