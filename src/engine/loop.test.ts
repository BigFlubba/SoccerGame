import { describe, expect, it } from 'vitest';
import { MAX_FRAME, STEP, createStepper } from './loop';

describe('createStepper', () => {
  it('runs whole steps and carries the remainder', () => {
    let n = 0;
    const s = createStepper(() => n++);
    expect(s.advance(STEP * 2.5)).toBe(2);
    expect(s.advance(STEP * 0.6)).toBe(1); // 0.5 carried + 0.6 ≥ 1
  });

  it('clamps huge frame gaps so the game never spirals', () => {
    let n = 0;
    const s = createStepper(() => n++);
    s.advance(30); // laptop slept for 30 s
    expect(n).toBe(Math.floor(MAX_FRAME / STEP));
  });

  it('ignores negative frame times', () => {
    let n = 0;
    const s = createStepper(() => n++);
    expect(s.advance(-0.005)).toBe(0);
  });

  it('passes the fixed step to the simulation', () => {
    const dts: number[] = [];
    createStepper(dt => dts.push(dt)).advance(STEP * 2);
    expect(dts).toEqual([STEP, STEP]);
  });
});
