import { describe, expect, it } from 'vitest';
import { M } from '../colors';
import { BISCUIT_ANCHOR, BISCUIT_FACE, BISCUIT_FPS, BISCUIT_FRAMES, MUZZLE, type DogAnim } from './biscuit';

const COUNTS: Record<DogAnim, number> = { idle: 2, run: 4, carry: 4, grab: 2, jink: 2, pant: 2, blown: 2, brace: 1, tilt: 2, tumble: 5 };

describe("Biscuit's frames", () => {
  it('has every clip at its frame count, all one size, with the anchor inside', () => {
    const [w, h] = [BISCUIT_FRAMES.idle[0]!.width, BISCUIT_FRAMES.idle[0]!.height];
    for (const [name, n] of Object.entries(COUNTS) as [DogAnim, number][]) {
      expect(BISCUIT_FRAMES[name], name).toHaveLength(n);
      for (const f of BISCUIT_FRAMES[name]) expect([f.width, f.height], name).toEqual([w, h]);
      expect(BISCUIT_FPS[name]).toBeGreaterThan(0);
    }
    expect(BISCUIT_ANCHOR.x).toBeGreaterThanOrEqual(0);
    expect(BISCUIT_ANCHOR.x).toBeLessThan(w);
    expect(BISCUIT_ANCHOR.y).toBeLessThan(h);
  });
  it('uses only master colours and is outlined', () => {
    const ids = new Set(Object.values(M));
    for (const frames of Object.values(BISCUIT_FRAMES)) for (const f of frames) {
      let outline = 0;
      f.data.forEach(id => { if (id !== 0) expect(ids.has(id)).toBe(true); if (id === M.outline) outline++; });
      expect(outline).toBeGreaterThan(20);
    }
  });
  it('the carry frames hold a ball at the muzzle, the run frames do not', () => {
    const at = (f: { get(x: number, y: number): number }) => f.get(BISCUIT_ANCHOR.x + MUZZLE.x, BISCUIT_ANCHOR.y + MUZZLE.y);
    for (const f of BISCUIT_FRAMES.carry) expect(at(f)).not.toBe(0);
    for (const f of BISCUIT_FRAMES.run) expect(at(f)).toBe(0);
  });
  it('the face is 12×12', () => {
    expect([BISCUIT_FACE.width, BISCUIT_FACE.height]).toEqual([12, 12]);
  });
});
