import type { CareerMatch } from '../meta/career';
import type { GameContext } from './context';
import { createHubScene } from './hubScene';
import type { Scene } from './scene';
import { createVsScene } from './vsScene';

/** The one way into a career match: the VS card, then the match. B on the card goes back out. */
export function startMatch(ctx: GameContext, match: CareerMatch): Scene {
  return createVsScene(ctx, match, () => createHubScene(ctx));
}
