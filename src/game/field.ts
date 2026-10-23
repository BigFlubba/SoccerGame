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

/** Which goal the ball is in: the whole ball past the line and under the bar. */
export function goalScored(field: Field, b: { x: number; y: number }): 'left' | 'right' | null {
  for (const g of field.goals) {
    const past = g.side === 'right' ? b.x - BALL_R >= g.lineX : b.x + BALL_R <= g.lineX;
    if (past && b.y + BALL_R <= g.barY) return g.side;
  }
  return null;
}
