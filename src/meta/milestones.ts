/** A career star total that pays coins once. */
export interface Milestone {
  index: number;
  stars: number;
  coins: number;
}

const TABLE: readonly [stars: number, coins: number][] = [
  [10, 300],
  [25, 600],
  [50, 1000],
  [75, 1500],
];

/** The spec's star milestones, in order. */
export const MILESTONES: readonly Milestone[] = TABLE.map(([stars, coins], index) => ({ index, stars, coins }));

/** Every milestone reached by `totalStars` with index >= `paid`, in order: what the next Results owes. */
export function milestonesDue(totalStars: number, paid: number): Milestone[] {
  return MILESTONES.filter(m => m.index >= paid && totalStars >= m.stars);
}
