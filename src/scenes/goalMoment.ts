/**
 * Harrison's goal moment, as a pure timeline in real seconds since the goal:
 * a hit-stop, slow motion, a shake that settles, GOAL!!!, then the
 * celebration. The simulation only ever sees it as a scaled dt.
 */
export const HIT_STOP_S = 0.1,
  SLOW_MO_END_S = 1.1,
  SLOW_MO_SCALE = 0.25,
  SHAKE_S = 0.8,
  SHAKE_PX = 4,
  FLASH_S = 1 / 60,
  BANNER_FROM_S = 0.3,
  CELEBRATE_FROM_S = 1.6,
  MOMENT_S = 3.8,
  SKIP_AFTER_S = 0.5;

/** Shake directions per frame: a fixed jitter, so it looks random but tests repeat. */
const SHAKE_PATTERN: readonly [number, number][] = [
  [1, -1],
  [-1, 1],
  [1, 1],
  [-1, -1],
  [0, 1],
  [1, 0],
];
const FRAME_S = 1 / 60;

export interface GoalMoment {
  t: number;
  done: boolean;
}

export function createGoalMoment(): GoalMoment {
  return { t: 0, done: false };
}

/** Advances by real dt. Done at MOMENT_S, or on a skip once SKIP_AFTER_S has passed. */
export function stepGoalMoment(gm: GoalMoment, dt: number, skip: boolean): void {
  gm.t += dt;
  if (gm.t >= MOMENT_S - 1e-9 || (skip && gm.t >= SKIP_AFTER_S)) gm.done = true;
}

/** How fast the match runs: frozen, then slow, then real speed, then frozen behind the celebration. */
export function simScale(gm: GoalMoment): number {
  if (gm.t < HIT_STOP_S) return 0;
  if (gm.t < SLOW_MO_END_S) return SLOW_MO_SCALE;
  if (gm.t < CELEBRATE_FROM_S) return 1;
  return 0;
}

/** The pitch's shake in whole pixels: SHAKE_PX falling linearly to nothing over SHAKE_S after the hit-stop. */
export function shakeOffset(gm: GoalMoment): { dx: number; dy: number } {
  const s = gm.t - HIT_STOP_S;
  if (s < 0 || s >= SHAKE_S) return { dx: 0, dy: 0 };
  const amp = Math.round(SHAKE_PX * (1 - s / SHAKE_S));
  const [x, y] = SHAKE_PATTERN[Math.floor(s / FRAME_S) % SHAKE_PATTERN.length]!;
  return { dx: x * amp + 0, dy: y * amp + 0 };
}

/** One frame of white flash, never a strobe. */
export function flashing(gm: GoalMoment): boolean {
  return gm.t < FLASH_S - 1e-9;
}

export function bannerShown(gm: GoalMoment): boolean {
  return gm.t >= BANNER_FROM_S;
}

export function celebrating(gm: GoalMoment): boolean {
  return gm.t >= CELEBRATE_FROM_S && !gm.done;
}
