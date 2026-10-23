import { describe, expect, it } from 'vitest';
import {
  FLASH_S,
  HIT_STOP_S,
  MOMENT_S,
  SHAKE_PX,
  SHAKE_S,
  SKIP_AFTER_S,
  bannerShown,
  celebrating,
  createGoalMoment,
  flashing,
  shakeOffset,
  simScale,
  stepGoalMoment,
  type GoalMoment,
} from './goalMoment';

const STEP = 1 / 60;
const at = (t: number): GoalMoment => ({ t, done: false });

describe('goal moment', () => {
  it('freezes, runs at quarter speed, then real speed, then freezes behind the celebration', () => {
    expect(simScale(at(0.05))).toBe(0);
    expect(simScale(at(0.5))).toBe(0.25);
    expect(simScale(at(1.3))).toBe(1);
    expect(simScale(at(2.0))).toBe(0);
  });

  it('shakes within SHAKE_PX in whole pixels, settling to nothing', () => {
    for (let t = 0; t < HIT_STOP_S + SHAKE_S; t += STEP) {
      const { dx, dy } = shakeOffset(at(t));
      expect(Math.abs(dx)).toBeLessThanOrEqual(SHAKE_PX);
      expect(Math.abs(dy)).toBeLessThanOrEqual(SHAKE_PX);
      expect(Number.isInteger(dx) && Number.isInteger(dy)).toBe(true);
    }
    for (const t of [HIT_STOP_S + SHAKE_S, 2, 3]) expect(shakeOffset(at(t))).toEqual({ dx: 0, dy: 0 });
  });

  it('actually shakes just after the hit-stop', () => {
    const moved = [0, 1, 2, 3, 4].some(i => {
      const { dx, dy } = shakeOffset(at(HIT_STOP_S + i * STEP));
      return dx !== 0 || dy !== 0;
    });
    expect(moved).toBe(true);
  });

  it('flashes on the first tick only', () => {
    const gm = createGoalMoment();
    expect(flashing(gm)).toBe(true);
    stepGoalMoment(gm, STEP, false);
    expect(flashing(gm)).toBe(false);
    expect(FLASH_S).toBeCloseTo(STEP);
  });

  it('shows the banner, then celebrates', () => {
    expect(bannerShown(at(0.2))).toBe(false);
    expect(bannerShown(at(0.3))).toBe(true);
    expect(celebrating(at(1.5))).toBe(false);
    expect(celebrating(at(1.6))).toBe(true);
    expect(celebrating({ t: 2, done: true })).toBe(false);
  });

  it('ignores a skip before 0.5 s and takes one after it', () => {
    const gm = createGoalMoment();
    stepGoalMoment(gm, 0.3, true);
    expect(gm.done).toBe(false);
    stepGoalMoment(gm, SKIP_AFTER_S, true);
    expect(gm.done).toBe(true);
  });

  it('is done at 3.8 s without a skip', () => {
    const gm = createGoalMoment();
    for (let t = STEP; t < MOMENT_S - 1e-9; t += STEP) {
      stepGoalMoment(gm, STEP, false);
      expect(gm.done, `t ${t}`).toBe(false);
    }
    stepGoalMoment(gm, STEP, false);
    expect(gm.done).toBe(true);
  });
});
