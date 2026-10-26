import type { Action, InputFrame } from '../engine/input';

/** An input frame for scene tests: `pressed` actions are also held. */
export function frame(pressed: readonly Action[] = [], held: readonly Action[] = []): InputFrame {
  return { moveX: 0, moveY: 0, held: new Set([...pressed, ...held]), pressed: new Set(pressed), released: new Set(), typed: '' };
}
