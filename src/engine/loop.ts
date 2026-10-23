/** Fixed simulation step: 60 Hz. */
export const STEP = 1 / 60;
/** Seconds of real time simulated per frame, at most, so a long stall can't spiral. */
export const MAX_FRAME = 0.25;
/** Float slack so an exact multiple of STEP never loses its last step to rounding. */
const STEP_EPSILON = 1e-9;

export interface FixedStepper {
  /** Feeds real elapsed time in; returns the number of fixed steps run. */
  advance(dtSeconds: number): number;
}

const clampFrame = (dt: number): number => Math.min(Math.max(dt, 0), MAX_FRAME);

export function createStepper(step: (dt: number) => void): FixedStepper {
  let carried = 0;
  return {
    advance(dtSeconds) {
      carried += clampFrame(dtSeconds);
      let steps = 0;
      while (carried >= STEP - STEP_EPSILON) {
        step(STEP);
        carried -= STEP;
        steps++;
      }
      carried = Math.max(carried, 0);
      return steps;
    },
  };
}

/**
 * Calls `frame` once per animation frame with the real time since the last
 * one. dt comes only from rAF timestamps (never mixed with performance.now)
 * and is clamped to [0, MAX_FRAME]. The next frame is scheduled before
 * `frame` runs, so an exception is reported and the game keeps going.
 * Returns stop().
 */
export function startLoop(frame: (dtSeconds: number) => void, onError: (e: unknown) => void): () => void {
  let last: number | null = null;
  let running = true;
  let id = 0;
  const tick = (now: number) => {
    if (!running) return;
    id = requestAnimationFrame(tick);
    const dt = last === null ? 0 : clampFrame((now - last) / 1000);
    last = now;
    try {
      frame(dt);
    } catch (e) {
      onError(e);
    }
  };
  id = requestAnimationFrame(tick);
  return () => {
    running = false;
    cancelAnimationFrame(id);
  };
}
