import type { CareerMatch } from '../meta/career';
import type { GameContext } from './context';
import { createMatchScene, newSeed } from './matchScene';
import type { Scene } from './scene';

/** The one way into a career match. For now, straight to the match; the VS card goes in front of it next. */
export function startMatch(ctx: GameContext, match: CareerMatch): Scene {
  return createMatchScene(ctx, newSeed(), match);
}
