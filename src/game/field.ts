import { BALL_R } from '../art/ball';

export interface Goal {
  side: 'left' | 'right';
  /** The goal line. */
  lineX: number;
  /** The back of the net. */
  backX: number;
  /** Height of the crossbar's underside. */
  barY: number;
  barThick: number;
}

export interface Field {
  width: number;
  /** Inner faces of the end fences. */
  fenceL: number;
  fenceR: number;
  goals: readonly [Goal, Goal];
}

export const BACKYARD: Field = {
  width: 640,
  fenceL: 4,
  fenceR: 636,
  goals: [
    { side: 'left', lineX: 28, backX: 12, barY: 28, barThick: 2 },
    { side: 'right', lineX: 612, backX: 628, barY: 28, barThick: 2 },
  ],
};

/**
 * The x span of a goal's crossbar box. Its top (the net roof) runs on from
 * the bar to the end fence, so nothing can drop into the gap behind the net.
 */
export function roofSpan(field: Field, g: Goal): [x0: number, x1: number] {
  return g.side === 'right' ? [g.lineX, field.fenceR] : [field.fenceL, g.lineX];
}

/** Where players may stand: between the backs of the two nets. */
export function playerSpan(field: Field): [x0: number, x1: number] {
  const backs = field.goals.map(g => g.backX);
  return [Math.max(field.fenceL, Math.min(...backs)), Math.min(field.fenceR, Math.max(...backs))];
}

/** Which goal the ball is in: the whole ball past the line and under the bar. */
export function goalScored(field: Field, b: { x: number; y: number }): 'left' | 'right' | null {
  for (const g of field.goals) {
    const past = g.side === 'right' ? b.x - BALL_R >= g.lineX : b.x + BALL_R <= g.lineX;
    if (past && b.y + BALL_R <= g.barY) return g.side;
  }
  return null;
}
